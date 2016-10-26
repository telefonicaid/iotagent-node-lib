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

/* jshint camelcase: false */

var iotAgentLib = require('../../../lib/fiware-iotagent-lib'),
    utils = require('../../tools/utils'),
    should = require('should'),
    nock = require('nock'),
    async = require('async'),
    request = require('request'),
    contextBrokerMock,
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
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    };

describe('Device provisioning API: List provisioned devices', function() {
    var provisioning1Options,
        provisioning2Options,
        provisioning3Options,
        provisioning4Options;

    beforeEach(function(done) {
        provisioning1Options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice.json')
        };

        provisioning2Options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionAnotherDevice.json')
        };

        provisioning4Options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionFullDevice.json')
        };

        iotAgentLib.activate(iotAgentConfig, function() {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/NGSI9/registerContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .post('/v1/updateContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .post('/NGSI9/registerContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .post('/v1/updateContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .post('/NGSI9/registerContext')
                .reply(200,
                    utils.readExampleFile(
                        './test/unit/examples/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .post('/v1/updateContext')
                .reply(200,
                    utils.readExampleFile(
                        './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            async.series([
                iotAgentLib.clearAll,
                async.apply(request, provisioning1Options),
                async.apply(request, provisioning2Options),
                async.apply(request, provisioning4Options)
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
                should.exist(parsedBody.devices);
                response.statusCode.should.equal(200);
                parsedBody.devices.length.should.equal(3);
                parsedBody.count.should.equal(3);
                done();
            });
        });

        it('should return all the appropriate field names', function(done) {
            /* jshint camelcase:false */

            request(options, function(error, response, body) {
                var parsedBody = JSON.parse(body);

                should.exist(parsedBody.devices[0].attributes);
                parsedBody.devices[0].attributes.length.should.equal(1);

                should.exist(parsedBody.devices[0].device_id);
                parsedBody.devices[0].device_id.should.equal('Light1');

                should.exist(parsedBody.devices[0].entity_name);
                parsedBody.devices[0].entity_name.should.equal('TheFirstLight');

                should.exist(parsedBody.devices[0].protocol);
                parsedBody.devices[0].protocol.should.equal('GENERIC_PROTO');

                should.exist(parsedBody.devices[0].static_attributes);
                parsedBody.devices[0].static_attributes.length.should.equal(1);

                done();
            });
        });

        it('should return all the plugin attributes', function(done) {
            request(options, function(error, response, body) {
                var parsedBody = JSON.parse(body);


                should.exist(parsedBody.devices[2].attributes[0].entity_name);
                should.exist(parsedBody.devices[2].attributes[0].entity_type);
                should.exist(parsedBody.devices[2].attributes[1].expression);
                should.exist(parsedBody.devices[2].attributes[2].reverse);
                parsedBody.devices[2].attributes[0].entity_name.should.equal('Higro2000');
                parsedBody.devices[2].attributes[0].entity_type.should.equal('Higrometer');
                parsedBody.devices[2].attributes[1].expression.should.equal('${@humidity * 20}');
                parsedBody.devices[2].attributes[2].reverse.length.should.equal(2);
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
                parsedBody.device_id.should.equal('Light1');
                done();
            });
        });

        it('should return the appropriate attribute fields', function(done) {
            request(options, function(error, response, body) {
                /* jshint camelcase:false */

                var parsedBody;

                should.not.exist(error);

                parsedBody = JSON.parse(body);
                should.exist(parsedBody.attributes[0].object_id);
                parsedBody.attributes[0].object_id.should.equal('attr_name');
                parsedBody.attributes[0].name.should.equal('attr_name');
                parsedBody.attributes[0].type.should.equal('string');
                done();
            });
        });
    });
    describe('When a request for a device with plugin attributes arrives', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/LightFull',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'GET'
        };

        it('should return the appropriate attribute fields', function(done) {
            request(options, function(error, response, body) {
                /* jshint camelcase:false */

                var parsedBody;

                should.not.exist(error);

                parsedBody = JSON.parse(body);
                should.exist(parsedBody.attributes[0].entity_name);
                should.exist(parsedBody.attributes[0].entity_type);
                should.exist(parsedBody.attributes[1].expression);
                should.exist(parsedBody.attributes[2].reverse);
                parsedBody.attributes[0].entity_name.should.equal('Higro2000');
                parsedBody.attributes[0].entity_type.should.equal('Higrometer');
                parsedBody.attributes[1].expression.should.equal('${@humidity * 20}');
                parsedBody.attributes[2].reverse.length.should.equal(2);
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
                json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice.json')
            };

            provisioningDeviceOptions.json.devices[0].device_id =
                provisioningDeviceOptions.json.devices[0].device_id + '_' + i;

            request(provisioningDeviceOptions, callback);
        }

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/NGSI9/registerContext')
                .times(10)
                .reply(200,
                    utils.readExampleFile(
                        './test/unit/examples/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .post('/v1/updateContext')
                .times(10)
                .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

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
                parsedBody.devices.length.should.equal(3);
                done();
            });
        });

        it('should return a count with the complete number of devices', function(done) {
            request(options, function(error, response, body) {
                var parsedBody = JSON.parse(body);
                should.not.exist(error);
                parsedBody.count.should.equal(10);
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
                json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice.json')
            };

            provisioningDeviceOptions.json.devices[0].device_id =
                provisioningDeviceOptions.json.devices[0].device_id + '_' + i;

            request(provisioningDeviceOptions, function(error, response, body) {
                callback();
            });
        }

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/NGSI9/registerContext')
                .times(10)
                .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

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

                for (var i = 0; i < parsedBody.devices.length; i++) {
                    ['Light1_0', 'Light1_1', 'Light1_2'].indexOf(parsedBody.devices[i].id).should.equal(-1);
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
                json: utils.readExampleFile(
                    './test/unit/examples/deviceProvisioningRequests/provisionYetAnotherDevice.json')
            };

            contextBrokerMock
                .post('/NGSI9/registerContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerProvisionedDeviceSuccess.json'));

            request(provisioning3Options, function(error) {
                done();
            });
        });

        it('should return just the ones in the selected service', function(done) {
            request(options, function(error, response, body) {
                var parsedBody = JSON.parse(body);
                should.not.exist(error);
                response.statusCode.should.equal(200);
                parsedBody.devices.length.should.equal(3);
                done();
            });
        });
    });
});
