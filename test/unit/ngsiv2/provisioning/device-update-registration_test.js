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

/* eslint-disable no-unused-vars */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const utils = require('../../../tools/utils');
const request = utils.request;
const should = require('should');
const logger = require('logops');
const nock = require('nock');
let contextBrokerMock;
const iotAgentConfig = {
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'v2'
    },
    server: {
        port: 4041,
        host: 'localhost'
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
            service: 'smartgondor',
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
            service: 'smartgondor',
            subservice: 'gardens'
        }
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com'
};
const device1 = {
    id: 'light1',
    type: 'Light',
    service: 'smartgondor',
    subservice: 'gardens'
};
const deviceUpdated = {
    id: 'light1',
    type: 'Light',
    name: 'Light:light1',
    service: 'smartgondor',
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
    name: 'Light:light1',
    service: 'smartgondor',
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

describe('NGSI-v2 - IoT Agent Device Update Registration', function () {
    beforeEach(function (done) {
        delete device1.registrationId;
        logger.setLevel('FATAL');

        nock.cleanAll();

        contextBrokerMock = nock('http://192.168.1.1:1026')
            .matchHeader('fiware-service', 'smartgondor')
            .matchHeader('fiware-servicepath', 'gardens')
            .post('/v2/registrations')
            .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

        iotAgentLib.activate(iotAgentConfig, function (error) {
            iotAgentLib.register(device1, function (error) {
                done();
            });
        });
    });

    afterEach(function (done) {
        nock.cleanAll();
        iotAgentLib.clearAll(function () {
            iotAgentLib.deactivate(done);
        });
    });

    describe('When a device is preregistered and its registration information updated', function () {
        beforeEach(function () {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities/Light:light1/attrs?type=Light',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateProvisionActiveAttributes1.json'
                    )
                )
                .reply(204);

            // FIXME: When https://github.com/telefonicaid/fiware-orion/issues/3007 is merged into master branch,
            // this function should use the new API. This is just a temporary solution which implies deleting the
            // registration and creating a new one.
            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .delete('/v2/registrations/6319a7f5254b05844116584d', '')
                .reply(204);

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/updateIoTAgent1.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });
        });

        it('should register as ContextProvider of its lazy attributes', function (done) {
            iotAgentLib.updateRegister(deviceUpdated, device1, false, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });

        it('should store the new values in the registry', function (done) {
            iotAgentLib.updateRegister(deviceUpdated, device1, false, function (error, data) {
                iotAgentLib.getDevice(deviceUpdated.id, null, 'smartgondor', 'gardens', function (error, deviceResult) {
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

    describe('When a device is preregistered and it is updated with new commands', function () {
        beforeEach(function () {
            delete deviceCommandUpdated.registrationId;
            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities/Light:light1/attrs?type=Light',
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextRequests/updateProvisionCommands1.json')
                )
                .reply(204);

            // FIXME: When https://github.com/telefonicaid/fiware-orion/issues/3007 is merged into master branch,
            // this function should use the new API. This is just a temporary solution which implies deleting the
            // registration and creating a new one.

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .delete('/v2/registrations/6319a7f5254b05844116584d', '')
                .reply(204);

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/updateCommands1.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });
        });

        it('should register as ContextProvider of its commands and create the additional attributes', function (done) {
            iotAgentLib.updateRegister(deviceCommandUpdated, device1, false, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });

        it('should store the new values in the registry', function (done) {
            iotAgentLib.updateRegister(deviceCommandUpdated, device1, false, function (error, data) {
                iotAgentLib.getDevice(
                    deviceCommandUpdated.id,
                    null,
                    'smartgondor',
                    'gardens',
                    function (error, deviceResult) {
                        should.not.exist(error);
                        should.exist(deviceResult);
                        deviceResult.internalId.should.equal(deviceUpdated.internalId);
                        deviceResult.commands[0].name.should.equal('move');
                        deviceResult.active[0].name.should.equal('temperature');
                        done();
                    }
                );
            });
        });
    });

    describe('When a update action is executed in a non registered device', function () {
        it('should return a DEVICE_NOT_FOUND error', function (done) {
            iotAgentLib.updateRegister(unknownDevice, device1, false, function (error) {
                should.exist(error);
                error.name.should.equal('DEVICE_NOT_FOUND');
                done();
            });
        });
    });
    describe('When a device register is updated in the Context Broker and the request fail to connect', function () {
        beforeEach(function () {
            // FIXME: When https://github.com/telefonicaid/fiware-orion/issues/3007 is merged into master branch,
            // this function should use the new API. This is just a temporary solution which implies deleting the
            // registration and creating a new one.
            contextBrokerMock.delete('/v2/registrations/6319a7f5254b05844116584d', '').reply(500, {});

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/Light:light1/attrs?type=Light')
                .reply(204);
        });

        it('should return a REGISTRATION_ERROR error in the update action', function (done) {
            iotAgentLib.updateRegister(deviceUpdated, device1, false, function (error) {
                should.exist(error);
                error.name.should.equal('UNREGISTRATION_ERROR');
                done();
            });
        });
    });
    describe('When a device register is updated in the Context Broker and the registration is not found', function () {
        it('should create the registration anew');
    });
});
