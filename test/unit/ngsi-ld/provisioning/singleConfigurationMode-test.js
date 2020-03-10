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

/* jshint camelcase: false */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const utils = require('../../../tools/utils');

const should = require('should');
const nock = require('nock');
let contextBrokerMock;
const request = require('request');
const iotAgentConfig = {
    logLevel: 'FATAL',
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'ld',
        jsonLdContext: 'http://context.json-ld'
    },
    server: {
        port: 4041,
        baseRoot: '/'
    },
    types: {},
    service: 'smartGondor',
    singleConfigurationMode: true,
    subservice: 'gardens',
    providerUrl: 'http://smartGondor.com'
};
const groupCreation = {
    url: 'http://localhost:4041/iot/services',
    method: 'POST',
    json: utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/provisionFullGroup.json'),
    headers: {
        'fiware-service': 'TestService',
        'fiware-servicepath': '/testingPath'
    }
};
const deviceCreation = {
    url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
    method: 'POST',
    json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice.json'),
    headers: {
        'fiware-service': 'TestService',
        'fiware-servicepath': '/testingPath'
    }
};

describe('NGSI-LD - Provisioning API: Single service mode', function() {
    beforeEach(function(done) {
        nock.cleanAll();

        iotAgentLib.activate(iotAgentConfig, function() {
            iotAgentLib.clearAll(done);
        });
    });

    afterEach(function(done) {
        nock.cleanAll();
        iotAgentLib.setProvisioningHandler();
        iotAgentLib.deactivate(done);
    });

    describe('When a new configuration arrives to an already configured subservice', function() {
        const groupCreationDuplicated = {
            url: 'http://localhost:4041/iot/services',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/provisionDuplicateGroup.json'),
            headers: {
                'fiware-service': 'TestService',
                'fiware-servicepath': '/testingPath'
            }
        };

        beforeEach(function(done) {
            request(groupCreation, done);
        });

        it('should raise a DUPLICATE_GROUP error', function(done) {
            request(groupCreationDuplicated, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(409);
                should.exist(body.name);
                body.name.should.equal('DUPLICATE_GROUP');
                done();
            });
        });
    });
    describe('When a device is provisioned with an ID that already exists in the configuration', function() {
        const deviceCreationDuplicated = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionDuplicatedDev.json'),
            headers: {
                'fiware-service': 'TestService',
                'fiware-servicepath': '/testingPath'
            }
        };

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://unexistentHost:1026')
                .matchHeader('fiware-service', 'TestService')
                .post('/ngsi-ld/v1/csourceRegistrations/')
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock
                .matchHeader('fiware-service', 'TestService')
                .post('/ngsi-ld/v1/entityOperations/upsert/')
                .reply(204);

            request(groupCreation, function(error) {
                request(deviceCreation, function(error, response, body) {
                    done();
                });
            });
        });

        it('should raise a DUPLICATE_DEVICE_ID error', function(done) {
            request(deviceCreationDuplicated, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(409);
                should.exist(body.name);
                body.name.should.equal('DUPLICATE_DEVICE_ID');
                done();
            });
        });
    });
    describe('When a device is provisioned with an ID that exists globally but not in the configuration', function() {
        const alternativeDeviceCreation = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice.json'),
            headers: {
                'fiware-service': 'AlternateService',
                'fiware-servicepath': '/testingPath'
            }
        };
        const alternativeGroupCreation = {
            url: 'http://localhost:4041/iot/services',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/provisionFullGroup.json'),
            headers: {
                'fiware-service': 'AlternateService',
                'fiware-servicepath': '/testingPath'
            }
        };

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'TestService')
                .post('/ngsi-ld/v1/csourceRegistrations/')
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock
                .matchHeader('fiware-service', 'TestService')
                .post('/ngsi-ld/v1/entityOperations/upsert/')
                .reply(204);

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'AlternateService')
                .post('/ngsi-ld/v1/csourceRegistrations/')
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock
                .matchHeader('fiware-service', 'AlternateService')
                .post('/ngsi-ld/v1/entityOperations/upsert/')
                .reply(204);

            request(groupCreation, function(error) {
                request(deviceCreation, function(error, response, body) {
                    request(alternativeGroupCreation, function(error, response, body) {
                        done();
                    });
                });
            });
        });

        it('should return a 201 OK', function(done) {
            request(alternativeDeviceCreation, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(201);
                done();
            });
        });
    });
    describe('When a device is provisioned without a type and with a default configuration type', function() {
        const getDevice = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/Light1',
            method: 'GET',
            headers: {
                'fiware-service': 'TestService',
                'fiware-servicepath': '/testingPath'
            }
        };
        let oldType;

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://unexistentHost:1026')
                .matchHeader('fiware-service', 'TestService')
                .post('/ngsi-ld/v1/csourceRegistrations/')
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock
                .matchHeader('fiware-service', 'TestService')
                .post('/ngsi-ld/v1/entityOperations/upsert/')
                .reply(204);

            oldType = deviceCreation.json.devices[0].entity_type;
            delete deviceCreation.json.devices[0].entity_type;
            request(groupCreation, done);
        });

        afterEach(function() {
            deviceCreation.json.devices[0].entity_type = oldType;
        });

        it('should be provisioned with the default type', function(done) {
            request(deviceCreation, function(error, response, body) {
                request(getDevice, function(error, response, body) {
                    const parsedBody = JSON.parse(body);

                    parsedBody.entity_type.should.equal('SensorMachine');

                    done();
                });
            });
        });
    });
    describe('When a device is provisioned for a configuration', function() {
        beforeEach(function(done) {
            nock.cleanAll();
            contextBrokerMock = nock('http://unexistentHost:1026')
                .matchHeader('fiware-service', 'TestService')
                .post(
                    '/ngsi-ld/v1/csourceRegistrations/',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples' +
                            '/contextAvailabilityRequests/registerProvisionedDeviceWithGroup.json'
                    )
                )
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'TestService')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/createProvisionedDeviceWithGroupAndStatic.json'
                    )
                )
                .reply(204);

            request(groupCreation, done);
        });

        it('should not raise any error', function(done) {
            request(deviceCreation, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(201);
                done();
            });
        });

        it('should send the mixed data to the Context Broker', function(done) {
            request(deviceCreation, function(error, response, body) {
                contextBrokerMock.done();
                done();
            });
        });
    });
});
