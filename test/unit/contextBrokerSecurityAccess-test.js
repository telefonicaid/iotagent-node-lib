/*
 * Copyright 2014 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of fiware-iotagent-lib
 *
 * fiware-iotagent-lib is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * fiware-iotagent-lib is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with fiware-iotagent-lib.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 */
'use strict';

var iotAgentLib = require('../../'),
    utils = require('../tools/utils'),
    should = require('should'),
    logger = require('fiware-node-logger'),
    nock = require('nock'),
    contextBrokerMock,
    keystoneMock,
    iotAgentConfig = {
        contextBroker: {
            host: '10.11.128.16',
            port: '1026'
        },
        server: {
            port: 4041
        },
        authentication: {
            host: '128.16.109.11',
            port: '5000',
            user: 'iotagent',
            password: 'iotagent',
            enabled: true
        },
        types: {
            'Light': {
                service: 'smartGondor',
                subservice: 'electricity',
                trust: 'BBBB987654321',
                commands: [],
                lazy: [
                    {
                        name: 'temperature',
                        type: 'centigrades'
                    }
                ],
                active: [
                    {
                        name: 'pressure',
                        type: 'Hgmm'
                    }
                ]
            },
            'Termometer': {
                commands: [],
                lazy: [
                    {
                        name: 'temp',
                        type: 'kelvin'
                    }
                ],
                active: [
                ]
            }
        },
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    };

describe('Secured access to the Context Broker', function() {
    var values = [
        {
            name: 'state',
            type: 'Boolean',
            value: 'true'
        },
        {
            name: 'dimming',
            type: 'Percentage',
            value: '87'
        }
    ];

    beforeEach(function() {
        logger.setLevel('FATAL');
    });

    afterEach(function(done) {
        iotAgentLib.deactivate(done);
        nock.cleanAll();
    });

    describe('When a measure is sent to the Context Broker via an Update Context operation', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            keystoneMock = nock('http://128.16.109.11:5000')
                .post('/v3/auth/tokens',
                utils.readExampleFile('./test/unit/keystoneRequests/getTokenFromTrust.json'))
                .reply(
                    201,
                    utils.readExampleFile('./test/unit/keystoneResponses/tokenFromTrust.json'),
                    {
                        'X-Subject-Token': '12345679ABCDEF'
                    });

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'electricity')
                .matchHeader('X-Auth-Token', '12345679ABCDEF')
                .post('/NGSI10/updateContext',
                    utils.readExampleFile('./test/unit/contextRequests/updateContext1.json'))
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/contextResponses/updateContext1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should ask Keystone for a token based on the trust token', function(done) {
            iotAgentLib.update('light1', 'Light', values, function(error) {
                should.not.exist(error);
                keystoneMock.done();
                done();
            });
        });
        it('should send the generated token in the x-auth header', function(done) {
            iotAgentLib.update('light1', 'Light', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
    describe('When a measure is sent to the Context Broker and the access is forbidden', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            keystoneMock = nock('http://128.16.109.11:5000')
                .post('/v3/auth/tokens',
                utils.readExampleFile('./test/unit/keystoneRequests/getTokenFromTrust.json'))
                .reply(
                201,
                utils.readExampleFile('./test/unit/keystoneResponses/tokenFromTrust.json'),
                {
                    'X-Subject-Token': '12345679ABCDEF'
                });

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'electricity')
                .matchHeader('X-Auth-Token', '12345679ABCDEF')
                .post('/NGSI10/updateContext',
                utils.readExampleFile('./test/unit/contextRequests/updateContext1.json'))
                .reply(
                403,
                utils.readExampleFile('./test/unit/contextResponses/updateContext1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('it should return a ACCESS_FORBIDDEN error to the caller', function(done) {
            iotAgentLib.update('light1', 'Light', values, function(error) {
                should.exist(error);
                error.name.should.equal('ACCESS_FORBIDDEN');
                done();
            });
        });
    });
    describe('When a measure is sent and the trust is rejected asking for the token', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            keystoneMock = nock('http://128.16.109.11:5000')
                .post('/v3/auth/tokens',
                utils.readExampleFile('./test/unit/keystoneRequests/getTokenFromTrust.json'))
                .reply(
                401,
                utils.readExampleFile('./test/unit/keystoneResponses/tokenFromTrustUnauthorized.json'));

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'electricity')
                .matchHeader('X-Auth-Token', '12345679ABCDEF')
                .post('/NGSI10/updateContext',
                utils.readExampleFile('./test/unit/contextRequests/updateContext1.json'))
                .reply(
                200,
                utils.readExampleFile('./test/unit/contextResponses/updateContext1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('it should return a AUTHENTICATION_ERROR error to the caller', function(done) {
            iotAgentLib.update('light1', 'Light', values, function(error) {
                should.exist(error);
                error.name.should.equal('AUTHENTICATION_ERROR');
                done();
            });
        });
    });
});
