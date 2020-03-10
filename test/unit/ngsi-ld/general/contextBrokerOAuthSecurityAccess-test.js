/*
 * Copyright 2020 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of fiware-iotagent-lib
 *
 * fiware-iotagent-lib is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * fiware-iotagent-lib is dvistributed in the hope that it will be useful,
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
 *
 * Modified by: Jason Fox - FIWARE Foundation
 */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const utils = require('../../../tools/utils');
const should = require('should');
const logger = require('logops');
const nock = require('nock');
const request = require('request');
const timekeeper = require('timekeeper');
let contextBrokerMock;
let oauth2Mock;
const iotAgentConfig = {
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'ld',
        jsonLdContext: 'http://context.json-ld'
    },
    server: {
        port: 4041
    },
    authentication: {
        type: 'oauth2',
        url: 'http://192.168.1.1:3000',
        header: 'Authorization',
        clientId: 'context-broker',
        clientSecret: 'c8d58d16-0a42-400e-9765-f32e154a5a9e',
        tokenPath: '/auth/realms/default/protocol/openid-connect/token',
        enabled: true
    },
    types: {
        Light: {
            service: 'smartGondor',
            subservice: 'electricity',
            trust: 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ3cHdWclJ3',
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
    service: 'smartGondor',
    subservice: 'gardens',
    providerUrl: 'http://smartGondor.com'
};

describe('NGSI-LD - Secured access to the Context Broker with OAuth2 provider', function() {
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

            oauth2Mock = nock('http://192.168.1.1:3000')
                .post(
                    '/auth/realms/default/protocol/openid-connect/token',
                    utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true)
                )
                .reply(201, utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrust.json'), {});

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('Authorization', 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ3cHdWclJ3')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/updateContext1.json')
                )
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should ask OAuth2 provider for a token based on the trust token', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                oauth2Mock.done();
                done();
            });
        });
        it('should send the generated token in the auth header', function(done) {
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

            oauth2Mock = nock('http://192.168.1.1:3000')
                .post(
                    '/auth/realms/default/protocol/openid-connect/token',
                    utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true)
                )
                .reply(201, utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrust.json'), {});

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('Authorization', 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ3cHdWclJ3')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/updateContext1.json')
                )
                .reply(403, {});

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

            oauth2Mock = nock('http://192.168.1.1:3000')
                .post(
                    '/auth/realms/default/protocol/openid-connect/token',
                    utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true)
                )
                .reply(
                    400,
                    utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustUnauthorized.json')
                );

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('Authorization', 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ3cHdWclJ3')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/updateContext1.json')
                )
                .reply(204);

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
        const attributes = ['state', 'dimming'];

        beforeEach(function(done) {
            nock.cleanAll();

            oauth2Mock = nock('http://192.168.1.1:3000')
                .post(
                    '/auth/realms/default/protocol/openid-connect/token',
                    utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true)
                )
                .reply(201, utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrust.json'), {});

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('Authorization', 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ3cHdWclJ3')
                .get('/ngsi-ld/v1/entities/urn:ngsi-ld:Light:light1?attrs=state,dimming')
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextResponses/queryContext1Success.json')
                );

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
    describe('When subscriptions are used on a protected Context Broker', function() {
        beforeEach(function(done) {
            const optionsProvision = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                json: utils.readExampleFile(
                    './test/unit/examples/deviceProvisioningRequests/provisionMinimumDevice3.json'
                ),
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': 'electricity',
                    'Content-Type': 'application/ld+json'
                }
            };

            nock.cleanAll();

            iotAgentLib.activate(iotAgentConfig, function() {
                oauth2Mock = nock('http://192.168.1.1:3000')
                    .post(
                        '/auth/realms/default/protocol/openid-connect/token',
                        utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true)
                    )
                    .times(3)
                    .reply(201, utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrust.json'), {});

                contextBrokerMock = nock('http://192.168.1.1:1026');

                contextBrokerMock
                    .post(
                        '/ngsi-ld/v1/csourceRegistrations/',
                        utils.readExampleFile(
                            './test/unit/ngsi-ld/examples/' +
                                'contextAvailabilityRequests/registerProvisionedDeviceWithGroup3.json'
                        )
                    )
                    .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations//6319a7f5254b05844116584d' });

                contextBrokerMock
                    .post(
                        '/ngsi-ld/v1/entityOperations/upsert/',
                        utils.readExampleFile(
                            './test/unit/ngsi-ld/examples/' +
                                'contextRequests/createProvisionedDeviceWithGroupAndStatic3.json'
                        )
                    )
                    .reply(204);

                contextBrokerMock
                    .post(
                        '/ngsi-ld/v1/subscriptions/',
                        utils.readExampleFile(
                            './test/unit/ngsi-ld/examples' + '/subscriptionRequests/simpleSubscriptionRequest2.json'
                        )
                    )
                    .matchHeader('Authorization', 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ3cHdWclJ3')
                    .reply(201, null, { Location: '/ngsi-ld/v1/subscriptions/51c0ac9ed714fb3b37d7d5a8' });

                iotAgentLib.clearAll(function() {
                    request(optionsProvision, function(error, result, body) {
                        done();
                    });
                });
            });
        });

        it('subscribe requests use auth header', function(done) {
            iotAgentLib.getDevice('Light1', 'smartGondor', 'electricity', function(error, device) {
                iotAgentLib.subscribe(device, ['dimming'], null, function(error) {
                    should.not.exist(error);

                    contextBrokerMock.done();

                    done();
                });
            });
        });

        it('unsubscribe requests use auth header', function(done) {
            oauth2Mock
                .post(
                    '/auth/realms/default/protocol/openid-connect/token',
                    utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true)
                )
                .reply(201, utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrust.json'), {});

            contextBrokerMock.delete('/ngsi-ld/v1/subscriptions/51c0ac9ed714fb3b37d7d5a8').reply(204);

            iotAgentLib.getDevice('Light1', 'smartGondor', 'electricity', function(error, device) {
                iotAgentLib.subscribe(device, ['dimming'], null, function(error) {
                    iotAgentLib.unsubscribe(device, '51c0ac9ed714fb3b37d7d5a8', function(error) {
                        contextBrokerMock.done();
                        done();
                    });
                });
            });
        });
    });
});

