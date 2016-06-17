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
    request = require('request'),
    logger = require('logops'),
    async = require('async'),
    iotAgentConfig = {
        contextBroker: {
            host: '192.168.1.1',
            port: '1026'
        },
        server: {
            port: 4041
        },
        types: {
            'Light': {
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
            },
            'BrokenLight': {
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
                ]
            },
            'Termometer': {
                type: 'Termometer',
                commands: [],
                lazy: [
                    {
                        name: 'temp',
                        type: 'kelvin'
                    }
                ],
                active: [
                ]
            },
            'Humidity': {
                type: 'Humidity',
                cbHost: 'http://192.168.1.1:3024',
                commands: [],
                lazy: [],
                active: [
                    {
                        name: 'humidity',
                        type: 'percentage'
                    }
                ]
            },
            'Motion': {
                type: 'Motion',
                commands: [],
                lazy: [],
                staticAttributes: [
                    {
                        'name': 'location',
                        'type': 'Vector',
                        'value': '(123,523)'
                    }
                ],
                active: [
                    {
                        name: 'humidity',
                        type: 'percentage'
                    }
                ]
            }
        },
        iotManager: {
            host: 'localhost',
            port: 8082,
            path: '/protocols',
            protocol: 'MQTT_UL',
            description: 'MQTT Ultralight 2.0 IoT Agent (Node.js version)'
        },
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    },
    groupCreation = {
        url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/services',
        method: 'POST',
        json: {
            services: [
                {
                    resource: '',
                    apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732',
                    entity_type: 'TheLightType',
                    trust: '8970A9078A803H3BL98PINEQRW8342HBAMS',
                    cbHost: 'http://unexistentHost:1026',
                    commands: [],
                    lazy: [],
                    attributes: [
                        {
                            name: 'status',
                            type: 'Boolean'
                        }
                    ],
                    static_attributes: []
                }
            ]
        },
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
    },
    contextBrokerMock,
    iotamMock;


/* jshint camelcase: false */
describe('Device Service: utils', function() {
    beforeEach(function(done) {
        nock.cleanAll();
        logger.setLevel('FATAL');
        iotamMock = nock('http://localhost:8082')
            .post('/protocols')
            .reply(200, {});

        iotAgentLib.activate(iotAgentConfig, done);
    });

    afterEach(function(done) {
        nock.cleanAll();
        async.series([
            iotAgentLib.clearAll,
            iotAgentLib.deactivate
        ], done);
    });

    describe('When an existing device tries to be retrieved with retrieveOrCreate()', function() {
        beforeEach(function(done) {
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

            async.series([
                request.bind(request, groupCreation),
                request.bind(request, deviceCreation)
            ], function(error, results) {
                done();
            });
        });

        it('should return the existing device', function(done) {
            iotAgentLib.retrieveDevice('Light1', '801230BJKL23Y9090DSFL123HJK09H324HV8732', function(error, device) {
                should.not.exist(error);
                should.exist(device);

                device.id.should.equal('Light1');
                done();
            });
        });
    });

    describe('When an unexisting device tries to be retrieved for an existing APIKey', function() {
        beforeEach(function(done) {
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

            async.series([
                request.bind(request, groupCreation)
            ], function(error, results) {
                done();
            });
        });

        it('should register the device and return it', function(done) {
            iotAgentLib.retrieveDevice('UNEXISTENT_DEV', '801230BJKL23Y9090DSFL123HJK09H324HV8732',
                function(error, device) {
                    should.not.exist(error);
                    should.exist(device);

                    device.id.should.equal('UNEXISTENT_DEV');
                    should.exist(device.protocol);
                    device.protocol.should.equal('MQTT_UL');
                    done();
                });
        });
    });

    describe('When an unexisting device tries to be retrieved for an unexisting APIKey', function() {
        it('should raise an error', function(done) {
            iotAgentLib.retrieveDevice('UNEXISTENT_DEV_AND_GROUP', 'H2332Y909DSF3H346yh20JK092',
                function(error, device) {
                    should.exist(error);
                    error.name.should.equal('DEVICE_GROUP_NOT_FOUND');
                    should.not.exist(device);
                    done();
                });
        });
    });
});
