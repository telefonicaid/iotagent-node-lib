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
 *
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */

/* eslint-disable no-unused-vars */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const utils = require('../../../tools/utils');
const request = utils.request;
const should = require('should');
const logger = require('logops');
const nock = require('nock');
const mongoUtils = require('../../mongodb/mongoDBUtils');

const timekeeper = require('timekeeper');
let contextBrokerMock;
let statusAttributeMock;
const iotAgentConfig = {
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'v2'
    },
    server: {
        port: 4041,
        host: 'localhost'
    },
    types: {
        Light: {
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
        Termometer: {
            commands: [],
            lazy: [
                {
                    name: 'temp',
                    type: 'kelvin'
                }
            ],
            active: []
        },
        Motion: {
            commands: [],
            lazy: [
                {
                    name: 'moving',
                    type: 'Boolean'
                }
            ],
            staticAttributes: [
                {
                    name: 'location',
                    type: 'Vector',
                    value: '(123,523)'
                }
            ],
            active: []
        },
        Robot: {
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
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    useCBflowControl: true
};
const device3 = {
    id: 'r2d2',
    type: 'Robot',
    service: 'smartgondor',
    subservice: 'gardens'
};

describe('NGSI-v2 - Command functionalities', function () {
    beforeEach(function (done) {
        logger.setLevel('FATAL');
        const time = new Date(1438760101468); // 2015-08-05T07:35:01.468+00:00
        timekeeper.freeze(time);
        nock.cleanAll();

        contextBrokerMock = nock('http://192.168.1.1:1026')
            .matchHeader('fiware-service', 'smartgondor')
            .matchHeader('fiware-servicepath', 'gardens')
            .post(
                '/v2/registrations',
                utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgentCommands.json'
                )
            )
            .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

        iotAgentLib.activate(iotAgentConfig, done);
    });

    afterEach(function (done) {
        timekeeper.reset();
        delete device3.registrationId;
        iotAgentLib.clearAll(function () {
            iotAgentLib.deactivate(function () {
                mongoUtils.cleanDbs(function () {
                    nock.cleanAll();
                    iotAgentLib.setDataUpdateHandler();
                    iotAgentLib.setCommandHandler();
                    done();
                });
            });
        });
    });

    describe('When a device is preregistered with commands', function () {
        it('should register as Context Provider of the commands', function (done) {
            iotAgentLib.register(device3, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
    describe('When a command update arrives to the IoT Agent as Context Provider', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v2/op/update?options=flowControl',
            method: 'POST',
            json: {
                actionType: 'update',
                entities: [
                    {
                        id: 'Robot:r2d2',
                        type: 'Robot',
                        position: {
                            type: 'Array',
                            value: '[28, -104, 23]'
                        }
                    }
                ]
            },
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': 'gardens'
            }
        };

        beforeEach(function (done) {
            iotAgentLib.register(device3, function (error) {
                done();
            });
        });

        it('should call the client handler once', function (done) {
            let handlerCalled = 0;

            iotAgentLib.setCommandHandler(function (id, type, service, subservice, attributes, callback) {
                id.should.equal(device3.type + ':' + device3.id);
                type.should.equal(device3.type);
                attributes[0].name.should.equal('position');
                attributes[0].value.should.equal('[28, -104, 23]');
                handlerCalled++;
                callback(null, {
                    id,
                    type,
                    attributes: [
                        {
                            name: 'position',
                            type: 'Array',
                            value: '[28, -104, 23]'
                        }
                    ]
                });
            });

            request(options, function (error, response, body) {
                should.not.exist(error);
                handlerCalled.should.equal(1);
                done();
            });
        });
        it('should create the attribute with the "_status" prefix in the Context Broker', function (done) {
            iotAgentLib.setCommandHandler(function (id, type, service, subservice, attributes, callback) {
                callback(null, {
                    id,
                    type,
                    attributes: [
                        {
                            name: 'position',
                            type: 'Array',
                            value: '[28, -104, 23]'
                        }
                    ]
                });
            });

            request(options, function (error, response, body) {
                should.not.exist(error);
                done();
            });
        });
        it('should create the attribute with the "_status" prefix in the Context Broker', function (done) {
            let serviceAndSubservice = false;

            iotAgentLib.setCommandHandler(function (id, type, service, subservice, attributes, callback) {
                serviceAndSubservice = service === 'smartgondor' && subservice === 'gardens';
                callback(null, {
                    id,
                    type,
                    attributes: [
                        {
                            name: 'position',
                            type: 'Array',
                            value: '[28, -104, 23]'
                        }
                    ]
                });
            });

            request(options, function (error, response, body) {
                serviceAndSubservice.should.equal(true);
                done();
            });
        });
    });
    describe('When an update arrives from the south bound for a registered command', function () {
        beforeEach(function (done) {
            statusAttributeMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextRequests/updateContextCommandFinish.json')
                )
                .reply(204);

            iotAgentLib.register(device3, function (error) {
                done();
            });
        });

        it('should update its value and status in the Context Broker', function (done) {
            iotAgentLib.setCommandResult('r2d2', 'Robot', '', 'position', '[72, 368, 1]', 'FINISHED', function (error) {
                should.not.exist(error);
                statusAttributeMock.done();
                done();
            });
        });
    });
    describe('When an error command arrives from the south bound for a registered command', function () {
        beforeEach(function (done) {
            statusAttributeMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextRequests/updateContextCommandError.json')
                )
                .reply(204);

            iotAgentLib.register(device3, function (error) {
                done();
            });
        });

        it('should update its status in the Context Broker', function (done) {
            iotAgentLib.setCommandResult('r2d2', 'Robot', '', 'position', 'Stalled', 'ERROR', function (error) {
                should.not.exist(error);
                statusAttributeMock.done();
                done();
            });
        });
    });

    describe('When a command update with metadata arrives to the IoT Agent as Context Provider', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v2/op/update?options=flowControl',
            method: 'POST',
            json: {
                actionType: 'update',
                entities: [
                    {
                        id: 'Robot:r2d2',
                        type: 'Robot',
                        position: {
                            type: 'Array',
                            value: '[28, -104, 23]',
                            metadata: {
                                qos: 1
                            }
                        }
                    }
                ]
            },
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': 'gardens'
            }
        };

        beforeEach(function (done) {
            iotAgentLib.register(device3, function (error) {
                done();
            });
        });

        it('should call the client handler once including metadata', function (done) {
            let handlerCalled = 0;

            iotAgentLib.setCommandHandler(function (id, type, service, subservice, attributes, callback) {
                id.should.equal(device3.type + ':' + device3.id);
                type.should.equal(device3.type);
                attributes[0].name.should.equal('position');
                attributes[0].value.should.equal('[28, -104, 23]');
                attributes[0].metadata.qos.should.equal(1);
                handlerCalled++;
                callback(null, {
                    id,
                    type,
                    attributes: [
                        {
                            name: 'position',
                            type: 'Array',
                            value: '[28, -104, 23]'
                        }
                    ]
                });
            });

            request(options, function (error, response, body) {
                should.not.exist(error);
                handlerCalled.should.equal(1);
                done();
            });
        });
        it('should create the attribute with the "_status" prefix in the Context Broker', function (done) {
            iotAgentLib.setCommandHandler(function (id, type, service, subservice, attributes, callback) {
                callback(null, {
                    id,
                    type,
                    attributes: [
                        {
                            name: 'position',
                            type: 'Array',
                            value: '[28, -104, 23]'
                        }
                    ]
                });
            });

            request(options, function (error, response, body) {
                should.not.exist(error);
                done();
            });
        });
        it('should create the attribute with the "_status" prefix in the Context Broker', function (done) {
            let serviceAndSubservice = false;

            iotAgentLib.setCommandHandler(function (id, type, service, subservice, attributes, callback) {
                serviceAndSubservice = service === 'smartgondor' && subservice === 'gardens';
                callback(null, {
                    id,
                    type,
                    attributes: [
                        {
                            name: 'position',
                            type: 'Array',
                            value: '[28, -104, 23]'
                        }
                    ]
                });
            });

            request(options, function (error, response, body) {
                serviceAndSubservice.should.equal(true);
                done();
            });
        });
    });
});