describe('NGSI-LD - Secured access to the Context Broker with OAuth2 provider (FIWARE Keyrock IDM)', function() {
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

            logger.setLevel('FATAL');
            oauth2Mock = nock('http://192.168.1.1:3000')
                .post(
                    '/oauth2/token',
                    utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true)
                )
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustKeyrock.json'),
                    {}
                );

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('Authorization', 'Bearer c1b752e377680acd1349a3ed59db855a1db07605')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/updateContext1.json')
                )
                .reply(204);

            iotAgentConfig.authentication.tokenPath = '/oauth2/token';
            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should ask OAuth2 provider for a token based on the trust token', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                oauth2Mock.done();
                done();
            });
        });
        it('should send the generated token in the auth header', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the user requests information about a device in a protected CB', function() {
        const attributes = ['state', 'dimming'];

        beforeEach(function(done) {
            nock.cleanAll();

            oauth2Mock = nock('http://192.168.1.1:3000')
                .post(
                    '/oauth2/token',
                    utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true)
                )
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustKeyrock.json'),
                    {}
                );

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('Authorization', 'Bearer c1b752e377680acd1349a3ed59db855a1db07605')
                .get('/ngsi-ld/v1/entities/urn:ngsi-ld:Light:light1?attrs=state,dimming')
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextResponses/queryContext1Success.json')
                );

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

    describe('When a measure is sent and the refresh token is not valid', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            oauth2Mock = nock('http://192.168.1.1:3000')
                .post(
                    '/oauth2/token',
                    utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true)
                )
                .reply(
                    400,
                    utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustUnauthorizedKeyrock.json')
                );

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

    describe('When a measure is sent to the Context Broker and the client credentials are invalid', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            oauth2Mock = nock('http://192.168.1.1:3000')
                .post(
                    '/oauth2/token',
                    utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true)
                )
                .reply(
                    400,
                    utils.readExampleFile(
                        './test/unit/examples/oauthResponses/' + 'tokenFromTrustInvalidCredentialsKeyrock.json'
                    ),
                    {}
                );

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

    describe('When a measure is sent to the Context Broker and the access is unauthorized', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            oauth2Mock = nock('http://192.168.1.1:3000')
                .post(
                    '/oauth2/token',
                    utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true)
                )
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustKeyrock.json'),
                    {}
                );

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('Authorization', 'Bearer c1b752e377680acd1349a3ed59db855a1db07605')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/updateContext1.json')
                )
                .reply(401, 'Auth-token not found in request header');

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
});

