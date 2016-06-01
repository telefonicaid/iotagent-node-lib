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

var iotAgentLib = require('../../../lib/fiware-iotagent-lib'),
    utils = require('../../tools/utils'),
    should = require('should'),
    logger = require('logops'),
    nock = require('nock'),
    contextBrokerMock,
    keystoneMock,
    iotAgentConfig = {
        contextBroker: {
            host: '192.168.1.1',
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
                type: 'Light',
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
                type: 'Termometer',
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
                utils.readExampleFile('./test/unit/examples/keystoneRequests/getTokenFromTrust.json'))
                .reply(
                    201,
                    utils.readExampleFile('./test/unit/examples/keystoneResponses/tokenFromTrust.json'),
                    {
                        'X-Subject-Token': '12345679ABCDEF'
                    });

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'electricity')
                .matchHeader('X-Auth-Token', '12345679ABCDEF')
                .post('/v1/updateContext',
                    utils.readExampleFile('./test/unit/examples/contextRequests/updateContext1.json'))
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should ask Keystone for a token based on the trust token', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                keystoneMock.done();
                done();
            });
        });
        it('should send the generated token in the x-auth header', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
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
                utils.readExampleFile('./test/unit/examples/keystoneRequests/getTokenFromTrust.json'))
                .reply(
                201,
                utils.readExampleFile('./test/unit/examples/keystoneResponses/tokenFromTrust.json'),
                {
                    'X-Subject-Token': '12345679ABCDEF'
                });

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'electricity')
                .matchHeader('X-Auth-Token', '12345679ABCDEF')
                .post('/v1/updateContext',
                utils.readExampleFile('./test/unit/examples/contextRequests/updateContext1.json'))
                .reply(
                403,
                utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('it should return a ACCESS_FORBIDDEN error to the caller', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
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
                utils.readExampleFile('./test/unit/examples/keystoneRequests/getTokenFromTrust.json'))
                .reply(
                401,
                utils.readExampleFile('./test/unit/examples/keystoneResponses/tokenFromTrustUnauthorized.json'));

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'electricity')
                .matchHeader('X-Auth-Token', '12345679ABCDEF')
                .post('/v1/updateContext',
                utils.readExampleFile('./test/unit/examples/contextRequests/updateContext1.json'))
                .reply(
                200,
                utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('it should return a AUTHENTICATION_ERROR error to the caller', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.exist(error);
                error.name.should.equal('AUTHENTICATION_ERROR');
                done();
            });
        });
    });

    describe('When the user requests information about a device in a protected CB', function() {
        var attributes = [
            'state',
            'dimming'
        ];

        beforeEach(function(done) {
            nock.cleanAll();

            keystoneMock = nock('http://128.16.109.11:5000')
                .post('/v3/auth/tokens',
                utils.readExampleFile('./test/unit/examples/keystoneRequests/getTokenFromTrust.json'))
                .reply(
                201,
                utils.readExampleFile('./test/unit/examples/keystoneResponses/tokenFromTrust.json'),
                {
                    'X-Subject-Token': '12345679ABCDEF'
                });

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'electricity')
                .matchHeader('X-Auth-Token', '12345679ABCDEF')
                .post('/v1/queryContext',
                utils.readExampleFile('./test/unit/examples/contextRequests/queryContext1.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/examples/contextResponses/queryContext1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should send the Auth Token along with the information query', function(done) {
            iotAgentLib.query('light1', 'Light', '', attributes, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

});
