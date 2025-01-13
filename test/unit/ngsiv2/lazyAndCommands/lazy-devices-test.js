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
const async = require('async');
const apply = async.apply;
const should = require('should');
const logger = require('logops');
const nock = require('nock');
const mongoUtils = require('../../mongodb/mongoDBUtils');

const timekeeper = require('timekeeper');
let contextBrokerMock;
const iotAgentConfig = {
    logLevel: 'FATAL',
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
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    useCBflowControl: true
};
const device1 = {
    id: 'light1',
    type: 'Light',
    service: 'smartgondor',
    subservice: 'gardens'
};
const device2 = {
    id: 'motion1',
    type: 'Motion',
    service: 'smartgondor',
    subservice: 'gardens'
};
const device3 = {
    id: 'TestRobotPre',
    type: 'RobotPre',
    service: 'smartgondor',
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

describe('NGSI-v2 - IoT Agent Lazy Devices', function () {
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
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v2/op/update?options=flowControl',
            method: 'POST',
            json: {
                actionType: 'update',
                entities: [
                    {
                        id: 'Light:light1',
                        type: 'Light',
                        dimming: {
                            type: 'Percentage',
                            value: 12
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
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent1.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(204);

            async.series([apply(iotAgentLib.activate, iotAgentConfig), apply(iotAgentLib.register, device1)], done);
        });

        it('should call the device handler with the received data', function (done) {
            iotAgentLib.setDataUpdateHandler(function (id, type, service, subservice, attributes, callback) {
                id.should.equal(device1.type + ':' + device1.id);
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
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v2/op/query',
            method: 'POST',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': 'gardens'
            },
            json: {
                entities: [
                    {
                        id: 'Light:light1'
                    }
                ],
                attrs: ['dimming']
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
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent1.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(204);

            async.series([apply(iotAgentLib.activate, iotAgentConfig), apply(iotAgentLib.register, device1)], done);
        });

        it('should return the information querying the underlying devices', function (done) {
            const expectedResponse = utils.readExampleFile(
                './test/unit/ngsiv2/examples/contextProviderResponses/queryInformationResponse.json'
            );

            iotAgentLib.setDataQueryHandler(function (id, type, service, subservice, attributes, callback) {
                id.should.equal(device1.type + ':' + device1.id);
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
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v2/op/query',
            method: 'POST',

            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': 'gardens'
            },
            json: {
                entities: [
                    {
                        id: 'Light:light1'
                    }
                ],
                attrs: ['dimming']
            }
        };

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent1.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(204);

            async.series(
                [apply(iotAgentLib.activate, iotAgentConfig), apply(iotAgentLib.register, device1)],
                function (error) {
                    done();
                }
            );
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
                entities[0].dimming.value.should.equal('');
                done();
            });
        });
    });

    describe('When a query arrives to the IoT Agent without any attributes', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v2/op/query',
            method: 'POST',

            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': 'gardens'
            },
            json: {
                entities: [
                    {
                        id: 'Light:light1'
                    }
                ]
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
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent1.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(204);

            async.series([apply(iotAgentLib.activate, iotAgentConfig), apply(iotAgentLib.register, device1)], done);
        });

        it('should return the information of all the attributes', function (done) {
            const expectedResponse = utils.readExampleFile(
                './test/unit/ngsiv2/examples/contextProviderResponses/queryInformationResponseEmptyAttributes.json'
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
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v2/op/query',
            method: 'POST',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': 'gardens'
            },
            json: {
                entities: [
                    {
                        id: 'Motion:motion1'
                    }
                ],
                attrs: ['moving', 'location']
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
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent2.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(204);

            async.series([apply(iotAgentLib.activate, iotAgentConfig), apply(iotAgentLib.register, device2)], done);
        });

        it('should return the information adding the static attributes', function (done) {
            const expectedResponse = utils.readExampleFile(
                './test/unit/ngsiv2/examples/contextProviderResponses/queryInformationStaticAttributesResponse.json'
            );

            iotAgentLib.setDataQueryHandler(function (id, type, service, subservice, attributes, callback) {
                id.should.equal('Motion:motion1');
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

    describe(
        'When the IoT Agent receives an update on the device data in JSON format for a type with' +
            'internalAttributes',
        function () {
            const options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/v2/op/update?options=flowControl',
                method: 'POST',
                json: {
                    actionType: 'update',
                    entities: [
                        {
                            id: 'RobotPre:TestRobotPre',
                            type: 'RobotPre',
                            moving: {
                                type: 'Boolean',
                                value: true
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
                nock.cleanAll();

                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartgondor')
                    .matchHeader('fiware-servicepath', 'gardens')
                    .post(
                        '/v2/registrations',
                        utils.readExampleFile(
                            './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent4.json'
                        )
                    )
                    .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

                contextBrokerMock
                    .matchHeader('fiware-service', 'smartgondor')
                    .matchHeader('fiware-servicepath', 'gardens')
                    .post('/v2/entities?options=upsert,flowControl')
                    .reply(204);

                async.series([apply(iotAgentLib.activate, iotAgentConfig), apply(iotAgentLib.register, device3)], done);
            });

            it('should call the device handler with the received data', function (done) {
                iotAgentLib.setDataUpdateHandler(function (id, type, service, subservice, attributes, callback) {
                    id.should.equal(device3.type + ':' + device3.id);
                    type.should.equal(device3.type);
                    attributes[0].value.should.equal(true);
                    callback(null);
                });

                request(options, function (error, response, body) {
                    should.not.exist(error);
                    response.statusCode.should.equal(204);
                    done();
                });
            });
        }
    );

    describe('When a context query arrives to the IoT Agent and id and type query params are not present', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v2/op/query',
            method: 'POST',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': 'gardens'
            },
            json: {
                entities: [
                    {
                        idPattern: '.*'
                    }
                ]
            }
        };

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent1.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent2.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent4.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl')
                .times(3)
                .reply(204);

            async.series(
                [
                    apply(iotAgentLib.activate, iotAgentConfig),
                    apply(iotAgentLib.register, device1),
                    apply(iotAgentLib.register, device2),
                    apply(iotAgentLib.register, device3)
                ],
                done
            );
        });

        it('should return error as idPattern is not supported', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.error.should.equal('BadRequest');
                body.description.should.equal('idPattern usage in query');
                done();
            });
        });
    });

    describe('When a context query arrives to the IoT Agent and id query param is not present', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v2/op/query',
            method: 'POST',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': 'gardens'
            },
            json: {
                entities: [
                    {
                        idPattern: '.*',
                        type: 'Light'
                    }
                ]
            }
        };

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent1.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent2.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent4.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl')
                .times(3)
                .reply(204);

            async.series(
                [
                    apply(iotAgentLib.activate, iotAgentConfig),
                    apply(iotAgentLib.register, device1),
                    apply(iotAgentLib.register, device2),
                    apply(iotAgentLib.register, device3)
                ],
                done
            );
        });

        it('should return error as idPattern is not supported', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.error.should.equal('BadRequest');
                body.description.should.equal('idPattern usage in query');
                done();
            });
        });
    });

    describe('When a query arrives to the IoT Agent with id, type and attributes', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v2/op/query',
            method: 'POST',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': 'gardens'
            },
            json: {
                entities: [
                    {
                        id: 'Light:light1',
                        type: 'Light'
                    }
                ],
                attrs: ['temperature']
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
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent1.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(204);

            async.series([apply(iotAgentLib.activate, iotAgentConfig), apply(iotAgentLib.register, device1)], done);
        });

        it('should return the information of all the attributes', function (done) {
            const expectedResponse = utils.readExampleFile(
                './test/unit/ngsiv2/examples/contextProviderResponses/queryInformationResponseEmptyAttributes.json'
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

    describe('When a context query arrives to the IoT Agent with an invalid body', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v2/op/query',
            method: 'POST',
            json: {}
        };
        const sensorData = [
            {
                id: 'Light:light1',
                type: 'Light',
                attributes: [
                    {
                        name: 'dimming',
                        type: 'Percentage',
                        value: '19'
                    }
                ]
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent1.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should fail with a 400 error', function (done) {
            let handlerCalled = false;

            iotAgentLib.setDataQueryHandler(function (id, type, service, subservice, attributes, callback) {
                handlerCalled = true;
                callback(null, sensorData);
            });

            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                handlerCalled.should.equal(false);
                done();
            });
        });
    });

    describe('When a context query arrives to the IoT Agent with a payload that is not JSON', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v2/op/query',
            method: 'POST',
            body: 'This is a body in text format',
            headers: {
                'Content-Type': 'text/plain',
                'fiware-service': 'smartgondor',
                'fiware-servicepath': 'gardens'
            }
        };
        const sensorData = [
            {
                id: 'Light:light1',
                type: 'Light',
                attributes: [
                    {
                        name: 'dimming',
                        type: 'Percentage',
                        value: '19'
                    }
                ]
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent1.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should fail with a 400 error', function (done) {
            let handlerCalled = false;

            iotAgentLib.setDataQueryHandler(function (id, type, service, subservice, attributes, callback) {
                handlerCalled = true;
                callback(null, sensorData);
            });

            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                handlerCalled.should.equal(false);
                done();
            });
        });
    });

    describe('When a query arrives to the IoT Agent with an empty attributes array', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v2/op/query',
            method: 'POST',
            json: {
                entities: [
                    {
                        type: 'Light',
                        isPattern: 'false',
                        id: 'Light:light1'
                    }
                ],
                attributes: []
            },
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': 'gardens'
            }
        };
        const sensorData = [
            {
                id: 'Light:light1',
                type: 'Light',
                temperature: { type: 'centigrades', value: 19 }
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent1.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(204);

            async.series([apply(iotAgentLib.activate, iotAgentConfig), apply(iotAgentLib.register, device1)], done);
        });

        it('should return the information of all the attributes', function (done) {
            const expectedResponse = utils.readExampleFile(
                './test/unit/ngsiv2/examples/contextProviderResponses/queryInformationResponseEmptyAttributes.json'
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

    describe('When a context query arrives to the IoT Agent with a payload that is not JSON', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v2/op/query',
            method: 'POST',
            body: 'This is a body in text format',
            headers: {
                'Content-Type': 'text/plain',
                'fiware-service': 'smartgondor',
                'fiware-servicepath': 'gardens'
            }
        };
        const sensorData = [
            {
                id: 'Light:light1',
                type: 'Light',
                attributes: [
                    {
                        name: 'dimming',
                        type: 'Percentage',
                        value: '19'
                    }
                ]
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent1.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should fail with a 400 error', function (done) {
            let handlerCalled = false;

            iotAgentLib.setDataQueryHandler(function (id, type, service, subservice, attributes, callback) {
                handlerCalled = true;
                callback(null, sensorData);
            });

            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                handlerCalled.should.equal(false);
                done();
            });
        });

        it('should return an NGSI compliant payload', function (done) {
            let handlerCalled = false;

            iotAgentLib.setDataQueryHandler(function (id, type, service, subservice, attributes, callback) {
                handlerCalled = true;
                callback(null, sensorData);
            });

            request(options, function (error, response, body) {
                body.error.should.equal('UNSUPPORTED_CONTENT_TYPE');
                body.description.should.equal('Unsupported content type in the context request: text/plain');
                done();
            });
        });
    });
});
