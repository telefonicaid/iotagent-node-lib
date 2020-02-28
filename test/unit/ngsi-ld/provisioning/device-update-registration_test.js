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
 * Modified by: Jason Fox - FIWARE Foundation
 */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const utils = require('../../../tools/utils');
const should = require('should');
const logger = require('logops');
const nock = require('nock');
let contextBrokerMock;
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
    types: {
        Light: {
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
        Termometer: {
            commands: [],
            lazy: [
                {
                    name: 'temp',
                    type: 'kelvin'
                }
            ],
            active: [],
            service: 'smartGondor',
            subservice: 'gardens'
        }
    },
    service: 'smartGondor',
    subservice: 'gardens',
    providerUrl: 'http://smartGondor.com'
};
const device1 = {
    id: 'light1',
    type: 'Light',
    service: 'smartGondor',
    subservice: 'gardens'
};
const deviceUpdated = {
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
};
const deviceCommandUpdated = {
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
};
const unknownDevice = {
    id: 'rotationSensor4',
    type: 'Rotation',
    name: 'Rotation4',
    service: 'dumbMordor',
    subservice: 'gardens',
    internalId: 'unknownInternalId',

    lazy: [],
    active: []
};

describe('NGSI-LD - IoT Agent Device Update Registration', function() {
    beforeEach(function(done) {
        delete device1.registrationId;
        logger.setLevel('FATAL');

        nock.cleanAll();

        contextBrokerMock = nock('http://192.168.1.1:1026')
            .matchHeader('fiware-service', 'smartGondor')
            .post('/ngsi-ld/v1/csourceRegistrations/')
            .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

        // This mock does not check the payload since the aim of the test is not to verify
        // device provisioning functionality. Appropriate verification is done in tests under
        // provisioning folder
        contextBrokerMock
            .matchHeader('fiware-service', 'smartGondor')
            .post('/ngsi-ld/v1/entityOperations/upsert/')
            .reply(204);

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
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateProvisionActiveAttributes1.json'
                    )
                )
                .reply(204);

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/csourceRegistrations/',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples' + '/contextAvailabilityRequests/updateIoTAgent1.json'
                    )
                )
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });
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
            delete deviceCommandUpdated.registrationId;
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/updateProvisionCommands1.json')
                )
                .reply(204);

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/csourceRegistrations/',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples' + '/contextAvailabilityRequests/updateCommands1.json'
                    )
                )
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });
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
                .matchHeader('fiware-service', 'smartGondor')
                .post('/ngsi-ld/v1/entityOperations/upsert/')
                .reply(400);
        });

        it('should return a REGISTRATION_ERROR error in the update action', function(done) {
            iotAgentLib.updateRegister(deviceUpdated, function(error) {
                should.exist(error);
                //error.name.should.equal('UNREGISTRATION_ERROR');
                done();
            });
        });
    });
    describe('When a device register is updated in the Context Broker and the registration is not found', function() {
        it('should create the registration anew');
    });
});
