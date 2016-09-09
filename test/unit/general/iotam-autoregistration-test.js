/*
 * Copyright 2015 Telefonica Investigación y Desarrollo, S.A.U
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
    request = require('request'),
    nock = require('nock'),
    utils = require('../../tools/utils'),
    groupRegistryMemory = require('../../../lib/services/groups/groupRegistryMemory'),
    should = require('should'),
    iotAgentConfig = {
        logLevel: 'FATAL',
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
                attributes: [
                    {
                        name: 'pressure',
                        type: 'Hgmm'
                    }
                ]
            }
        },
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S',
        iotManager: {
            host: 'mockediotam.com',
            port: 9876,
            path: '/protocols',
            protocol: 'GENERIC_PROTOCOL',
            description: 'A generic protocol',
            agentPath: '/iot'
        },
        defaultResource: '/iot/d'
    },
    groupCreation = {
        service: 'theService',
        subservice: 'theSubService',
        resource: '/deviceTest',
        apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732',
        type: 'SensorMachine',
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
        ]
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
                    ]
                }
            ]
        },
        headers: {
            'fiware-service': 'theService',
            'fiware-servicepath': 'theSubService'
        }
    },
    optionsCreationStatic = {
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
                    static_attributes: [
                        {
                            name: 'position',
                            type: 'location',
                            values: '123,12'
                        }
                    ],
                    attributes: [
                        {
                            name: 'status',
                            type: 'Boolean'
                        }
                    ]
                }
            ]
        },
        headers: {
            'fiware-service': 'theService',
            'fiware-servicepath': 'theSubService'
        }
    },
    optionsDelete = {
        url: 'http://localhost:4041/iot/services',
        method: 'DELETE',
        json: {},
        headers: {
            'fiware-service': 'theService',
            'fiware-servicepath': 'theSubService'
        },
        qs: {
            resource: '/deviceTest',
            apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732'
        }
    },
    iotamMock;

describe('IoT Manager autoregistration', function() {
    describe('When the IoT Agent is started without a "iotManager" config parameter and empty services', function() {
        beforeEach(function() {
            nock.cleanAll();

            iotamMock = nock('http://mockediotam.com:9876')
                .post('/protocols',
                    utils.readExampleFile('./test/unit/examples/iotamRequests/registrationEmpty.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/examples/iotamResponses/registrationSuccess.json'));
        });

        afterEach(function(done) {
            iotAgentLib.deactivate(done);
        });

        it('should register itself to the provided IoT Manager URL', function(done) {
            iotAgentLib.activate(iotAgentConfig, function(error) {
                should.not.exist(error);
                iotamMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agents is started with "iotManager" config with missing attributes', function() {
        beforeEach(function() {
            nock.cleanAll();

            delete iotAgentConfig.providerUrl;

            iotamMock = nock('http://mockediotam.com:9876')
                .post('/protocols',
                utils.readExampleFile('./test/unit/examples/iotamRequests/registrationEmpty.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/examples/iotamResponses/registrationSuccess.json'));
        });

        afterEach(function() {
            iotAgentConfig.providerUrl = 'http://smartGondor.com';
        });

        it('should fail with a MISSING_CONFIG_PARAMS error', function(done) {
            iotAgentLib.activate(iotAgentConfig, function(error) {
                should.exist(error);
                error.name.should.equal('MISSING_CONFIG_PARAMS');
                done();
            });
        });
    });

    describe('When the IoT Agents is started with "iotManager" config and multiple services', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            iotamMock = nock('http://mockediotam.com:9876')
                .post('/protocols',
                utils.readExampleFile('./test/unit/examples/iotamRequests/registrationWithGroups.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/examples/iotamResponses/registrationSuccess.json'));

            groupRegistryMemory.create(groupCreation, done);
        });

        afterEach(function(done) {
            groupRegistryMemory.clear(function() {
                iotAgentLib.deactivate(done);
            });
        });

        it('should send all the service information to the IoT Manager in the registration', function(done) {
            iotAgentLib.activate(iotAgentConfig, function(error) {
                should.not.exist(error);
                iotamMock.done();
                done();
            });
        });
    });

    describe('When a new service is created in the IoT Agent', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            iotamMock = nock('http://mockediotam.com:9876')
                .post('/protocols',
                utils.readExampleFile('./test/unit/examples/iotamRequests/registrationEmpty.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/examples/iotamResponses/registrationSuccess.json'));

            iotamMock
                .post('/protocols',
                utils.readExampleFile('./test/unit/examples/iotamRequests/registrationWithGroups.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/examples/iotamResponses/registrationSuccess.json'));

            iotAgentLib.activate(iotAgentConfig, function(error) {
                done();
            });
        });

        afterEach(function(done) {
            groupRegistryMemory.clear(function() {
                iotAgentLib.deactivate(done);
            });
        });

        it('should update the registration in the IoT Manager', function(done) {
            request(optionsCreation, function(error, result, body) {
                should.not.exist(error);
                iotamMock.done();
                done();
            });
        });
    });

    describe('When a service is removed from the IoT Agent', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            iotamMock = nock('http://mockediotam.com:9876')
                .post('/protocols',
                utils.readExampleFile('./test/unit/examples/iotamRequests/registrationWithGroups.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/examples/iotamResponses/registrationSuccess.json'));

            iotamMock
                .post('/protocols',
                utils.readExampleFile('./test/unit/examples/iotamRequests/registrationEmpty.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/examples/iotamResponses/registrationSuccess.json'));

            groupRegistryMemory.create(groupCreation, function() {
                iotAgentLib.activate(iotAgentConfig, done);
            });
        });

        afterEach(function(done) {
            groupRegistryMemory.clear(function() {
                iotAgentLib.deactivate(done);
            });
        });

        it('should update the registration in the IoT Manager', function(done) {
            request(optionsDelete, function(error, result, body) {
                should.not.exist(error);
                iotamMock.done();
                done();
            });
        });
    });

    describe('When a new service with static attributes is created in the IoT Agent', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            iotamMock = nock('http://mockediotam.com:9876')
                .post('/protocols',
                    utils.readExampleFile('./test/unit/examples/iotamRequests/registrationEmpty.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/examples/iotamResponses/registrationSuccess.json'));

            iotamMock
                .post('/protocols',
                    utils.readExampleFile('./test/unit/examples/iotamRequests/registrationWithStaticGroups.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/examples/iotamResponses/registrationSuccess.json'));

            iotAgentLib.activate(iotAgentConfig, function(error) {
                done();
            });
        });

        afterEach(function(done) {
            groupRegistryMemory.clear(function() {
                iotAgentLib.deactivate(done);
            });
        });

        it('should update the registration in the IoT Manager', function(done) {
            request(optionsCreationStatic, function(error, result, body) {
                should.not.exist(error);
                iotamMock.done();
                done();
            });
        });
    });
});
