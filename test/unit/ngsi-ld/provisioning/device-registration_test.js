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

/* eslint-disable no-unused-vars */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const utils = require('../../../tools/utils');
const request = utils.request;
const should = require('should');
const logger = require('logops');
const nock = require('nock');
const async = require('async');
let contextBrokerMock;
const iotAgentConfig = {
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'ld',
        jsonLdContext: 'http://context.json-ld'
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
const device2 = {
    id: 'term2',
    type: 'Termometer',
    service: 'smartgondor',
    subservice: 'gardens'
};

describe('NGSI-LD - IoT Agent Device Registration', function () {
    beforeEach(function () {
        logger.setLevel('FATAL');
    });

    afterEach(function (done) {
        iotAgentLib.clearAll(function () {
            // We need to remove the registrationId so that the library does not consider next operatios as updates.
            delete device1.registrationId;
            delete device2.registrationId;
            iotAgentLib.deactivate(done);
        });
    });

    describe('When a new device is connected to the IoT Agent', function () {
        beforeEach(function (done) {
            nock.cleanAll();
            const nockBody = utils.readExampleFile(
                './test/unit/ngsi-ld/examples/contextAvailabilityRequests/registerIoTAgent1.json'
            );
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .post('/ngsi-ld/v1/csourceRegistrations/', nockBody)
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            iotAgentLib.activate(iotAgentConfig, function (error) {
                iotAgentLib.clearAll(done);
            });
        });

        it('should register as ContextProvider of its lazy attributes', function (done) {
            iotAgentLib.register(device1, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the Context Broker returns a NGSI error while registering a device', function () {
        beforeEach(function (done) {
            nock.cleanAll();

            const nockBody = utils.readExampleFile(
                './test/unit/ngsi-ld/examples/contextAvailabilityRequests/registerIoTAgent1.json'
            );
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .post('/ngsi-ld/v1/csourceRegistrations/', nockBody)
                .reply(404);

            iotAgentLib.activate(iotAgentConfig, function (error) {
                iotAgentLib.clearAll(done);
            });
        });

        it('should register as ContextProvider of its lazy attributes', function (done) {
            iotAgentLib.register(device1, function (error) {
                should.exist(error);
                error.name.should.equal('BAD_REQUEST');
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the Context Broker returns an HTTP transport error while registering a device', function () {
        beforeEach(function (done) {
            nock.cleanAll();
            const nockBody = utils.readExampleFile(
                './test/unit/ngsi-ld/examples/contextAvailabilityRequests/registerIoTAgent1.json'
            );
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .post('/ngsi-ld/v1/csourceRegistrations/', nockBody)
                .reply(500);

            iotAgentLib.activate(iotAgentConfig, function (error) {
                iotAgentLib.clearAll(done);
            });
        });

        it('should not register the device in the internal registry');
        it('should return a REGISTRATION_ERROR error to the caller', function (done) {
            iotAgentLib.register(device1, function (error) {
                should.exist(error);
                should.exist(error.name);
                error.name.should.equal('REGISTRATION_ERROR');

                done();
            });
        });
    });

    describe('When a device is requested to the library using its ID', function () {
        beforeEach(function (done) {
            nock.cleanAll();

            const nockBody = utils.readExampleFile(
                './test/unit/ngsi-ld/examples/contextAvailabilityRequests/registerIoTAgent1.json'
            );
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .post('/ngsi-ld/v1/csourceRegistrations/', nockBody)
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .post('/ngsi-ld/v1/entityOperations/upsert/')
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, function (error) {
                iotAgentLib.clearAll(done);
            });
        });

        it("should return all the device's information", function (done) {
            iotAgentLib.register(device1, function (error) {
                iotAgentLib.getDevice('light1', null, 'smartgondor', 'gardens', function (error, data) {
                    should.not.exist(error);
                    should.exist(data);
                    data.type.should.equal('Light');
                    data.name.should.equal('urn:ngsi-ld:Light:light1');
                    done();
                });
            });
        });
    });

    describe('When an unexistent device is requested to the library using its ID', function () {
        beforeEach(function (done) {
            nock.cleanAll();

            const nockBody = utils.readExampleFile(
                './test/unit/ngsi-ld/examples/contextAvailabilityRequests/registerIoTAgent1.json'
            );
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .post('/ngsi-ld/v1/csourceRegistrations/', nockBody)
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            iotAgentLib.activate(iotAgentConfig, function (error) {
                iotAgentLib.clearAll(done);
            });
        });

        it('should return a ENTITY_NOT_FOUND error', function (done) {
            iotAgentLib.register(device1, function (error) {
                iotAgentLib.getDevice('lightUnexistent', null, 'smartgondor', 'gardens', function (error, data) {
                    should.exist(error);
                    should.not.exist(data);
                    error.code.should.equal(404);
                    error.name.should.equal('DEVICE_NOT_FOUND');
                    done();
                });
            });
        });
    });

    describe('When a device is removed from the IoT Agent', function () {
        beforeEach(function (done) {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/ngsi-ld/v1/csourceRegistrations/')
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock.post('/ngsi-ld/v1/entityOperations/upsert/').reply(204);

            contextBrokerMock
                .post('/ngsi-ld/v1/csourceRegistrations/')
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock.post('/ngsi-ld/v1/entityOperations/upsert/').reply(204);

            contextBrokerMock
                .delete('/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d', '')
                .reply(204, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            iotAgentLib.activate(iotAgentConfig, function (error) {
                async.series(
                    [
                        async.apply(iotAgentLib.clearAll),
                        async.apply(iotAgentLib.register, device1),
                        async.apply(iotAgentLib.register, device2)
                    ],
                    done
                );
            });
        });
        // FIXME: disabled test by #1421
        // it('should update the devices information in Context Broker', function (done) {
        //     iotAgentLib.unregister(device1.id, null, 'smartgondor', 'gardens', function (error) {
        //         should.not.exist(error);
        //         contextBrokerMock.done();
        //         done();
        //     });
        // });
    });

    describe('When the Context Broker returns an error while unregistering a device', function () {
        beforeEach(function (done) {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/ngsi-ld/v1/csourceRegistrations/')
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock.post('/ngsi-ld/v1/entityOperations/upsert/').reply(204);

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/ngsi-ld/v1/csourceRegistrations/')
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/8254b65a7d11650f45844319' });

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock.post('/ngsi-ld/v1/entityOperations/upsert/').reply(204);

            contextBrokerMock.delete('/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d', '').reply(500);

            iotAgentLib.activate(iotAgentConfig, function (error) {
                async.series(
                    [
                        async.apply(iotAgentLib.clearAll),
                        async.apply(iotAgentLib.register, device1),
                        async.apply(iotAgentLib.register, device2)
                    ],
                    done
                );
            });
        });

        it('should not remove the device from the internal registry');
        it('should return a UNREGISTRATION_ERROR error to the caller', function (done) {
            iotAgentLib.unregister(device1.id, null, 'smartgondor', 'gardens', function (error) {
                should.exist(error);
                should.exist(error.name);
                error.name.should.equal('UNREGISTRATION_ERROR');

                done();
            });
        });
    });
});
