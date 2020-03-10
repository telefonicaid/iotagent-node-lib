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
const nock = require('nock');
const async = require('async');
const request = require('request');
let contextBrokerMock;
const iotAgentConfig = {
    logLevel: 'ERROR',
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
    subservice: 'gardens',
    providerUrl: 'http://smartGondor.com'
};

describe('NGSI-LD - Device provisioning API: Remove provisioned devices', function() {
    const provisioning1Options = {
        url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
        method: 'POST',
        headers: {
            'fiware-service': 'smartGondor',
            'fiware-servicepath': '/gardens'
        },
        json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice.json')
    };
    const provisioning2Options = {
        url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
        method: 'POST',
        headers: {
            'fiware-service': 'smartGondor',
            'fiware-servicepath': '/gardens'
        },
        json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionAnotherDevice.json')
    };
    const provisioning3Options = {
        url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
        method: 'POST',
        headers: {
            'fiware-service': 'smartGondor',
            'fiware-servicepath': '/gardens'
        },
        json: utils.readExampleFile(
            './test/unit/examples/deviceProvisioningRequests/' + 'provisionDeviceActiveAtts.json'
        )
    };

    beforeEach(function(done) {
        iotAgentLib.activate(iotAgentConfig, function() {
            const nockBody = utils.readExampleFile(
                './test/unit/ngsi-ld/examples/contextAvailabilityRequests/registerProvisionedDevice.json'
            );
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .post('/ngsi-ld/v1/csourceRegistrations/', nockBody)
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post('/ngsi-ld/v1/entityOperations/upsert/')
                .reply(204);

            const nockBody2 = utils.readExampleFile(
                './test/unit/ngsi-ld/examples/contextAvailabilityRequests/registerProvisionedDevice2.json'
            );
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .post('/ngsi-ld/v1/csourceRegistrations/', nockBody2)
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post('/ngsi-ld/v1/entityOperations/upsert/')
                .reply(204);

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .delete('/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d')
                .reply(204);

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post('/ngsi-ld/v1/entityOperations/upsert/')
                .reply(204);

            async.series(
                [
                    iotAgentLib.clearAll,
                    async.apply(request, provisioning1Options),
                    async.apply(request, provisioning2Options),
                    async.apply(request, provisioning3Options)
                ],
                function(error, results) {
                    done();
                }
            );
        });
    });

    afterEach(function(done) {
        iotAgentLib.deactivate(done);
    });

    describe('When a request to remove a provision device arrives', function() {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/Light1',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'DELETE'
        };

        it('should return a 200 OK and no errors', function(done) {
            request(options, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(204);
                done();
            });
        });

        it('should remove the device from the provisioned devices list', function(done) {
            request(options, function(error, response, body) {
                const options = {
                    url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                    headers: {
                        'fiware-service': 'smartGondor',
                        'fiware-servicepath': '/gardens'
                    },
                    method: 'GET'
                };

                request(options, function(error, response, body) {
                    const parsedBody = JSON.parse(body);
                    parsedBody.devices.length.should.equal(2);
                    done();
                });
            });
        });

        it('should return a 404 error when asking for the particular device', function(done) {
            request(options, function(error, response, body) {
                const options = {
                    url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/Light1',
                    headers: {
                        'fiware-service': 'smartGondor',
                        'fiware-servicepath': '/gardens'
                    },
                    method: 'GET'
                };

                request(options, function(error, response, body) {
                    should.not.exist(error);
                    response.statusCode.should.equal(404);
                    done();
                });
            });
        });

        it('should call the device remove handler if present', function(done) {
            let handlerCalled = false;

            iotAgentLib.setRemoveDeviceHandler(function(device, callback) {
                handlerCalled = true;
                callback(null, device);
            });

            request(options, function(error, response, body) {
                handlerCalled.should.equal(true);
                done();
            });
        });
    });

    describe('When a request to remove a provision device arrives. Device without lazy atts or commands', function() {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/Light3',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'DELETE'
        };

        it('should return a 200 OK and no errors', function(done) {
            request(options, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(204);
                done();
            });
        });
    });
});
