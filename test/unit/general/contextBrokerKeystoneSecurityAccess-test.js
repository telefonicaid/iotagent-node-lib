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
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 */

/* eslint-disable no-unused-vars */

const iotAgentLib = require('../../../lib/fiware-iotagent-lib');
const utils = require('../../tools/utils');
const request = utils.request;
const should = require('should');
const logger = require('logops');
const nock = require('nock');
let contextBrokerMock;
let keystoneMock;
const iotAgentConfig = {
    contextBroker: {
        host: '192.168.1.1',
        port: '1026'
    },
    server: {
        port: 4041,
        host: 'localhost'
    },
    authentication: {
        // Next line is syntactically correct from a configuration point of
        // view, but we comment it in order to ensure backward compability
        // type: keystone,
        host: '128.16.109.11',
        port: '5000',
        user: 'iotagent',
        password: 'iotagent',
        enabled: true
    },
    types: {
        Light: {
            service: 'smartgondor',
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
        Termometer: {
            commands: [],
            type: 'Termometer',
            lazy: [
                {
                    name: 'temp',
                    type: 'kelvin'
                }
            ],
            active: []
        }
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M',
    useCBflowControl: true
};

describe('NGSI-v2 - Secured access to the Context Broker with Keystone', function () {
    const values = [
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

    beforeEach(function () {
        logger.setLevel('FATAL');
    });

    afterEach(function (done) {
        iotAgentLib.deactivate(done);
        nock.cleanAll();
    });

    describe('When a measure is sent to the Context Broker via an Update Context operation', function () {
        beforeEach(function (done) {
            nock.cleanAll();

            keystoneMock = nock('http://128.16.109.11:5000')
                .post(
                    '/v3/auth/tokens',
                    utils.readExampleFile('./test/unit/examples/keystoneRequests/getTokenFromTrust.json')
                )
                .reply(201, utils.readExampleFile('./test/unit/examples/keystoneResponses/tokenFromTrust.json'), {
                    'X-Subject-Token': '12345679ABCDEF'
                });

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'electricity')
                .matchHeader('X-Auth-Token', '12345679ABCDEF')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(204);
            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should ask Keystone for a token based on the trust token', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                keystoneMock.done();
                done();
            });
        });
        it('should send the generated token in the x-auth header', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
    describe('When a measure is sent to the Context Broker and the access is forbidden', function () {
        beforeEach(function (done) {
            nock.cleanAll();

            keystoneMock = nock('http://128.16.109.11:5000')
                .post(
                    '/v3/auth/tokens',
                    utils.readExampleFile('./test/unit/examples/keystoneRequests/getTokenFromTrust.json')
                )
                .reply(201, utils.readExampleFile('./test/unit/examples/keystoneResponses/tokenFromTrust.json'), {
                    'X-Subject-Token': '12345679ABCDEF'
                });

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'electricity')
                .matchHeader('X-Auth-Token', '12345679ABCDEF')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(403, { name: 'ACCESS_FORBIDDEN' });

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('it should return a ACCESS_FORBIDDEN error to the caller', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.exist(error);
                error.name.should.equal('ACCESS_FORBIDDEN');
                done();
            });
        });
    });
    describe('When a measure is sent and the trust is rejected asking for the token', function () {
        beforeEach(function (done) {
            nock.cleanAll();

            keystoneMock = nock('http://128.16.109.11:5000')
                .post(
                    '/v3/auth/tokens',
                    utils.readExampleFile('./test/unit/examples/keystoneRequests/getTokenFromTrust.json')
                )
                .reply(
                    401,
                    utils.readExampleFile('./test/unit/examples/keystoneResponses/tokenFromTrustUnauthorized.json')
                );

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'electricity')
                .matchHeader('X-Auth-Token', '12345679ABCDEF')
                .post('/v2/entities?options=upsert,flowControl');

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('it should return a AUTHENTICATION_ERROR error to the caller', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.exist(error);
                error.name.should.equal('AUTHENTICATION_ERROR');
                done();
            });
        });
    });

    describe('When the user requests information about a device in a protected CB', function () {
        const attributes = ['state', 'dimming'];

        beforeEach(function (done) {
            nock.cleanAll();

            keystoneMock = nock('http://128.16.109.11:5000')
                .post(
                    '/v3/auth/tokens',
                    utils.readExampleFile('./test/unit/examples/keystoneRequests/getTokenFromTrust.json')
                )
                .reply(201, utils.readExampleFile('./test/unit/examples/keystoneResponses/tokenFromTrust.json'), {
                    'X-Subject-Token': '12345679ABCDEF'
                });

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'electricity')
                .matchHeader('X-Auth-Token', '12345679ABCDEF')
                .get('/v2/entities/light1/attrs')
                .query({ attrs: 'state,dimming', type: 'Light' })
                .reply(200, { state: 'good', dimming: '23' });

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should send the Auth Token along with the information query', function (done) {
            iotAgentLib.query('light1', 'Light', '', attributes, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When subscriptions are used on a protected Context Broker', function () {
        beforeEach(function (done) {
            const optionsProvision = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                json: utils.readExampleFile(
                    './test/unit/examples/deviceProvisioningRequests/provisionMinimumDevice3.json'
                ),
                headers: {
                    'fiware-service': 'smartgondor',
                    'fiware-servicepath': 'electricity'
                }
            };

            nock.cleanAll();

            iotAgentLib.activate(iotAgentConfig, function () {
                keystoneMock = nock('http://128.16.109.11:5000')
                    .post(
                        '/v3/auth/tokens',
                        utils.readExampleFile('./test/unit/examples/keystoneRequests/getTokenFromTrust.json')
                    )
                    .times(3)
                    .reply(201, utils.readExampleFile('./test/unit/examples/keystoneResponses/tokenFromTrust.json'), {
                        'X-Subject-Token': '12345679ABCDEF'
                    });

                contextBrokerMock = nock('http://192.168.1.1:1026');

                contextBrokerMock
                    .post('/v2/registrations')
                    .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

                contextBrokerMock
                    .post('/v2/subscriptions')
                    .matchHeader('X-Auth-Token', '12345679ABCDEF')
                    .reply(201, null, { Location: '/v2/subscriptions/51c0ac9ed714fb3b37d7d5a8' });

                iotAgentLib.clearAll(function () {
                    request(optionsProvision, function (error, result, body) {
                        done();
                    });
                });
            });
        });

        it('subscribe requests use auth header', function (done) {
            iotAgentLib.getDevice('Light1', null, 'smartgondor', 'electricity', function (error, device) {
                iotAgentLib.subscribe(device, ['dimming'], null, function (error) {
                    should.not.exist(error);

                    contextBrokerMock.done();

                    done();
                });
            });
        });

        it('unsubscribe requests use auth header', function (done) {
            keystoneMock
                .post(
                    '/v3/auth/tokens',
                    utils.readExampleFile('./test/unit/examples/keystoneRequests/getTokenFromTrust.json')
                )
                .reply(201, utils.readExampleFile('./test/unit/examples/keystoneResponses/tokenFromTrust.json'), {
                    'X-Subject-Token': '12345679ABCDEF'
                });

            iotAgentLib.getDevice('Light1', null, 'smartgondor', 'electricity', function (error, device) {
                iotAgentLib.subscribe(device, ['dimming'], null, function (error) {
                    iotAgentLib.unsubscribe(device, '51c0ac9ed714fb3b37d7d5a8', function (error) {
                        contextBrokerMock.done();
                        done();
                    });
                });
            });
        });
    });
});
