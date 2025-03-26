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
const nock = require('nock');
const async = require('async');

let contextBrokerMock;
const iotAgentConfig = {
    logLevel: 'FATAL',
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'v2'
    },
    server: {
        port: 4041,
        host: 'localhost',
        baseRoot: '/'
    },
    types: {},
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    useCBflowControl: true
};

describe('NGSI-v2 - Device provisioning API: List provisioned devices', function () {
    let provisioning1Options;
    let provisioning2Options;
    let provisioning3Options;
    let provisioning4Options;

    beforeEach(function (done) {
        provisioning1Options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice.json')
        };

        provisioning2Options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionAnotherDevice.json')
        };

        provisioning4Options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionFullDevice.json')
        };

        iotAgentLib.activate(iotAgentConfig, function () {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/v2/registrations')
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock.post('/v2/entities?options=upsert,flowControl').reply(204);

            contextBrokerMock
                .post('/v2/registrations')
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock.post('/v2/entities?options=upsert,flowControl').reply(204);

            contextBrokerMock
                .post('/v2/registrations')
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock.post('/v2/entities?options=upsert,flowControl').reply(204);

            async.series(
                [
                    iotAgentLib.clearAll,
                    async.apply(request, provisioning1Options),
                    async.apply(request, provisioning2Options),
                    async.apply(request, provisioning4Options)
                ],
                function (error, results) {
                    done();
                }
            );
        });
    });

    afterEach(function (done) {
        iotAgentLib.deactivate(done);
    });

    describe('When a request for the list of provisioned devices arrive', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'GET'
        };

        it('should return all the provisioned devices', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                should.exist(body.devices);
                response.statusCode.should.equal(200);
                body.devices.length.should.equal(3);
                body.count.should.equal(3);
                done();
            });
        });

        it('should return all the appropriate field names', function (done) {
            /* jshint camelcase:false */

            request(options, function (error, response, body) {
                should.exist(body.devices[0].attributes);
                body.devices[0].attributes.length.should.equal(1);

                should.exist(body.devices[0].device_id);
                body.devices[0].device_id.should.equal('Light1');

                should.exist(body.devices[0].entity_name);
                body.devices[0].entity_name.should.equal('TheFirstLight');

                should.exist(body.devices[0].protocol);
                body.devices[0].protocol.should.equal('GENERIC_PROTO');

                should.exist(body.devices[0].static_attributes);
                body.devices[0].static_attributes.length.should.equal(1);

                done();
            });
        });

        it('should return all the plugin attributes', function (done) {
            request(options, function (error, response, body) {
                should.exist(body.devices[2].attributes[0].entity_name);
                should.exist(body.devices[2].attributes[0].entity_type);
                should.exist(body.devices[2].attributes[1].expression);
                body.devices[2].attributes[0].entity_name.should.equal('Higro2000');
                body.devices[2].attributes[0].entity_type.should.equal('Higrometer');
                body.devices[2].attributes[1].expression.should.equal('${@humidity * 20}');
                done();
            });
        });
    });
    describe('When a request for the information about a specific device arrives', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/Light1',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'GET'
        };

        it('should return all the information on that particular device', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);

                body.entity_name.should.equal('TheFirstLight');
                body.device_id.should.equal('Light1');
                done();
            });
        });

        it('should return the appropriate attribute fields', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);

                should.exist(body.attributes[0].object_id);
                body.attributes[0].object_id.should.equal('attr_name');
                body.attributes[0].name.should.equal('attr_name');
                body.attributes[0].type.should.equal('string');
                done();
            });
        });
    });
    describe('When a request for a device with plugin attributes arrives', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/LightFull',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'GET'
        };

        it('should return the appropriate attribute fields', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);

                should.exist(body.attributes[0].entity_name);
                should.exist(body.attributes[0].entity_type);
                should.exist(body.attributes[1].expression);
                body.attributes[0].entity_name.should.equal('Higro2000');
                body.attributes[0].entity_type.should.equal('Higrometer');
                body.attributes[1].expression.should.equal('${@humidity * 20}');
                done();
            });
        });
    });
    describe('When a request for an unexistent device arrives', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/Light84',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'GET'
        };

        it('should return a 404 error', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(404);
                done();
            });
        });
    });

    describe('When a request for listing all the devices with a limit of 3 arrives', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices?limit=3',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'GET'
        };

        function createDeviceRequest(i, callback) {
            /* jshint camelcase: false */

            const provisioningDeviceOptions = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                headers: {
                    'fiware-service': 'smartgondor',
                    'fiware-servicepath': '/gardens'
                },
                json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice.json')
            };

            provisioningDeviceOptions.json.devices[0].device_id =
                provisioningDeviceOptions.json.devices[0].device_id + '_' + i;

            request(provisioningDeviceOptions, callback);
        }

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/registrations')
                .times(10)
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock.post('/v2/entities?options=upsert,flowControl').times(10).reply(204);

            iotAgentLib.clearAll(function () {
                async.times(10, createDeviceRequest, function (error, results) {
                    done();
                });
            });
        });

        it('should return just 3 devices', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                body.devices.length.should.equal(3);
                done();
            });
        });

        it('should return a count with the complete number of devices', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                body.count.should.equal(10);
                done();
            });
        });
    });

    describe('When a request for listing all the devices with a offset of 3 arrives', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices?offset=3',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'GET'
        };

        function createDeviceRequest(i, callback) {
            const provisioningDeviceOptions = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                headers: {
                    'fiware-service': 'smartgondor',
                    'fiware-servicepath': '/gardens'
                },
                json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice.json')
            };

            provisioningDeviceOptions.json.devices[0].device_id =
                provisioningDeviceOptions.json.devices[0].device_id + '_' + i;

            request(provisioningDeviceOptions, function (error, response, body) {
                callback();
            });
        }

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/registrations')
                .times(10)
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            iotAgentLib.clearAll(function () {
                async.timesSeries(10, createDeviceRequest, function (error, results) {
                    done();
                });
            });
        });

        it('should skip the first 3 devices', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);

                for (let i = 0; i < body.devices.length; i++) {
                    ['Light1_0', 'Light1_1', 'Light1_2'].indexOf(body.devices[i].id).should.equal(-1);
                }

                done();
            });
        });
    });

    describe('When a listing request arrives and there are devices in other service and servicepath', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'GET'
        };

        beforeEach(function (done) {
            provisioning3Options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                headers: {
                    'fiware-service': 'dumbMordor',
                    'fiware-servicepath': '/gardens'
                },
                json: utils.readExampleFile(
                    './test/unit/examples/deviceProvisioningRequests/provisionYetAnotherDevice.json'
                )
            };

            contextBrokerMock
                .post('/v2/registrations')
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            request(provisioning3Options, function (error) {
                done();
            });
        });

        it('should return just the ones in the selected service', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);
                body.devices.length.should.equal(3);
                done();
            });
        });
    });
});
