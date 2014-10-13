'use strict';

var iotAgentLib = require('../../'),
    utils = require('../tools/utils'),
    should = require('should'),
    nock = require('nock'),
    contextBrokerMock,
    iotAgentConfig = {
        contextBroker: {
            host: '10.11.128.16',
            port: '1026'
        },
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com/garden',
        deviceRegistrationDuration: 'P1M'
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

describe('IoT Agent NGSI Integration', function() {
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
                    .post('/NGSI9/registerContext', expectedPayload1)
                    .reply(200, utils.readExampleFile(
                        './test/unit/contextAvailabilityResponses/registerNewDevice1Success.json'));

                done();
            });
        });

        it('should register the device context in the Context Broker', function(done) {
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
        it('should update the devices information in the Context Broker');
    });
    describe('When the IoT Agent receives new information from a device', function() {
        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI10/updateContext',
                    utils.readExampleFile('./test/unit/contextRequests/updateContext1.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/contextResponses/updateContext1Success.json'));
        });

        it('should change the value of the corresponding attribute in the context broker', function(done) {
            var values = [
                {
                    "name": "state",
                    "type": "Boolean",
                    "value": "true"
                },
                {
                    "name": "dimming",
                    "type": "Percentage",
                    "value": "87"
                }
            ];

            iotAgentLib.update('light1', 'Light', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done()
            });
        });
    });
    describe('When the IoT Agent receives an update on the device data', function() {
        it('should call the device handler with the received data');
    });
    describe('When a context query arrives to the IoT Agent', function() {
        it('should return the information querying the underlying devices');
    });
});
