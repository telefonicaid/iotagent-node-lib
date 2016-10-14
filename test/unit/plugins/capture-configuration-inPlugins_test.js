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
 * please contact with::daniel.moranjimenez@telefonica.com
 */

'use strict';

/* jshint camelcase: false */

var iotAgentLib = require('../../../lib/fiware-iotagent-lib'),
    should = require('should'),
    logger = require('logops'),
    request = require('request'),
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
            }
        },
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    },
    optionsCreation = {
        url: 'http://localhost:4041/iot/services',
        method: 'POST',
        json: {
            services: [
                {
                    resource: '/deviceTest',
                    apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732',
                    entity_type: 'SensorMachine',
                    trust: '8970A9078A803H3BL98PINEQRW8342HBAMS',
                    cbHost: 'http://unexistentHost:1026',
                    commands: [
                        {
                            name: 'wheel1',
                            type: 'Wheel'
                        }
                    ],
                    lazy: [
                        {
                            name: 'luminescence',
                            type: 'Lumens'
                        }
                    ],
                    attributes: [
                        {
                            name: 'status',
                            type: 'Boolean'
                        }
                    ],
                    static_attributes: [
                        {
                            name: 'bootstrapServer',
                            type: 'Address',
                            value: '127.0.0.1'
                        }
                    ]
                }
            ]
        },
        headers: {
            'fiware-service': 'TestService',
            'fiware-servicepath': '/testingPath'
        }
    };

describe('Data Mapping Plugins: configuration provision', function() {
    beforeEach(function(done) {
        logger.setLevel('FATAL');

        iotAgentLib.activate(iotAgentConfig, function(error) {
            iotAgentLib.clearAll(done);
        });
    });


    afterEach(function(done) {
        iotAgentLib.clearAll(function() {
            iotAgentLib.deactivate(done);
        });
    });

    describe('When a configuration provision request arrives to a IoTA with configuration middleware', function() {
        it('should execute the configuration provisioning middlewares', function(done) {
            var handlerCalled = false;

            iotAgentLib.addConfigurationProvisionMiddleware(function(newConfiguration, callback) {
                handlerCalled = true;
                callback(null, newConfiguration);
            });

            request(optionsCreation, function(error, response, body) {
                should.not.exist(error);
                handlerCalled.should.equal(true);
                done();
            });
        });

        it('should still execute the configuration handlers', function(done) {
            var handlerCalled = false;

            iotAgentLib.addConfigurationProvisionMiddleware(function(newConfiguration, callback) {
                callback(null, newConfiguration);
            });

            iotAgentLib.setConfigurationHandler(function(newConfiguration, callback) {
                handlerCalled = true;
                callback(null, newConfiguration);
            });

            request(optionsCreation, function(error, response, body) {
                handlerCalled.should.equal(true);
                done();
            });
        });
    });

    describe('When a configuration middleware returns an error', function() {
        it('should not execute the configuration handlers', function(done) {
            var handlerCalled = false;

            iotAgentLib.addConfigurationProvisionMiddleware(function(newConfiguration, callback) {
                callback(new Error('This will prevent the handler from being executed'));
            });

            iotAgentLib.setConfigurationHandler(function(newConfiguration, callback) {
                handlerCalled = true;
                callback(null, newConfiguration);
            });

            request(optionsCreation, function(error, response, body) {
                handlerCalled.should.equal(false);
                done();
            });
        });
    });
});