describe(
    'NGSI-LD - Secured access to the Context Broker with OAuth2 provider (FIWARE Keyrock IDM)' +
        'configured through group provisioning',
    function() {
        const groupCreation = {
            url: 'http://localhost:4041/iot/services',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/provisionFullGroup.json'),
            headers: {
                'fiware-service': 'TestService',
                'fiware-servicepath': '/testingPath'
            }
        };

        const values = [
            {
                name: 'status',
                type: 'String',
                value: 'STARTING'
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
            let oauth2Mock2;
            let contextBrokerMock2;
            beforeEach(function(done) {
                nock.cleanAll();
                oauth2Mock = nock('http://192.168.1.1:3000')
                    .post(
                        '/oauth2/token',
                        utils.readExampleFile(
                            './test/unit/examples/oauthRequests/getTokenFromTrustKeyrockGroup.json',
                            true
                        )
                    )
                    .reply(
                        200,
                        utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustKeyrock.json'),
                        {}
                    );

                oauth2Mock2 = nock('http://192.168.1.1:3000')
                    .post(
                        '/oauth2/token',
                        utils.readExampleFile(
                            './test/unit/examples/oauthRequests/getTokenFromTrustKeyrockGroup2.json',
                            true
                        )
                    )
                    .reply(
                        200,
                        utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustKeyrock2.json'),
                        {}
                    );

                contextBrokerMock = nock('http://unexistentHost:1026')
                    .matchHeader('fiware-service', 'TestService')
                    .matchHeader('Authorization', 'Bearer c1b752e377680acd1349a3ed59db855a1db07605')
                    .post(
                        '/ngsi-ld/v1/entityOperations/upsert/',
                        utils.readExampleFile(
                            './test/unit/ngsi-ld/examples/contextRequests/updateContext3WithStatic.json'
                        )
                    )
                    .reply(204);

                contextBrokerMock2 = nock('http://unexistentHost:1026')
                    .matchHeader('fiware-service', 'TestService')
                    .matchHeader('Authorization', 'Bearer bbb752e377680acd1349a3ed59db855a1db076aa')
                    .post(
                        '/ngsi-ld/v1/entityOperations/upsert/',
                        utils.readExampleFile(
                            './test/unit/ngsi-ld/examples/contextRequests/updateContext3WithStatic.json'
                        )
                    )
                    .reply(204);

                iotAgentConfig.authentication.tokenPath = '/oauth2/token';
                iotAgentLib.activate(iotAgentConfig, function() {
                    request(groupCreation, function(error, response, body) {
                        done();
                    });
                });
            });
            it(
                'should ask OAuth2 provider for a token based on the' +
                    'trust token and send the generated token in the auth header',
                function(done) {
                    iotAgentLib.update('machine1', 'SensorMachine', '', values, function(error) {
                        should.not.exist(error);
                        oauth2Mock.done();
                        contextBrokerMock.done();
                        done();
                    });
                }
            );

            it('should use the updated trust token in the following requests', function(done) {
                iotAgentLib.update('machine1', 'SensorMachine', '', values, function(error) {
                    should.not.exist(error);
                    oauth2Mock2.done();
                    contextBrokerMock2.done();
                    done();
                });
            });
        });

        describe('When a device is provisioned for a configuration contains an OAuth2 trust token', function() {
            const values = [
                {
                    name: 'status',
                    type: 'String',
                    value: 'STARTING'
                }
            ];
            const deviceCreation = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice2.json'),
                headers: {
                    'fiware-service': 'TestService',
                    'fiware-servicepath': '/testingPath'
                }
            };
            let contextBrokerMock2;
            let contextBrokerMock3;
            beforeEach(function(done) {
                logger.setLevel('FATAL');

                const time = new Date(1438760101468); // 2015-08-05T07:35:01.468+00:00
                timekeeper.freeze(time);
                nock.cleanAll();

                oauth2Mock = nock('http://192.168.1.1:3000')
                    .post(
                        '/oauth2/token',
                        utils.readExampleFile(
                            './test/unit/examples/oauthRequests/getTokenFromTrustKeyrockGroup3.json',
                            true
                        )
                    )
                    .reply(
                        200,
                        utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustKeyrock3.json'),
                        {}
                    )
                    .post(
                        '/oauth2/token',
                        utils.readExampleFile(
                            './test/unit/examples/oauthRequests/getTokenFromTrustKeyrockGroup4.json',
                            true
                        )
                    )
                    .reply(
                        200,
                        utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustKeyrock4.json'),
                        {}
                    )
                    .post(
                        '/oauth2/token',
                        utils.readExampleFile(
                            './test/unit/examples/oauthRequests/getTokenFromTrustKeyrockGroup5.json',
                            true
                        )
                    )
                    .reply(
                        200,
                        utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustKeyrock5.json'),
                        {}
                    );

                contextBrokerMock = nock('http://unexistenthost:1026')
                    .matchHeader('fiware-service', 'TestService')
                    .matchHeader('Authorization', 'Bearer asd752e377680acd1349a3ed59db855a1db07ere')
                    .post(
                        '/ngsi-ld/v1/csourceRegistrations/',
                        utils.readExampleFile(
                            './test/unit/ngsi-ld/examples/' +
                                'contextAvailabilityRequests/registerProvisionedDeviceWithGroup2.json'
                        )
                    )
                    .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

                contextBrokerMock2 = nock('http://unexistenthost:1026')
                    .matchHeader('fiware-service', 'TestService')
                    .matchHeader('authorization', 'Bearer bea752e377680acd1349a3ed59db855a1db07zxc')
                    .post(
                        '/ngsi-ld/v1/entityOperations/upsert/',
                        utils.readExampleFile(
                            './test/unit/ngsi-ld/examples/' +
                                'contextRequests/createProvisionedDeviceWithGroupAndStatic2.json'
                        )
                    )
                    .reply(204);

                contextBrokerMock3 = nock('http://unexistentHost:1026')
                    .matchHeader('fiware-service', 'TestService')
                    .matchHeader('authorization', 'Bearer zzz752e377680acd1349a3ed59db855a1db07bbb')
                    .post(
                        '/ngsi-ld/v1/entityOperations/upsert/',
                        utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/updateContext5.json')
                    )
                    .reply(204);

                iotAgentConfig.authentication.tokenPath = '/oauth2/token';
                iotAgentLib.activate(iotAgentConfig, function() {
                    done();
                });
            });

            afterEach(function(done) {
                timekeeper.reset();

                done();
            });

            it('should not raise any error', function(done) {
                request(deviceCreation, function(error, response, body) {
                    should.not.exist(error);
                    response.statusCode.should.equal(201);
                    contextBrokerMock.done();
                    contextBrokerMock2.done();
                    done();
                });
            });

            it('should send the mixed data to the Context Broker', function(done) {
                iotAgentLib.update('Light1', 'SensorMachine', '', values, function(error) {
                    should.not.exist(error);
                    contextBrokerMock3.done();
                    done();
                });
            });
        });
    }
);

