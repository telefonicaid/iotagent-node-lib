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
        subservice: 'gardens',
    },
    deviceUpdated = {
        id: 'light1',
        type: 'Light',
        name: 'light1',
        service: 'smartGondor',
        subservice: 'gardens',
        internalId: 'newInternalId',
        lazy: [
            {
                name: 'pressure',
                type: 'Hgmm'
            }
        ],
        active: [
            {
                name: 'temperature',
                type: 'centigrades'
            }
        ]
    },
    deviceCommandUpdated = {
        id: 'light1',
        type: 'Light',
        name: 'light1',
        service: 'smartGondor',
        subservice: 'gardens',
        internalId: 'newInternalId',
        commands: [
            {
                name: 'move',
                type: 'command'
            }
        ],
        active: [
            {
                name: 'temperature',
                type: 'centigrades'
            }
        ]
    },
    unknownDevice = {
        id: 'rotationSensor4',
        type: 'Rotation',
        name: 'Rotation4',
        service: 'dumbMordor',
        subservice: 'gardens',
        internalId: 'unknownInternalId',

        lazy: [],
        active: []
    };

describe('IoT Agent Device Update Registration', function() {
    beforeEach(function(done) {
        logger.setLevel('FATAL');

        nock.cleanAll();

        contextBrokerMock = nock('http://192.168.1.1:1026')
            .matchHeader('fiware-service', 'smartGondor')
            .matchHeader('fiware-servicepath', 'gardens')
            .post('/NGSI9/registerContext')
            .reply(200, utils.readExampleFile(
                './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

        contextBrokerMock
            .matchHeader('fiware-service', 'smartGondor')
            .matchHeader('fiware-servicepath', 'gardens')
            .post('/v1/updateContext')
            .reply(200, utils.readExampleFile(
                './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

        iotAgentLib.activate(iotAgentConfig, function(error) {
            iotAgentLib.register(device1, function(error) {
                done();
            });
        });
    });

    afterEach(function(done) {
        nock.cleanAll();
        iotAgentLib.clearAll(function() {
            iotAgentLib.deactivate(done);
        });
    });

    describe('When a device is preregistered and its registration information updated', function() {
        beforeEach(function() {
            contextBrokerMock
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/updateIoTAgent1.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/updateIoTAgent1Success.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext', utils.readExampleFile(
                    './test/unit/examples/contextRequests/updateProvisionActiveAttributes1.json'))
                .reply(200,
                    utils.readExampleFile(
                        './test/unit/examples/contextResponses/updateProvisionActiveAttributes1Success.json'));
        });

        it('should register as ContextProvider of its lazy attributes', function(done) {
            iotAgentLib.updateRegister(deviceUpdated, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
        it('should store the new values in the registry', function(done) {
            iotAgentLib.updateRegister(deviceUpdated, function(error, data) {
                iotAgentLib.getDevice(deviceUpdated.id, 'smartGondor', 'gardens', function(error, deviceResult) {
                    should.not.exist(error);
                    should.exist(deviceResult);
                    deviceResult.internalId.should.equal(deviceUpdated.internalId);
                    deviceResult.lazy[0].name.should.equal('pressure');
                    deviceResult.active[0].name.should.equal('temperature');
                    done();
                });
            });
        });
    });

    describe('When a device is preregistered and it is updated with new commands', function() {
        beforeEach(function() {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext', utils.readExampleFile(
                    './test/unit/examples/contextRequests/updateProvisionCommands1.json'))
                .reply(200,
                    utils.readExampleFile(
                        './test/unit/examples/contextResponses/updateProvisionCommands1Success.json'));

            contextBrokerMock
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/updateCommands1.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/updateCommands1Success.json'));
        });

        it('should register as ContextProvider of its commands and create the additional attributes', function(done) {
            iotAgentLib.updateRegister(deviceCommandUpdated, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
        it('should store the new values in the registry', function(done) {
            iotAgentLib.updateRegister(deviceCommandUpdated, function(error, data) {
                iotAgentLib.getDevice(deviceCommandUpdated.id, 'smartGondor', 'gardens', function(error, deviceResult) {
                    should.not.exist(error);
                    should.exist(deviceResult);
                    deviceResult.internalId.should.equal(deviceUpdated.internalId);
                    deviceResult.commands[0].name.should.equal('move');
                    deviceResult.active[0].name.should.equal('temperature');
                    done();
                });
            });
        });
    });

    describe('When a update action is executed in a non registered device', function() {
        beforeEach(function() {
            contextBrokerMock
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/updateIoTAgent1.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/updateIoTAgent1Success.json'));
        });

        it('should return a DEVICE_NOT_FOUND error', function(done) {
            iotAgentLib.updateRegister(unknownDevice, function(error) {
                should.exist(error);
                error.name.should.equal('DEVICE_NOT_FOUND');
                done();
            });
        });
    });
    describe('When a device register is updated in the Context Broker and the request fail to connect', function() {
        beforeEach(function() {
            contextBrokerMock
                .post('/NGSI9/registerContext',
                utils.readExampleFile('./test/unit/examples/contextAvailabilityRequests/updateIoTAgent1.json'))
                .reply(500, {});

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext')
                .reply(200,
                    utils.readExampleFile('./test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));
        });

        it('should return a REGISTRATION_ERROR error in the update action', function(done) {
            iotAgentLib.updateRegister(deviceUpdated, function(error) {
                should.exist(error);
                error.name.should.equal('REGISTRATION_ERROR');
                done();
            });
        });
    });
    describe('When a device register is updated in the Context Broker and the registration is not found', function() {
        it('should create the registration anew');
    });
});
