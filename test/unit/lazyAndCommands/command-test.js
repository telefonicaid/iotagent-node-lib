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
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    },
    device3 = {
        id: 'r2d2',
        type: 'Robot',
        service: 'smartGondor',
        subservice: 'gardens'
    };

describe('Command functionalities', function() {
    beforeEach(function(done) {
        logger.setLevel('FATAL');

        nock.cleanAll();

        contextBrokerMock = nock('http://192.168.1.1:1026')
            .matchHeader('fiware-service', 'smartGondor')
            .matchHeader('fiware-servicepath', 'gardens')
            .post('/NGSI9/registerContext',
            utils.readExampleFile('./test/unit/examples/contextAvailabilityRequests/registerIoTAgentCommands.json'))
            .reply(200,
            utils.readExampleFile('./test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

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

    describe('When a device is preregistered with commands', function() {
        it('should register as Context Provider of the commands', function(done) {
            iotAgentLib.register(device3, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
    describe('When a command update arrives to the IoT Agent as Context Provider', function() {
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
                utils.readExampleFile('./test/unit/examples/contextResponses/updateContextCommandStatusSuccess.json'));

            iotAgentLib.register(device3, function(error) {
                done();
            });
        });

        it('should call the client handler', function(done) {
            var handlerCalled = false;

            iotAgentLib.setCommandHandler(function(id, type, service, subservice, attributes, callback) {
                id.should.equal(device3.type + ':' + device3.id);
                type.should.equal(device3.type);
                attributes[0].name.should.equal('position');
                attributes[0].value.should.equal('[28, -104, 23]');
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
                handlerCalled.should.equal(true);
                done();
            });
        });
        it('should create the attribute with the "_status" prefix in the Context Broker', function(done) {
            iotAgentLib.setCommandHandler(function(id, type, service, subservice, attributes, callback) {
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
                statusAttributeMock.done();
                done();
            });
        });
        it('should create the attribute with the "_status" prefix in the Context Broker', function(done) {
            var serviceAndSubservice = false;

            iotAgentLib.setCommandHandler(function(id, type, service, subservice, attributes, callback) {
                serviceAndSubservice = service === 'smartGondor' && subservice === 'gardens';
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
                serviceAndSubservice.should.equal(true);
                done();
            });
        });
    });
    describe('When an update arrives from the south bound for a registered command', function() {
        beforeEach(function(done) {
            statusAttributeMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext',
                utils.readExampleFile('./test/unit/examples/contextRequests/updateContextCommandFinish.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/examples/contextResponses/updateContextCommandFinishSuccess.json'));

            iotAgentLib.register(device3, function(error) {
                done();
            });
        });

        it('should update its value and status in the Context Broker', function(done) {
            iotAgentLib.setCommandResult('r2d2', 'Robot', '', 'position', '[72, 368, 1]', 'FINISHED',
                function(error) {
                    should.not.exist(error);
                    statusAttributeMock.done();
                    done();
                });
        });
    });
    describe('When an error command arrives from the south bound for a registered command', function() {
        beforeEach(function(done) {
            statusAttributeMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext',
                utils.readExampleFile('./test/unit/examples/contextRequests/updateContextCommandError.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/examples/contextResponses/updateContextCommandStatusSuccess.json'));

            iotAgentLib.register(device3, function(error) {
                done();
            });
        });

        it('should update its status in the Context Broker', function(done) {
            iotAgentLib.setCommandResult('r2d2', 'Robot', '', 'position', 'Stalled', 'ERROR',
                function(error) {
                    should.not.exist(error);
                    statusAttributeMock.done();
                    done();
                });
        });
    });
});
