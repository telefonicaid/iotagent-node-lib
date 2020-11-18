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
const async = require('async');
const apply = async.apply;
const should = require('should');
const logger = require('logops');
const nock = require('nock');
const mongoUtils = require('../../mongodb/mongoDBUtils');
const request = require('request');
const timekeeper = require('timekeeper');
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
        RobotPre: {
            commands: [],
            lazy: [
                {
                    name: 'moving',
                    type: 'Boolean'
                }
            ],
            staticAttributes: [],
            attributes: [],
            internalAttributes: {
                lwm2mResourceMapping: {
                    position: {
                        objectType: 9090,
                        objectInstance: 0,
                        objectResource: 0
                    }
                }
            }
        }
    },
    service: 'smartGondor',
    subservice: 'gardens',
    providerUrl: 'http://smartGondor.com'
};
const device1 = {
    id: 'light1',
    type: 'Light',
    service: 'smartGondor',
    subservice: 'gardens'
};
const device2 = {
    id: 'motion1',
    type: 'Motion',
    service: 'smartGondor',
    subservice: 'gardens'
};
const device3 = {
    id: 'TestRobotPre',
    type: 'RobotPre',
    service: 'smartGondor',
    subservice: 'gardens',
    internalAttributes: {
        lwm2mResourceMapping: {
            position: {
                objectType: 6789,
                objectInstance: 0,
                objectResource: 17
            }
        }
    }
};

