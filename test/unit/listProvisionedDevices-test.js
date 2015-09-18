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
    nock = require('nock'),
    async = require('async'),
    request = require('request'),
    contextBrokerMock,
    iotAgentConfig = {
        logLevel: 'FATAL',
        contextBroker: {
            host: '10.11.128.16',
            port: '1026'
        },
        server: {
            port: 4041,
            baseRoot: '/'
        },
        types: {},
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    };

describe('Device provisioning API: List provisioned devices', function() {
    var provisioning1Options,
        provisioning2Options,
        provisioning3Options;

    beforeEach(function(done) {
        provisioning1Options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/unit/deviceProvisioningRequests/provisionNewDevice.json')
        };

        provisioning2Options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/unit/deviceProvisioningRequests/provisionAnotherDevice.json')
        };

        iotAgentLib.activate(iotAgentConfig, function() {
            contextBrokerMock = nock('http://10.11.128.16:1026')
                .post('/NGSI9/registerContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .post('/v1/updateContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/contextResponses/createProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .post('/NGSI9/registerContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .post('/v1/updateContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/contextResponses/createProvisionedDeviceSuccess.json'));

            async.series([
                iotAgentLib.clearAll,
                async.apply(request, provisioning1Options),
                async.apply(request, provisioning2Options)
            ], function(error, results) {
                done();
            });
        });
    });

    afterEach(function(done) {
        iotAgentLib.deactivate(done);
    });

    describe('When a request for the list of provisioned devices arrive', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'GET'
        };

        it('should return all the provisioned devices', function(done) {
            request(options, function(error, response, body) {
                var parsedBody = JSON.parse(body);
                should.not.exist(error);
                response.statusCode.should.equal(200);
                parsedBody.length.should.equal(2);
                done();
            });
        });
    });
    describe('When a request for the information about a specific device arrives', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/Light1',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'GET'
        };

        it('should return all the information on that particular device', function(done) {
            request(options, function(error, response, body) {
                /* jshint camelcase:false */

                var parsedBody;

                should.not.exist(error);
                response.statusCode.should.equal(200);

                parsedBody = JSON.parse(body);
                parsedBody.entity_name.should.equal('TheFirstLight');
                done();
            });
        });
    });
    describe('When a request for an unexistent device arrives', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/Light84',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'GET'
        };

        it('should return a 404 error', function(done) {
            request(options, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(404);
                done();
            });
        });
    });
    describe('When a request for listing all the devices with a limit of 3 arrives', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices?limit=3',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'GET'
        };

        function createDeviceRequest(i, callback) {
            /* jshint camelcase: false */
            var provisioningDeviceOptions = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': '/gardens'
                },
                json: utils.readExampleFile('./test/unit/deviceProvisioningRequests/provisionNewDevice.json')
            };

            provisioningDeviceOptions.json.devices[0].device_id =
                provisioningDeviceOptions.json.devices[0].device_id + '_' + i;

            request(provisioningDeviceOptions, callback);
        }

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/NGSI9/registerContext')
                .times(10)
                .reply(200,
                    utils.readExampleFile(
                        './test/unit/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .post('/v1/updateContext')
                .times(10)
                .reply(200,
                utils.readExampleFile(
                    './test/unit/contextResponses/createProvisionedDeviceSuccess.json'));

            iotAgentLib.clearAll(function() {
                async.times(10, createDeviceRequest, function(error, results) {
                    done();
                });
            });
        });

        it('should return just 3 devices', function(done) {
            request(options, function(error, response, body) {
                var parsedBody = JSON.parse(body);
                should.not.exist(error);
                parsedBody.length.should.equal(3);
                done();
            });
        });
    });

    describe('When a request for listing all the devices with a offset of 3 arrives', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices?offset=3',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'GET'
        };

        function createDeviceRequest(i, callback) {
            var provisioningDeviceOptions = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': '/gardens'
                },
                json: utils.readExampleFile('./test/unit/deviceProvisioningRequests/provisionNewDevice.json')
            };

            provisioningDeviceOptions.json.name = provisioningDeviceOptions.json.name + '_' + i;

            request(provisioningDeviceOptions, callback);
        }

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/NGSI9/registerContext')
                .times(10)
                .reply(200,
                utils.readExampleFile(
                    './test/unit/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            iotAgentLib.clearAll(function() {
                async.timesSeries(10, createDeviceRequest, function(error, results) {
                    done();
                });
            });
        });

        it('should skip the first 3 devices', function(done) {
            request(options, function(error, response, body) {
                var parsedBody = JSON.parse(body);
                should.not.exist(error);

                for (var i = 0; i < parsedBody.length; i++) {
                    ['Light1_0', 'Light1_1', 'Light1_2'].indexOf(parsedBody[i].id).should.equal(-1);
                }

                done();
            });
        });
    });

    describe('When a listing request arrives and there are devices in other service and servicepath', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'GET'
        };

        beforeEach(function(done) {
            provisioning3Options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                headers: {
                    'fiware-service': 'dumbMordor',
                    'fiware-servicepath': '/gardens'
                },
                json: utils.readExampleFile('./test/unit/deviceProvisioningRequests/provisionYetAnotherDevice.json')
            };

            contextBrokerMock
                .post('/NGSI9/registerContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            request(provisioning3Options, function(error) {
                done();
            });
        });

        it('should return just the ones in the selected service', function(done) {
            request(options, function(error, response, body) {
                var parsedBody = JSON.parse(body);
                should.not.exist(error);
                response.statusCode.should.equal(200);
                parsedBody.length.should.equal(2);
                done();
            });
        });
    });
});
