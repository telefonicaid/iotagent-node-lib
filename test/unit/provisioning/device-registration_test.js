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
    async = require('async'),
    contextBrokerMock,
    iotAgentConfig = {
        contextBroker: {
            host: '192.168.1.1',
            port: '1026'
        },
        server: {
            port: 4041
        },
        types: {
            'Light': {
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
                ],
                service: 'smartGondor',
                subservice: 'gardens'
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
                ],
                service: 'smartGondor',
                subservice: 'gardens'
            }
        },
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    },
    device1 = {
        id: 'light1',
        type: 'Light',
        service: 'smartGondor',
        subservice: 'gardens'
    },
    device2 = {
        id: 'term2',
        type: 'Termometer',
        service: 'smartGondor',
        subservice: 'gardens'
    };

describe('IoT Agent Device Registration', function() {
    beforeEach(function() {
        logger.setLevel('FATAL');
    });

    afterEach(function(done) {
        iotAgentLib.clearAll(function() {
            iotAgentLib.deactivate(done);
        });
    });

    describe('When a new device is connected to the IoT Agent', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            iotAgentLib.activate(iotAgentConfig, function(error) {
                iotAgentLib.clearAll(done);
            });
        });

        it('should register as ContextProvider of its lazy attributes', function(done) {
            iotAgentLib.register(device1, function(error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
            });
        });
    });

    describe('When the Context Broker returns a NGSI error while registering a device', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Failed.json'));

            iotAgentLib.activate(iotAgentConfig, function(error) {
                iotAgentLib.clearAll(done);
            });
        });

        it('should register as ContextProvider of its lazy attributes', function(done) {
            iotAgentLib.register(device1, function(error) {
                should.exist(error);
                error.name.should.equal('BAD_REQUEST');
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the Context Broker returns an HTTP transport error while registering a device', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(500, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Failed.json'));

            iotAgentLib.activate(iotAgentConfig, function(error) {
                iotAgentLib.clearAll(done);
            });
        });

        it('should not register the device in the internal registry');
        it('should return a REGISTRATION_ERROR error to the caller', function(done) {
            iotAgentLib.register(device1, function(error) {
                should.exist(error);
                should.exist(error.name);
                error.name.should.equal('REGISTRATION_ERROR');

                done();
            });
        });
    });

    describe('When a device is requested to the library using its ID', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            iotAgentLib.activate(iotAgentConfig, function(error) {
                iotAgentLib.clearAll(done);
            });
        });

        it('should return all the device\'s information', function(done) {
            iotAgentLib.register(device1, function(error) {
                iotAgentLib.getDevice('light1', 'smartGondor', 'gardens', function(error, data) {
                    should.not.exist(error);
                    should.exist(data);
                    data.type.should.equal('Light');
                    data.name.should.equal('Light:light1');
                    done();
                });
            });
        });
    });

    describe('When an unexistent device is requested to the library using its ID', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            iotAgentLib.activate(iotAgentConfig, function(error) {
                iotAgentLib.clearAll(done);
            });
        });

        it('should return a ENTITY_NOT_FOUND error', function(done) {
            iotAgentLib.register(device1, function(error) {
                iotAgentLib.getDevice('lightUnexistent', 'smartGondor', 'gardens', function(error, data) {
                    should.exist(error);
                    should.not.exist(data);
                    error.code.should.equal(404);
                    error.name.should.equal('DEVICE_NOT_FOUND');
                    done();
                });
            });
        });
    });

    describe('When a device is removed from the IoT Agent', function() {
        beforeEach(function(done) {
            var expectedPayload3 = utils
                    .readExampleFile('./test/unit/examples/contextAvailabilityRequests/unregisterDevice1.json');

            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/NGSI9/registerContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerNewDevice1Success.json'));

            contextBrokerMock
                .post('/v1/updateContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .post('/NGSI9/registerContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerNewDevice2Success.json'));

            contextBrokerMock
                .post('/v1/updateContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .post('/NGSI9/registerContext', expectedPayload3)
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/unregisterDevice1Success.json'));


            iotAgentLib.activate(iotAgentConfig, function(error) {
                async.series([
                    async.apply(iotAgentLib.clearAll),
                    async.apply(iotAgentLib.register, device1),
                    async.apply(iotAgentLib.register, device2)
                ], done);
            });
        });

        it('should update the devices information in Context Broker', function(done) {
            iotAgentLib.unregister(device1.id, 'smartGondor', 'gardens', function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the Context Broker returns an error while unregistering a device', function() {
        beforeEach(function(done) {
            var expectedPayload3 = utils
                .readExampleFile('./test/unit/examples/contextAvailabilityRequests/unregisterDevice1.json');

            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/NGSI9/registerContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerNewDevice1Success.json'));

            contextBrokerMock
                .post('/v1/updateContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .post('/NGSI9/registerContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerNewDevice2Success.json'));

            contextBrokerMock
                .post('/v1/updateContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .post('/NGSI9/registerContext', expectedPayload3)
                .reply(500, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/unregisterDevice1Failed.json'));

            iotAgentLib.activate(iotAgentConfig, function(error) {
                async.series([
                    async.apply(iotAgentLib.clearAll),
                    async.apply(iotAgentLib.register, device1),
                    async.apply(iotAgentLib.register, device2)
                ], done);
            });
        });

        it('should not remove the device from the internal registry');
        it('should return a UNREGISTRATION_ERROR error to the caller', function(done) {
            iotAgentLib.unregister(device1.id, 'smartGondor', 'gardens', function(error) {
                should.exist(error);
                should.exist(error.name);
                error.name.should.equal('UNREGISTRATION_ERROR');

                done();
            });
        });
    });
});
