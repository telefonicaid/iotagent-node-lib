/*
 * Copyright 2016 Telefonica Investigación y Desarrollo, S.A.U
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

/* jshint camelcase: false */

var iotAgentLib = require('../../../lib/fiware-iotagent-lib'),
    utils = require('../../tools/utils'),

    should = require('should'),
    nock = require('nock'),
    contextBrokerMock,
    request = require('request'),
    iotAgentConfig = {
        logLevel: 'FATAL',
        contextBroker: {
            host: '192.168.1.1',
            port: '1026'
        },
        server: {
            port: 4041,
            baseRoot: '/'
        },
        types: {},
        service: 'smartGondor',
        singleConfigurationMode: true,
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    },
    groupCreation = {
        url: 'http://localhost:4041/iot/services',
        method: 'POST',
        json: utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/provisionFullGroup.json'),
        headers: {
            'fiware-service': 'TestService',
            'fiware-servicepath': '/testingPath'
        }
    },
    deviceCreation = {
        url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
        method: 'POST',
        json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice.json'),
        headers: {
            'fiware-service': 'TestService',
            'fiware-servicepath': '/testingPath'
        }
    };

describe('Provisioning API: Single service mode', function() {
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
        var groupCreationDuplicated = {
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
        var deviceCreationDuplicated = {
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

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'TestService')
                .matchHeader('fiware-servicepath', '/testingPath')
                .post('/NGSI9/registerContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'TestService')
                .matchHeader('fiware-servicepath', '/testingPath')
                .post('/v1/updateContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

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
        var alternativeDeviceCreation = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice.json'),
                headers: {
                    'fiware-service': 'AlternateService',
                    'fiware-servicepath': '/testingPath'
                }
            },
            alternativeGroupCreation = {
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
                .matchHeader('fiware-servicepath', '/testingPath')
                .post('/NGSI9/registerContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'TestService')
                .matchHeader('fiware-servicepath', '/testingPath')
                .post('/v1/updateContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'AlternateService')
                .matchHeader('fiware-servicepath', '/testingPath')
                .post('/NGSI9/registerContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'AlternateService')
                .matchHeader('fiware-servicepath', '/testingPath')
                .post('/v1/updateContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

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
        var getDevice = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/Light1',
                method: 'GET',
                headers: {
                    'fiware-service': 'TestService',
                    'fiware-servicepath': '/testingPath'
                }
            },
            oldType;

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'TestService')
                .matchHeader('fiware-servicepath', '/testingPath')
                .post('/NGSI9/registerContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'TestService')
                .matchHeader('fiware-servicepath', '/testingPath')
                .post('/v1/updateContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

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
                    var parsedBody;

                    parsedBody = JSON.parse(body);

                    parsedBody.entity_type.should.equal('SensorMachine');

                    done();
                });
            });
        });
    });
    describe('When a device is provisioned for a configuration', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'TestService')
                .matchHeader('fiware-servicepath', '/testingPath')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerProvisionedDeviceWithGroup.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'TestService')
                .matchHeader('fiware-servicepath', '/testingPath')
                .post('/v1/updateContext', utils.readExampleFile(
                    './test/unit/examples/contextRequests/createProvisionedDeviceWithGroupAndStatic.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

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
