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
                json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionMinimumDevice3.json'),
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
                    .reply(
                        201,
                        utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrust.json'),
                        {});
                oauth2Mock
                    .post('/auth/realms/default/protocol/openid-connect/token',
                        utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true))
                    .reply(
                        201,
                        utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrust.json'),
                        {});
                oauth2Mock
                    .post('/auth/realms/default/protocol/openid-connect/token',
                        utils.readExampleFile('./test/unit/examples/oauthRequests/getTokenFromTrust.json', true))
                    .reply(
                        201,
                        utils.readExampleFile('./test/unit/examples/oauthResponses/tokenFromTrust.json'),
                        {});


                contextBrokerMock = nock('http://192.168.1.1:1026');

                contextBrokerMock
                    .matchHeader('fiware-service', 'smartGondor')
                    .matchHeader('fiware-servicepath', 'electricity')
                    .post('/v1/updateContext',
                    utils.readExampleFile('./test/unit/examples/contextRequests/updateContext4.json'))
                    .matchHeader('Authorization', 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ3cHdWclJ3')
                    .reply(
                    200,
                    utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'));

                contextBrokerMock
                    .post('/NGSI9/registerContext',
                    utils.readExampleFile('./test/unit/examples/contextAvailabilityRequests/registerNewDevice1.json'))
                    .matchHeader('Authorization', 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ3cHdWclJ3')
                    .reply(
                    200,
                    utils.readExampleFile('./test/unit/examples/contextAvailabilityResponses/registerNewDevice1Success.json'));

                contextBrokerMock
                    .post('/v1/subscribeContext',
                        utils.readExampleFile('./test/unit/examples/subscriptionRequests/simpleSubscriptionRequest1.json'))
                    .matchHeader('Authorization', 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ3cHdWclJ3')
                    .reply(200,
                        utils.readExampleFile('./test/unit/examples/subscriptionResponses/simpleSubscriptionSuccess.json'));
    
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
