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
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 */

/* eslint-disable no-unused-vars */

const iotAgentLib = require('../../../lib/fiware-iotagent-lib');
const utils = require('../../tools/utils');
const request = utils.request;
const should = require('should');
const logger = require('logops');
const nock = require('nock');

let contextBrokerMock;
const iotAgentConfig = {
    contextBroker: {
        host: '192.168.1.1',
        port: '1026'
    },
    server: {
        port: 4041
    },
    types: {
        Light: {
            commands: [],
            type: 'Light',
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
            ]
        }
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M'
};

describe('NGSI-v2 - Data Mapping Plugins: device provision', function () {
    const options = {
        url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
        method: 'POST',
        json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice.json'),
        headers: {
            'fiware-service': 'smartgondor',
            'fiware-servicepath': '/gardens'
        }
    };

    beforeEach(function (done) {
        logger.setLevel('FATAL');

        nock.cleanAll();

        contextBrokerMock = nock('http://192.168.1.1:1026')
            .matchHeader('fiware-service', 'smartgondor')
            .matchHeader('fiware-servicepath', '/gardens')
            .post(
                '/v2/registrations',
                utils.readExampleFile('./test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent5.json')
            )
            .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

        contextBrokerMock
            .matchHeader('fiware-service', 'smartgondor')
            .matchHeader('fiware-servicepath', '/gardens')
            .post('/v2/entities?options=upsert')
            .reply(204);

        iotAgentLib.activate(iotAgentConfig, function (error) {
            iotAgentLib.clearAll(done);
        });
    });

    afterEach(function (done) {
        iotAgentLib.clearAll(function () {
            iotAgentLib.deactivate(done);
        });
    });

    describe('When a provision request arrives to a IoTA with provisioning middleware', function () {
        it('should execute the translation middlewares', function (done) {
            let executed = false;

            function testMiddleware(device, callback) {
                executed = true;
                callback(null, device);
            }

            iotAgentLib.addDeviceProvisionMiddleware(testMiddleware);

            request(options, function (error, response, body) {
                should.not.exist(error);
                executed.should.equal(true);
                done();
            });
        });

        it('should continue with the registration process', function (done) {
            function testMiddleware(device, callback) {
                callback(null, device);
            }

            iotAgentLib.addDeviceProvisionMiddleware(testMiddleware);

            request(options, function (error, response, body) {
                contextBrokerMock.done();
                done();
            });
        });

        it('should execute the device provisioning handlers', function (done) {
            let executed = false;

            function testMiddleware(device, callback) {
                callback(null, device);
            }

            function provisioningHandler(device, callback) {
                executed = true;
                callback(null, device);
            }

            iotAgentLib.addDeviceProvisionMiddleware(testMiddleware);
            iotAgentLib.setProvisioningHandler(provisioningHandler);

            request(options, function (error, response, body) {
                executed.should.equal(true);
                done();
            });
        });
    });

    describe('When a provisioning middleware returns an error', function () {
        it('should not continue with the registration process', function (done) {
            function testMiddleware(device, callback) {
                callback(new Error('This provisioning should not progress'));
            }

            iotAgentLib.addDeviceProvisionMiddleware(testMiddleware);

            request(options, function (error, response, body) {
                should.equal(contextBrokerMock.isDone(), false);
                done();
            });
        });

        it('should not execute the device provisioning handlers', function (done) {
            let executed = false;

            function testMiddleware(device, callback) {
                callback(new Error('This provisioning should not progress'));
            }

            function provisioningHandler(device, callback) {
                executed = true;
                callback(null, device);
            }

            iotAgentLib.addDeviceProvisionMiddleware(testMiddleware);
            iotAgentLib.setProvisioningHandler(provisioningHandler);

            request(options, function (error, response, body) {
                executed.should.equal(false);
                done();
            });
        });
    });
});
