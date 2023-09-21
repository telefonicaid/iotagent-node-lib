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
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 *
 * Modified by: Jason Fox - FIWARE Foundation
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
        ngsiVersion: 'ld',
        jsonLdContext: 'http://context.json-ld'
    },
    server: {
        port: 4041,
        host: 'localhost',
        ldSupport: {
            null: true,
            datasetId: false,
            merge: true
        }
    },
    types: {
        Robot: {
            internalAttributes: [],
            commands: [],
            lazy: [
                {
                    name: 'batteryLevel',
                    type: 'Object'
                }
            ],
            staticAttributes: [],
            active: []
        }
    },
    service: 'smartgondor',
    providerUrl: 'http://smartgondor.com'
};
const device3 = {
    id: 'r2d2',
    type: 'Robot',
    service: 'smartgondor',
    commands: [
        {
            name: 'position',
            object_id: 'pos',
            type: 'Object'
        },
        {
            name: 'orientation',
            type: 'Object'
        }
    ]
};

describe('NGSI-LD - Merge-Patch functionalities', function () {
    beforeEach(function (done) {
        const time = new Date(1438760101468); // 2015-08-05T07:35:01.468+00:00
        timekeeper.freeze(time);
        nock.cleanAll();

        contextBrokerMock = nock('http://192.168.1.1:1026')
            .matchHeader('fiware-service', 'smartgondor')
            .post(
                '/ngsi-ld/v1/csourceRegistrations/',
                utils.readExampleFile(
                    './test/unit/ngsi-ld/examples/contextAvailabilityRequests/registerIoTAgentCommandsAndLazy.json'
                )
            )
            .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

        contextBrokerMock
            .matchHeader('fiware-service', 'smartgondor')
            .post('/ngsi-ld/v1/entityOperations/upsert/')
            .reply(204);

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

    describe('When a merge-patch PATCH  arrives to the IoT Agent as Context Provider', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/ngsi-ld/v1/entities/urn:ngsi-ld:Robot:r2d2',
            method: 'PATCH',
            json: {
                position: {
                    type: 'Property',
                    value: {
                        moveTo: [12, 34],
                        observedAt: 'urn:ngsi-ld:null',
                        precision: {
                            value: 0.95,
                            unitCode: 'C62'
                        }
                    }
                },
                orientation: 'urn:ngsi-ld:null'
            },
            headers: {
                'fiware-service': 'smartgondor',
                'content-type': 'application/ld+json'
            }
        };

        beforeEach(function (done) {
            iotAgentLib.register(device3, function (error) {
                done();
            });
        });

        it('should call the client handler once', function (done) {
            let handlerCalled = 0;

            iotAgentLib.setMergePatchHandler(function (id, type, service, subservice, attributes, callback) {
                id.should.equal('urn:ngsi-ld:' + device3.type + ':' + device3.id);
                type.should.equal(device3.type);
                attributes[0].name.should.equal('position');
                attributes[1].name.should.equal('orientation');
                should.equal(attributes[1].value, null);
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
                response.statusCode.should.equal(200);
                handlerCalled.should.equal(1);
                done();
            });
        });
    });

    xdescribe('When a partial update PATCH with an NGSI-LD Null arrives to the IoT Agent as Context Provider', function () {
        const options = {
            url:
                'http://localhost:' +
                iotAgentConfig.server.port +
                '/ngsi-ld/v1/entities/urn:ngsi-ld:Robot:r2d2/attrs/position',
            method: 'PATCH',
            json: {
                type: 'Property',
                value: 'urn:ngsi-ld:null'
            },
            headers: {
                'fiware-service': 'smartgondor',
                'content-type': 'application/ld+json'
            }
        };

        beforeEach(function (done) {
            logger.setLevel('FATAL');
            iotAgentLib.register(device3, function (error) {
                done();
            });
        });

        it('should call the client handler once', function (done) {
            let handlerCalled = 0;

            iotAgentLib.setCommandHandler(function (id, type, service, subservice, attributes, callback) {
                id.should.equal('urn:ngsi-ld:' + device3.type + ':' + device3.id);
                type.should.equal(device3.type);
                attributes[0].name.should.equal('position');
                should.equal(attributes[0].value, null);
                handlerCalled++;
                callback(null, {
                    id,
                    type,
                    attributes: [
                        {
                            name: 'position',
                            type: 'Array',
                            value: null
                        }
                    ]
                });
            });

            request(options, function (error, response, body) {
                console.error(error);
                should.not.exist(error);

                response.statusCode.should.equal(204);
                handlerCalled.should.equal(1);
                done();
            });
        });
    });
});
