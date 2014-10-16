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
    async = require('async'),
    request = require('request'),
    contextBrokerMock,
    iotAgentConfig = {
        contextBroker: {
            host: '10.11.128.16',
            port: '1026'
        },
        server: {
            port: 4041
        },
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com/garden',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    },
    device1 = {
        id: 'light1',
        type: 'Light',
        attributes: [
            {
                name: 'state',
                type: 'Boolean'
            },
            {
                name: 'dimming',
                type: 'Percentage'
            }
        ]
    },
    device2 = {
        id: 'term2',
        type: 'Termometer',
        attributes: [
            {
                name: 'temperature',
                type: 'Centigrades'
            }
        ]
    };

function mockSubscription1() {
    contextBrokerMock
        .matchHeader('fiware-service', 'smartGondor')
        .matchHeader('fiware-servicepath', 'gardens')
        .post('/NGSI10/subscribeContext',
            utils.readExampleFile('./test/unit/contextRequests/contextSubscriptionRequest.json'))
        .reply(200,
            utils.readExampleFile('./test/unit/contextResponses/contextSubscriptionRequestSuccess.json'));
}

function mockSubscription2() {
    contextBrokerMock
        .matchHeader('fiware-service', 'smartGondor')
        .matchHeader('fiware-servicepath', 'gardens')
        .post('/NGSI10/subscribeContext',
            utils.readExampleFile('./test/unit/contextRequests/contextSubscriptionRequest2.json'))
        .reply(200,
            utils.readExampleFile('./test/unit/contextResponses/contextSubscriptionRequest2Success.json'));
}

describe('IoT Agent NGSI Integration', function() {
    beforeEach(function() {
        logger.setLevel('FATAL');
    });

    afterEach(function(done) {
        iotAgentLib.deactivate(done);
    });

    describe('When an IoT Agent is started', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                    utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            done();
        });

        it('should register itself in the contextBroker, and save the returned ID', function(done) {
            iotAgentLib.activate(iotAgentConfig, function(error) {
                should.not.exist(error);
                iotAgentLib.getRegistrationId().should.equal('6319a7f5254b05844116584d');
                done();
            });
        });
    });

    describe('When a new device is connected to the IoT Agent', function() {
        beforeEach(function(done) {
            var expectedPayload1 = utils
                    .readExampleFile('./test/unit/contextAvailabilityRequests/registerNewDevice1.json');

            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                    utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            iotAgentLib.activate(iotAgentConfig, function(error) {
                expectedPayload1.registrationId = iotAgentLib.getRegistrationId();

                contextBrokerMock
                    .matchHeader('fiware-service', 'smartGondor')
                    .matchHeader('fiware-servicepath', 'gardens')
                    .post('/NGSI9/registerContext', expectedPayload1)
                    .reply(200, utils.readExampleFile(
                        './test/unit/contextAvailabilityResponses/registerNewDevice1Success.json'));

                mockSubscription1();

                done();
            });
        });

        it('should register the device context in the Context Broker, and subscribe to its "actions" attribute',
            function(done) {
                iotAgentLib.register(device1.id, device1.type, device1.attributes, function(error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
        });
    });

    describe('When a new device is connected to an IoT Agent with more devices', function() {
        beforeEach(function(done) {
            var expectedPayload1 = utils
                    .readExampleFile('./test/unit/contextAvailabilityRequests/registerNewDevice1.json'),
                expectedPayload2 = utils
                    .readExampleFile('./test/unit/contextAvailabilityRequests/registerNewDevice2.json');

            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                    utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            iotAgentLib.activate(iotAgentConfig, function(error) {
                expectedPayload1.registrationId = iotAgentLib.getRegistrationId();
                expectedPayload2.registrationId = iotAgentLib.getRegistrationId();

                contextBrokerMock
                    .post('/NGSI9/registerContext', expectedPayload1)
                    .reply(200, utils.readExampleFile(
                        './test/unit/contextAvailabilityResponses/registerNewDevice1Success.json'));

                contextBrokerMock
                    .post('/NGSI9/registerContext', expectedPayload2)
                    .reply(200, utils.readExampleFile(
                        './test/unit/contextAvailabilityResponses/registerNewDevice2Success.json'));

                mockSubscription1();
                mockSubscription2();

                iotAgentLib.register(device1.id, device1.type, device1.attributes, done);
            });
        });

        it('should update the IoT Agent registration with all the devices', function(done) {
            iotAgentLib.register(device2.id, device2.type, device2.attributes, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When a device is removed from the IoT Agent', function() {
        beforeEach(function(done) {
            var expectedPayload3 = utils
                    .readExampleFile('./test/unit/contextAvailabilityRequests/unregisterDevice1.json');

            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                    utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            iotAgentLib.activate(iotAgentConfig, function(error) {
                expectedPayload3.registrationId = iotAgentLib.getRegistrationId();

                contextBrokerMock
                    .post('/NGSI9/registerContext')
                    .reply(200, utils.readExampleFile(
                        './test/unit/contextAvailabilityResponses/registerNewDevice1Success.json'));

                contextBrokerMock
                    .post('/NGSI9/registerContext')
                    .reply(200, utils.readExampleFile(
                        './test/unit/contextAvailabilityResponses/registerNewDevice2Success.json'));

                mockSubscription1();
                mockSubscription2();

                contextBrokerMock
                    .post('/NGSI9/registerContext', expectedPayload3)
                    .reply(200, utils.readExampleFile(
                        './test/unit/contextAvailabilityResponses/unregisterDevice1Success.json'));

                async.series([
                    async.apply(iotAgentLib.register, device1.id, device1.type, device1.attributes),
                    async.apply(iotAgentLib.register, device2.id, device2.type, device2.attributes)
                ], done);
            });
        });

        it('should update the devices information in the Context Broker', function(done) {
            iotAgentLib.unregister(device2.id, device2.type, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
    describe('When the IoT Agent is deactivated', function() {
        it('should update the registration with expiration time 0s');
    });

    describe('When the IoT Agent receives new information from a device', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                    utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI10/updateContext',
                    utils.readExampleFile('./test/unit/contextRequests/updateContext1.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/contextResponses/updateContext1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should change the value of the corresponding attribute in the context broker', function(done) {
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

            iotAgentLib.update('light1', 'Light', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
    describe('When the IoT Agent receives an update on the device data', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/NGSI10/updateContext',
            method: 'POST',
            json: {
                contextElements: [
                    {
                        type: 'Light',
                        isPattern: 'false',
                        id: 'light1',
                        attributes: [
                            {
                                name: 'dimming',
                                type: 'Percentage',
                                value: 12
                            }
                        ]
                    }
                ],
                updateAction: 'APPEND'
            }
        };

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                    utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should call the device handler with the received data', function(done) {
            var expectedResponse = utils
                .readExampleFile('./test/unit/contextProviderResponses/updateInformationResponse.json');

            iotAgentLib.setDataUpdateHandler(function(id, type, attributes, callback) {
                id.should.equal(device1.id);
                type.should.equal(device1.type);
                attributes[0].value.should.equal(12);
                callback(null);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });

    describe('When a IoT Agent receives an update on multiple contexts', function() {
        it('should call the device handler for each of the contexts');
    });

    describe('When a context query arrives to the IoT Agent', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/NGSI10/queryContext',
            method: 'POST',
            json: {
                    entities: [
                        {
                            type: 'Light',
                            isPattern: 'false',
                            id: 'light1'
                        }
                    ],
                    attributes: [
                        'dimming'
                    ]
                }
            },
            sensorData = [
                {
                    id: 'light1',
                    type: 'Light',
                    attributes: [
                        {
                            name: 'dimming',
                            type: 'Percentage',
                            value: 19
                        }
                    ]
                }
            ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                    utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should return the information querying the underlying devices', function(done) {
            var expectedResponse = utils
                .readExampleFile('./test/unit/contextProviderResponses/queryInformationResponse.json');

            iotAgentLib.setDataQueryHandler(function(id, type, attributes, callback) {
                id.should.equal(device1.id);
                type.should.equal(device1.type);
                attributes[0].should.equal('dimming');
                callback(null, sensorData);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });
});
