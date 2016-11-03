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

var iotAgentLib = require('../../../lib/fiware-iotagent-lib'),
    utils = require('../../tools/utils'),
    should = require('should'),
    logger = require('logops'),
    nock = require('nock'),
    mongoUtils = require('../mongodb/mongoDBUtils'),
    request = require('request'),
    contextBrokerMock,
    statusAttributeMock,
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
            'Motion': {
                commands: [],
                lazy: [
                    {
                        name: 'moving',
                        type: 'Boolean'
                    }
                ],
                staticAttributes: [
                    {
                        'name': 'location',
                        'type': 'Vector',
                        'value': '(123,523)'
                    }
                ],
                active: []
            },
            'Robot': {
                commands: [
                    {
                        name: 'position',
                        type: 'Array'
                    }
                ],
                lazy: [],
                staticAttributes: [],
                active: []
            }
        },
        deviceRegistry: {
            type: 'mongodb'
        },

        mongodb: {
            host: 'localhost',
            port: '27017',
            db: 'iotagent'
        },
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S',
        pollingExpiration: 200,
        pollingDaemonFrequency: 20
    },
    device3 = {
        id: 'r2d2',
        type: 'Robot',
        service: 'smartGondor',
        subservice: 'gardens',
        polling: true
    };

describe('Polling commands', function() {
    beforeEach(function(done) {
        logger.setLevel('FATAL');

        nock.cleanAll();

        contextBrokerMock = nock('http://192.168.1.1:1026')
            .matchHeader('fiware-service', 'smartGondor')
            .matchHeader('fiware-servicepath', 'gardens')
            .post('/NGSI9/registerContext',
                utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgentCommands.json'))
            .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

        contextBrokerMock
            .matchHeader('fiware-service', 'smartGondor')
            .matchHeader('fiware-servicepath', 'gardens')
            .post('/v1/updateContext')
            .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));


        iotAgentLib.activate(iotAgentConfig, done);
    });

    afterEach(function(done) {
        iotAgentLib.clearAll(function() {
            iotAgentLib.deactivate(function() {
                mongoUtils.cleanDbs(function() {
                    nock.cleanAll();
                    iotAgentLib.setDataUpdateHandler();
                    iotAgentLib.setCommandHandler();
                    done();
                });
            });
        });
    });

    describe('When a command update arrives to the IoT Agent for a device with polling', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/updateContext',
            method: 'POST',
            json: {
                contextElements: [
                    {
                        type: 'Robot',
                        isPattern: 'false',
                        id: 'Robot:r2d2',
                        attributes: [
                            {
                                name: 'position',
                                type: 'Array',
                                value: '[28, -104, 23]'
                            }
                        ]
                    }
                ],
                updateAction: 'UPDATE'
            },
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': 'gardens'
            }
        };

        beforeEach(function(done) {
            statusAttributeMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext',
                    utils.readExampleFile('./test/unit/examples/contextRequests/updateContextCommandStatus.json'))
                .reply(200,
                    utils.readExampleFile(
                        './test/unit/examples/contextResponses/updateContextCommandStatusSuccess.json'));

            iotAgentLib.register(device3, function(error) {
                done();
            });
        });

        it('should not call the client handler', function(done) {
            var handlerCalled = false;

            iotAgentLib.setCommandHandler(function(id, type, service, subservice, attributes, callback) {
                handlerCalled = true;
                callback(null, {
                    id: id,
                    type: type,
                    attributes: [
                        {
                            name: 'position',
                            type: 'Array',
                            value: '[28, -104, 23]'
                        }
                    ]
                });
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                handlerCalled.should.equal(false);
                done();
            });
        });
        it('should create the attribute with the "_status" prefix in the Context Broker', function(done) {
            iotAgentLib.setCommandHandler(function(id, type, service, subservice, attributes, callback) {
                callback(null);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                statusAttributeMock.done();
                done();
            });
        });
        it('should store the commands in the queue', function(done) {
            iotAgentLib.setCommandHandler(function(id, type, service, subservice, attributes, callback) {
                callback(null);
            });

            request(options, function(error, response, body) {
                iotAgentLib.commandQueue('smartGondor', 'gardens', 'r2d2', function(error, listCommands) {
                    should.not.exist(error);
                    listCommands.count.should.equal(1);
                    listCommands.commands[0].name.should.equal('position');
                    listCommands.commands[0].type.should.equal('Array');
                    listCommands.commands[0].value.should.equal('[28, -104, 23]');
                    done();
                });
            });
        });
    });

    describe('When a command arrives with multiple values in the value field', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/updateContext',
            method: 'POST',
            json: {
                contextElements: [
                    {
                        type: 'Robot',
                        isPattern: 'false',
                        id: 'Robot:r2d2',
                        attributes: [
                            {
                                name: 'position',
                                type: 'Array',
                                value: {
                                    attr1: 12,
                                    attr2: 24
                                }
                            }
                        ]
                    }
                ],
                updateAction: 'UPDATE'
            },
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': 'gardens'
            }
        };

        beforeEach(function(done) {
            statusAttributeMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext',
                    utils.readExampleFile('./test/unit/examples/contextRequests/updateContextCommandStatus.json'))
                .reply(200,
                    utils.readExampleFile(
                        './test/unit/examples/contextResponses/updateContextCommandStatusSuccess.json'));

            iotAgentLib.register(device3, function(error) {
                done();
            });
        });

        it('should return a 200 OK both in HTTP and in the status code', function(done) {
            iotAgentLib.setCommandHandler(function(id, type, service, subservice, attributes, callback) {
                callback(null);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);

                response.statusCode.should.equal(200);

                done();
            });
        });
    });

    describe('When a polling command expires', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/updateContext',
            method: 'POST',
            json: {
                contextElements: [
                    {
                        type: 'Robot',
                        isPattern: 'false',
                        id: 'Robot:r2d2',
                        attributes: [
                            {
                                name: 'position',
                                type: 'Array',
                                value: '[28, -104, 23]'
                            }
                        ]
                    }
                ],
                updateAction: 'UPDATE'
            },
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': 'gardens'
            }
        };

        beforeEach(function(done) {
            statusAttributeMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext',
                    utils.readExampleFile('./test/unit/examples/contextRequests/updateContextCommandStatus.json'))
                .reply(200,
                    utils.readExampleFile(
                        './test/unit/examples/contextResponses/updateContextCommandStatusSuccess.json'));

            statusAttributeMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext',
                    utils.readExampleFile('./test/unit/examples/contextRequests/updateContextCommandExpired.json'))
                .reply(200,
                    utils.readExampleFile(
                        './test/unit/examples/contextResponses/updateContextCommandStatusSuccess.json'));

            iotAgentLib.register(device3, function(error) {
                done();
            });
        });

        it('should remove it from the queue', function(done) {
            iotAgentLib.setCommandHandler(function(id, type, service, subservice, attributes, callback) {
                callback(null);
            });

            request(options, function(error, response, body) {
                setTimeout(function() {
                    iotAgentLib.commandQueue('smartGondor', 'gardens', 'r2d2', function(error, listCommands) {
                        should.not.exist(error);
                        listCommands.count.should.equal(0);
                        done();
                    });
                }, 300);
            });
        });

        it('should mark it as ERROR in the Context Broker', function(done) {
            iotAgentLib.setCommandHandler(function(id, type, service, subservice, attributes, callback) {
                callback(null);
            });

            request(options, function(error, response, body) {
                setTimeout(function() {
                    iotAgentLib.commandQueue('smartGondor', 'gardens', 'r2d2', function(error, listCommands) {
                        statusAttributeMock.done();
                        done();
                    });
                }, 300);
            });
        });
    });
});
