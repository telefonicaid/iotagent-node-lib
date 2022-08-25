/*
 * Copyright 2022 Telefonica Investigación y Desarrollo, S.A.U
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
 *
 * Modified by: Jason Fox - FIWARE Foundation
 */

/* eslint-disable no-unused-vars */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const utils = require('../../../tools/utils');
const request = utils.request;
const should = require('should');
const nock = require('nock');

let contextBrokerMock;
const iotAgentConfig = {
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'ld',
        jsonLdContext: 'http://context.json-ld'
    },
    server: {
        port: 4041
    },
    types: {},
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com'
};


const iotAgentConfigWithLimitedSupport = {
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'ld',
        jsonLdContext: 'http://context.json-ld'
    },
    server: {
        port: 4041,
        ldSupport : {
           null: false,
           datasetId: false
       }
    },
    types: {
        Robot: {
            commands: [
                {
                    name: 'position',
                    type: 'Array'
                },
                {
                    name: 'orientation',
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
    providerUrl: 'http://smartgondor.com'
};

const device = {
    id: 'r2d2',
    type: 'Robot',
    service: 'smartgondor'
};


describe('NGSI-LD - Unsupported Endpoints', function () {
    beforeEach(function (done) {
        iotAgentLib.activate(iotAgentConfig, function () {
            iotAgentLib.clearAll(function () {
                done();
            });
        });
    });

    afterEach(function (done) {
        iotAgentLib.clearAll(function () {
            iotAgentLib.deactivate(done);
        });
    });

    describe('When accessing an Unsupported Endpoint', function () {
        it('GET /entities should return a valid NSGI-LD error message', function (done) {
            const options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/ngsi-ld/v1/entities',
                method: 'GET'
            };
            request(options, function (error, response, body) {
                response.statusCode.should.equal(501);
                done();
            });
        });
        it('POST /entities should return a valid NSGI-LD error message', function (done) {
            const options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/ngsi-ld/v1/entities',
                method: 'POST',
                json: {}
            };
            request(options, function (error, response, body) {
                response.statusCode.should.equal(501);
                done();
            });
        });
        it('DELETE /entities/<entity-id> should return a valid NSGI-LD error message', function (done) {
            const options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/ngsi-ld/v1/entities/urn:ngsi-ld:entity',
                method: 'DELETE'
            };
            request(options, function (error, response, body) {
                response.statusCode.should.equal(501);
                done();
            });
        });
        it('DELETE /entities/<entity-id>/attrs/<attr-name> should return a valid NSGI-LD error message', function (done) {
            const options = {
                url:
                    'http://localhost:' +
                    iotAgentConfig.server.port +
                    '/ngsi-ld/v1/entities/urn:ngsi-ld:entity/attrs/att',
                method: 'DELETE'
            };
            request(options, function (error, response, body) {
                response.statusCode.should.equal(501);
                done();
            });
        });


        it('PUT /entities/<entity-id> includes an NGSI-LD Null should return a valid NSGI-LD error message', function (done) {
            const options = {
                url:
                    'http://localhost:' +
                    iotAgentConfig.server.port +
                    '/ngsi-ld/v1/entities/urn:ngsi-ld:entity/attrs/att',
                method: 'PUT',
                json: {
                    "value":  "urn:ngsi-ld:null"
                },
                headers: {
                    'fiware-service': 'smartgondor',
                    'content-type': 'application/ld+json'
                }
            };
            request(options, function (error, response, body) {
                response.statusCode.should.equal(400);
                done();
            });
        });
    });
});

describe('NGSI-LD - Limiting Support', function () {
    beforeEach(function (done) {
        contextBrokerMock = nock('http://192.168.1.1:1026')
            .matchHeader('fiware-service', 'smartgondor')
            .post(
                '/ngsi-ld/v1/csourceRegistrations/',
                utils.readExampleFile(
                    './test/unit/ngsi-ld/examples/contextAvailabilityRequests/registerIoTAgentCommands.json'
                )
            )
            .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

        contextBrokerMock
            .matchHeader('fiware-service', 'smartgondor')
            .post('/ngsi-ld/v1/entityOperations/upsert/')
            .reply(204);


        iotAgentLib.activate(iotAgentConfigWithLimitedSupport, function () {
            iotAgentLib.clearAll(function () {
                done();
            });
        });
    });

    afterEach(function (done) {
        iotAgentLib.clearAll(function () {
            iotAgentLib.deactivate(done);
        });
    });

    describe('When sending sending an NGSI-LD Null when nulls are unsupported', function () {
        it('should return a valid NSGI-LD error message', function (done) {
            const options = {
                url:
                    'http://localhost:' +
                    iotAgentConfig.server.port +
                    '/ngsi-ld/v1/entities/urn:ngsi-ld:Robot:r2d2/attrs/position',
                method: 'PATCH',
                json: {
                    "value":  "urn:ngsi-ld:null"
                },
                headers: {
                    'fiware-service': 'smartgondor',
                    'content-type': 'application/ld+json'
                }
            };

            iotAgentLib.setCommandHandler(function (id, type, service, subservice, attributes, callback) {
                callback(null, {});
            });

            iotAgentLib.register(device, function (error) {
                request(options, function (error, response, body) {
                    response.statusCode.should.equal(400);
                    done();
                });
            });

        });
    });   
    describe('When sending a payload including a datasetId when datasetIds are unsupported ', function () {
        it('should return a valid NSGI-LD error message', function (done) {
            const options = {
                url:
                    'http://localhost:' +
                    iotAgentConfig.server.port +
                    '/ngsi-ld/v1/entities/urn:ngsi-ld:Robot:r2d2/attrs/',
                method: 'PATCH',
                json: {
                    position: [
                        {
                            type: 'Property',
                            value: [1, 2, 3],
                            datasetId: 'urn:ngsi-ld:this'
                        },
                        {
                            type: 'Property',
                            value: [28, -104, 23],
                            datasetId: 'urn:ngsi-ld:that'
                        }
                    ]
                },
                headers: {
                    'fiware-service': 'smartgondor',
                    'content-type': 'application/ld+json'
                }
            };

            iotAgentLib.setCommandHandler(function (id, type, service, subservice, attributes, callback) {
                callback(null, {});
            });

            iotAgentLib.register(device, function (error) {
                request(options, function (error, response, body) {
                    response.statusCode.should.equal(400);
                    done();
                });
            });

        });
    });    
});