describe('NGSI-LD - IoT Agent Lazy Devices', function () {
    beforeEach(function (done) {
        logger.setLevel('FATAL');

        const time = new Date(1438760101468); // 2015-08-05T07:35:01.468+00:00
        timekeeper.freeze(time);
        mongoUtils.cleanDbs(done);

        iotAgentLib.setDataQueryHandler(null);
    });

    afterEach(function (done) {
        timekeeper.reset();
        delete device1.registrationId;
        delete device2.registrationId;
        delete device3.registrationId;

        iotAgentLib.clearAll(function () {
            iotAgentLib.deactivate(function () {
                mongoUtils.cleanDbs(done);
            });
        });
    });

    describe('When the IoT Agent receives an update on the device data in JSON format', function () {
        const options = {
            url:
                'http://localhost:' +
                iotAgentConfig.server.port +
                '/ngsi-ld/v1/entities/urn:ngsi-ld:Light:light1/attrs/dimming',
            method: 'PATCH',
            json: {
                type: 'Percentage',
                value: 12
            },
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': 'gardens'
            }
        };

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/csourceRegistrations/',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextAvailabilityRequests/registerIoTAgent1.json'
                    )
                )
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post('/ngsi-ld/v1/entityOperations/upsert/')
                .reply(204);

            async.series([apply(iotAgentLib.activate, iotAgentConfig), apply(iotAgentLib.register, device1)], done);
        });

        it('should call the device handler with the received data', function (done) {
            iotAgentLib.setDataUpdateHandler(function (id, type, service, subservice, attributes, callback) {
                id.should.equal('urn:ngsi-ld:' + device1.type + ':' + device1.id);
                type.should.equal(device1.type);
                attributes[0].value.should.equal(12);
                callback(null);
            });

            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(204);
                done();
            });
        });
    });

    describe('When a IoT Agent receives an update on multiple contexts', function () {
        it('should call the device handler for each of the contexts');
    });

    describe('When a context query arrives to the IoT Agent', function () {
        const options = {
            url:
                'http://localhost:' +
                iotAgentConfig.server.port +
                '/ngsi-ld/v1/entities/urn:ngsi-ld:Light:light1?attrs=dimming',
            method: 'GET',
            json: true,
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': 'gardens'
            }
        };
        const sensorData = [
            {
                id: 'Light:light1',
                type: 'Light',
                dimming: {
                    type: 'Percentage',
                    value: 19
                }
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/csourceRegistrations/',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextAvailabilityRequests/registerIoTAgent1.json'
                    )
                )
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post('/ngsi-ld/v1/entityOperations/upsert/')
                .reply(204);

            async.series([apply(iotAgentLib.activate, iotAgentConfig), apply(iotAgentLib.register, device1)], done);
        });

        it('should return the information querying the underlying devices', function (done) {
            const expectedResponse = utils.readExampleFile(
                './test/unit/ngsi-ld/examples/contextProviderResponses/queryInformationResponse.json'
            );

            iotAgentLib.setDataUpdateHandler(function (id, type, service, subservice, attributes, callback) {
                callback(null);
            });

            iotAgentLib.setDataQueryHandler(function (id, type, service, subservice, attributes, callback) {
                id.should.equal('urn:ngsi-ld:' + device1.type + ':' + device1.id);
                type.should.equal(device1.type);
                attributes[0].should.equal('dimming');
                callback(null, sensorData[0]);
            });

            request(options, function (error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });

    describe('When a context query arrives to the IoT Agent and no handler is set', function () {
        const options = {
            url:
                'http://localhost:' +
                iotAgentConfig.server.port +
                '/ngsi-ld/v1/entities/urn:ngsi-ld:Light:light1?attrs=dimming',
            method: 'GET',
            json: true,
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': 'gardens'
            }
        };

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/csourceRegistrations/',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextAvailabilityRequests/registerIoTAgent1.json'
                    )
                )
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post('/ngsi-ld/v1/entityOperations/upsert/')
                .reply(204);

            async.series([apply(iotAgentLib.activate, iotAgentConfig), apply(iotAgentLib.register, device1)], function (
                error
            ) {
                done();
            });
        });

        it('should not give any error', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);
                done();
            });
        });

        it('should return the empty value', function (done) {
            request(options, function (error, response, body) {
                const entities = body;
                entities.dimming.value.should.equal('');
                done();
            });
        });
    });

    describe('When a query arrives to the IoT Agent without any attributes', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/ngsi-ld/v1/entities/urn:ngsi-ld:Light:light1',
            method: 'GET',
            json: true,
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': 'gardens'
            }
        };
        const sensorData = [
            {
                id: 'Light:light1',
                type: 'Light',
                temperature: {
                    type: 'centigrades',
                    value: 19
                }
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/csourceRegistrations/',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextAvailabilityRequests/registerIoTAgent1.json'
                    )
                )
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post('/ngsi-ld/v1/entityOperations/upsert/')
                .reply(204);

            async.series([apply(iotAgentLib.activate, iotAgentConfig), apply(iotAgentLib.register, device1)], done);
        });

        it('should return the information of all the attributes', function (done) {
            const expectedResponse = utils.readExampleFile(
                './test/unit/ngsi-ld/examples/contextProviderResponses/' +
                    'queryInformationResponseEmptyAttributes.json'
            );

            iotAgentLib.setDataQueryHandler(function (id, type, service, subservice, attributes, callback) {
                should.exist(attributes);
                attributes.length.should.equal(1);
                attributes[0].should.equal('temperature');
                callback(null, sensorData[0]);
            });

            request(options, function (error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });

    describe('When a context query arrives to the IoT Agent for a type with static attributes', function () {
        const options = {
            url:
                'http://localhost:' +
                iotAgentConfig.server.port +
                '/ngsi-ld/v1/entities/urn:ngsi-ld:Motion:motion1?attrs=moving,location',
            method: 'GET',
            json: true,
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': 'gardens'
            }
        };
        const sensorData = [
            {
                id: 'Motion:motion1',
                type: 'Motion',
                moving: {
                    type: 'Boolean',
                    value: true
                }
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/csourceRegistrations/',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextAvailabilityRequests/registerIoTAgent2.json'
                    )
                )
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post('/ngsi-ld/v1/entityOperations/upsert/')
                .reply(204);

            async.series([apply(iotAgentLib.activate, iotAgentConfig), apply(iotAgentLib.register, device2)], done);
        });

        it('should return the information adding the static attributes', function (done) {
            const expectedResponse = utils.readExampleFile(
                './test/unit/ngsi-ld/examples/contextProviderResponses/queryInformationStaticAttributesResponse.json'
            );

            iotAgentLib.setDataQueryHandler(function (id, type, service, subservice, attributes, callback) {
                id.should.equal('urn:ngsi-ld:Motion:motion1');
                type.should.equal('Motion');
                attributes[0].should.equal('moving');
                attributes[1].should.equal('location');
                callback(null, sensorData[0]);
            });

            request(options, function (error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });

    describe('When a query arrives to the IoT Agent with id, type and attributes', function () {
        const options = {
            url:
                'http://localhost:' +
                iotAgentConfig.server.port +
                '/ngsi-ld/v1/entities/urn:ngsi-ld:Light:light1?attrs=temperature',
            method: 'GET',
            json: true,
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': 'gardens'
            }
        };
        const sensorData = [
            {
                id: 'Light:light1',
                type: 'Light',
                temperature: {
                    type: 'centigrades',
                    value: 19
                }
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/csourceRegistrations/',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextAvailabilityRequests/registerIoTAgent1.json'
                    )
                )
                .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post('/ngsi-ld/v1/entityOperations/upsert/')
                .reply(204);

            async.series([apply(iotAgentLib.activate, iotAgentConfig), apply(iotAgentLib.register, device1)], done);
        });

        it('should return the information of all the attributes', function (done) {
            const expectedResponse = utils.readExampleFile(
                './test/unit/ngsi-ld/examples/contextProviderResponses/' +
                    'queryInformationResponseEmptyAttributes.json'
            );

            iotAgentLib.setDataQueryHandler(function (id, type, service, subservice, attributes, callback) {
                should.exist(attributes);
                attributes.length.should.equal(1);
                attributes[0].should.equal('temperature');
                callback(null, sensorData[0]);
            });

            request(options, function (error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });
});
