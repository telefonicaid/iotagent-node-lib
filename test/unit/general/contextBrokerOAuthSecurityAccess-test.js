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
 *
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */
'use strict';

var iotAgentLib = require('../../../lib/fiware-iotagent-lib'),
    utils = require('../../tools/utils'),
    should = require('should'),
    logger = require('logops'),
    nock = require('nock'),
    request = require('request'),
    contextBrokerMock,
    oauth2Mock,
    iotAgentConfig = {
        contextBroker: {
            host: '192.168.1.1',
            port: '1026'
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
            'Light': {
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

describe('Secured access to the Context Broker with OAuth2 provider', function() {
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

            oauth2Mock = nock('http://192.168.1.1:3000')
                .post('/auth/realms/default/protocol/openid-connect/token',
                utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true))
                .reply(
                    201,
                    utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrust.json'),
                    {});

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'electricity')
                .matchHeader('Authorization', 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ3cHdWclJ3')
                .post('/v1/updateContext',
                    utils.readExampleFile('./test/unit/examples/contextRequests/updateContext1.json'))
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'));

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
                .post('/auth/realms/default/protocol/openid-connect/token',
                utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true))
                .reply(
                201,
                utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrust.json'),
                {});

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'electricity')
                .matchHeader('Authorization', 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ3cHdWclJ3')
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

              oauth2Mock = nock('http://192.168.1.1:3000')
                .post('/auth/realms/default/protocol/openid-connect/token',
                utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true))
                .reply(
                400,
                utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustUnauthorized.json'));

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'electricity')
                .matchHeader('Authorization', 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ3cHdWclJ3')
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

            oauth2Mock = nock('http://192.168.1.1:3000')
                .post('/auth/realms/default/protocol/openid-connect/token',
                utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true))
                .reply(
                201,
                utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrust.json'),
                {});

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'electricity')
                .matchHeader('Authorization', 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ3cHdWclJ3')
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

    describe('When subscriptions are used on a protected Context Broker', function() {
          beforeEach(function(done) {

            var optionsProvision = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                json: utils.readExampleFile(
                    './test/unit/examples/deviceProvisioningRequests/provisionMinimumDevice3.json'),
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': 'electricity'
                }
            };
    
            nock.cleanAll();
    
            iotAgentLib.activate(iotAgentConfig, function() {
                oauth2Mock = nock('http://192.168.1.1:3000')
                    .post('/auth/realms/default/protocol/openid-connect/token',
                        utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true))
                    .times(3)
                    .reply(
                        201,
                        utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrust.json'),
                        {});


                contextBrokerMock = nock('http://192.168.1.1:1026');

                contextBrokerMock
                    .matchHeader('fiware-service', 'smartGondor')
                    .matchHeader('fiware-servicepath', 'electricity')
                    .matchHeader('Authorization', 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ3cHdWclJ3')
                    .post('/v1/updateContext',
                    utils.readExampleFile('./test/unit/examples/contextRequests/updateContext5.json'))
                    .reply(
                    200,
                    utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'));

                contextBrokerMock
                    .post('/NGSI9/registerContext',
                    utils.readExampleFile(
                        './test/unit/examples/contextAvailabilityRequests/registerNewDevice1.json'))
                    .reply(
                    200,
                    utils.readExampleFile(
                        './test/unit/examples/contextAvailabilityResponses/registerNewDevice1Success.json'));

                contextBrokerMock
                    .post('/v1/subscribeContext',
                        utils.readExampleFile(
                            './test/unit/examples/subscriptionRequests/simpleSubscriptionRequest1.json'))
                    .matchHeader('Authorization', 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ3cHdWclJ3')
                    .reply(200,
                        utils.readExampleFile(
                            './test/unit/examples/subscriptionResponses/simpleSubscriptionSuccess.json'));
    
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
              .post('/auth/realms/default/protocol/openid-connect/token',
                  utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true))
              .reply(
                  201,
                  utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrust.json'),
                  {});

          contextBrokerMock = nock('http://192.168.1.1:1026')
              .post('/v1/unsubscribeContext',
                  utils.readExampleFile('./test/unit/examples/subscriptionRequests/simpleSubscriptionRemove.json'))
              .matchHeader('Authorization', 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ3cHdWclJ3')
              .reply(200,
                  utils.readExampleFile('./test/unit/examples/subscriptionResponses/simpleSubscriptionSuccess.json'));

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

describe('Secured access to the Context Broker with OAuth2 provider (FIWARE Keyrock IDM)', function() {

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

            oauth2Mock = nock('http://192.168.1.1:3000')
                .post('/oauth2/token',
                utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true))
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustKeyrock.json'),
                    {});

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'electricity')
                .matchHeader('Authorization', 'Bearer c1b752e377680acd1349a3ed59db855a1db07605')
                .post('/v1/updateContext',
                    utils.readExampleFile('./test/unit/examples/contextRequests/updateContext1.json'))
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'));

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
        var attributes = [
            'state',
            'dimming'
        ];

        beforeEach(function(done) {
            nock.cleanAll();

            oauth2Mock = nock('http://192.168.1.1:3000')
                .post('/oauth2/token',
                utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true))
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustKeyrock.json'),
                    {});

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'electricity')
                .matchHeader('Authorization', 'Bearer c1b752e377680acd1349a3ed59db855a1db07605')
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

    describe('When a measure is sent and the refresh token is not valid', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            oauth2Mock = nock('http://192.168.1.1:3000')
                .post('/oauth2/token',
                utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true))
                .reply(
                400,
                utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustUnauthorizedKeyrock.json'));

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
                .post('/oauth2/token',
                utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true))
                .reply(
                400,
                utils.readExampleFile('./test/unit/examples/oauthResponses/' +
                    'tokenFromTrustInvalidCredentialsKeyrock.json'), {});

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
                .post('/oauth2/token',
                utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true))
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustKeyrock.json'),
                    {});

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'electricity')
                .matchHeader('Authorization', 'Bearer c1b752e377680acd1349a3ed59db855a1db07605')
                .post('/v1/updateContext',
                utils.readExampleFile('./test/unit/examples/contextRequests/updateContext1.json'))
                .reply(
                401,
                'Auth-token not found in request header');

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

describe('Secured access to the Context Broker with OAuth2 provider (FIWARE Keyrock IDM)' +
    'configured through group provisioning', function() {
    var groupCreation = {
        url: 'http://localhost:4041/iot/services',
        method: 'POST',
        json: utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/provisionFullGroup.json'),
        headers: {
            'fiware-service': 'TestService',
            'fiware-servicepath': '/testingPath'
        }
    };

    var values = [
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
        var oauth2Mock2;
        var contextBrokerMock2;
        beforeEach(function(done) {
            nock.cleanAll();
            oauth2Mock = nock('http://192.168.1.1:3000')
                .post('/oauth2/token',
                utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrustKeyrockGroup.json', true))
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustKeyrock.json'),
                    {});

            oauth2Mock2 = nock('http://192.168.1.1:3000')
                .post('/oauth2/token',
                utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrustKeyrockGroup2.json', true))
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustKeyrock2.json'),
                    {});

            contextBrokerMock = nock('http://unexistentHost:1026')
                .matchHeader('fiware-service', 'TestService')
                .matchHeader('fiware-servicepath', '/testingPath')
                .matchHeader('Authorization', 'Bearer c1b752e377680acd1349a3ed59db855a1db07605')
                .post('/v1/updateContext',
                    utils.readExampleFile('./test/unit/examples/contextRequests/updateContext3WithStatic.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'));

            contextBrokerMock2 = nock('http://unexistentHost:1026')
                .matchHeader('fiware-service', 'TestService')
                .matchHeader('fiware-servicepath', '/testingPath')
                .matchHeader('Authorization', 'Bearer bbb752e377680acd1349a3ed59db855a1db076aa')
                .post('/v1/updateContext',
                    utils.readExampleFile('./test/unit/examples/contextRequests/updateContext3WithStatic.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'));
            iotAgentConfig.authentication.tokenPath = '/oauth2/token';
            iotAgentLib.activate(iotAgentConfig, function() {
                request(groupCreation, function(error, response, body) {
                    done();
                });
            });
        });
        it('should ask OAuth2 provider for a token based on the' +
            'trust token and send the generated token in the auth header', function(done) {
            iotAgentLib.update('machine1', 'SensorMachine', '', values, function(error) {
                should.not.exist(error);
                oauth2Mock.done();
                contextBrokerMock.done();
                done();
            });
        });

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
        var values = [
            {
                name: 'status',
                type: 'String',
                value: 'STARTING'
            }
        ];
        var deviceCreation = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice2.json'),
            headers: {
                'fiware-service': 'TestService',
                'fiware-servicepath': '/testingPath'
            }
        };
        var contextBrokerMock2;
        var contextBrokerMock3;
        beforeEach(function(done) {
            nock.cleanAll();

            oauth2Mock = nock('http://192.168.1.1:3000')
                .post('/oauth2/token',
                utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrustKeyrockGroup3.json', true))
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustKeyrock3.json'),
                    {})
                .post('/oauth2/token',
                utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrustKeyrockGroup4.json', true))
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustKeyrock4.json'),
                    {})
                .post('/oauth2/token',
                utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrustKeyrockGroup5.json', true))
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrustKeyrock5.json'),
                    {});


            contextBrokerMock = nock('http://unexistenthost:1026')
                .matchHeader('fiware-service', 'TestService')
                .matchHeader('fiware-servicepath', '/testingPath')
                .matchHeader('Authorization', 'Bearer asd752e377680acd1349a3ed59db855a1db07ere')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerProvisionedDeviceWithGroup2.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            contextBrokerMock2 = nock('http://unexistenthost:1026')
                .matchHeader('fiware-service', 'TestService')
                .matchHeader('fiware-servicepath', '/testingPath')
                .matchHeader('authorization', 'Bearer bea752e377680acd1349a3ed59db855a1db07zxc')
                .post('/v1/updateContext', utils.readExampleFile(
                    './test/unit/examples/contextRequests/createProvisionedDeviceWithGroupAndStatic2.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            contextBrokerMock3 = nock('http://unexistentHost:1026')

                .matchHeader('fiware-service', 'TestService')
                .matchHeader('fiware-servicepath', '/testingPath')
                .matchHeader('authorization', 'Bearer zzz752e377680acd1349a3ed59db855a1db07bbb')
                .post('/v1/updateContext',
                    utils.readExampleFile('./test/unit/examples/contextRequests/updateContext4.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'));


            iotAgentConfig.authentication.tokenPath = '/oauth2/token';
            iotAgentLib.activate(iotAgentConfig, function() {
                done();
            });
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
});

describe('Secured access to the Context Broker with OAuth2 provider (FIWARE Keyrock IDM)' +
    'configured through group provisioning. Permanent token', function() {
    var groupCreation = {
        url: 'http://localhost:4041/iot/services',
        method: 'POST',
        json: utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/provisionFullGroup.json'),
        headers: {
            'fiware-service': 'TestService',
            'fiware-servicepath': '/testingPath'
        }
    };

    var values = [
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
                .matchHeader('fiware-servicepath', '/testingPath')
                .matchHeader('Authorization', 'Bearer 999210dacf913772606c95dd0b895d5506cbc988')
                .post('/v1/updateContext',
                    utils.readExampleFile('./test/unit/examples/contextRequests/updateContext3WithStatic.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'));


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
});