describe(
    'NGSI-LD - Secured access to the Context Broker with OAuth2 provider (FIWARE Keyrock IDM)' +
        'configured through group provisioning. Permanent token',
    function() {
        const groupCreation = {
            url: 'http://localhost:4041/iot/services',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/provisionFullGroup.json'),
            headers: {
                'fiware-service': 'TestService',
                'fiware-servicepath': '/testingPath'
            }
        };

        const values = [
            {
                name: 'status',
                type: 'String',
                value: 'STARTING'
            }
        ];

        beforeEach(function() {
            logger.setLevel('FATAL');
            iotAgentConfig.authentication.permanentToken = true;
        });

        afterEach(function(done) {
            iotAgentLib.deactivate(done);
            nock.cleanAll();
        });

        describe('When a measure is sent to the Context Broker via an Update Context operation', function() {
            beforeEach(function(done) {
                nock.cleanAll();

                contextBrokerMock = nock('http://unexistentHost:1026')
                    .matchHeader('fiware-service', 'TestService')
                    .matchHeader('Authorization', 'Bearer 999210dacf913772606c95dd0b895d5506cbc988')
                    .post(
                        '/ngsi-ld/v1/entityOperations/upsert/',
                        utils.readExampleFile(
                            './test/unit/ngsi-ld/examples/contextRequests/updateContext3WithStatic.json'
                        )
                    )
                    .reply(204);

                iotAgentConfig.authentication.tokenPath = '/oauth2/token';
                iotAgentLib.activate(iotAgentConfig, function() {
                    request(groupCreation, function(error, response, body) {
                        done();
                    });
                });
            });
            it('should send the permanent token in the auth header', function(done) {
                iotAgentLib.update('machine1', 'SensorMachine', '', values, function(error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });

            it('should use the permanent trust token in the following requests', function(done) {
                iotAgentLib.update('machine1', 'SensorMachine', '', values, function(error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        });
    }
);
