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
    async = require('async'),
    apply = async.apply,
    should = require('should'),
    logger = require('logops'),
    nock = require('nock'),
    mongoUtils = require('../mongodb/mongoDBUtils'),
    request = require('request'),
    contextBrokerMock,
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
            }
        },
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    },
    device1 = {
        id: 'light1',
        type: 'Light',
        service: 'smartGondor',
        subservice: 'gardens'
    },
    device2 = {
        id: 'motion1',
        type: 'Motion',
        service: 'smartGondor',
        subservice: 'gardens'
    };

describe('IoT Agent Lazy Devices', function() {
    beforeEach(function(done) {
        logger.setLevel('FATAL');
        mongoUtils.cleanDbs(done);

        iotAgentLib.setDataQueryHandler(null);
    });

    afterEach(function(done) {
        iotAgentLib.clearAll(function() {
            iotAgentLib.deactivate(function() {
                mongoUtils.cleanDbs(done);
            });
        });
    });

    describe('When the IoT Agent receives an update on the device data in JSON format', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/updateContext',
            method: 'POST',
            json: {
                contextElements: [
                    {
                        type: 'Light',
                        isPattern: 'false',
                        id: 'Light:light1',
                        attributes: [
                            {
                                name: 'dimming',
                                type: 'Percentage',
                                value: '12'
                            }
                        ]
                    }
                ],
                updateAction: 'APPEND'
            },
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': 'gardens'
            }
        };

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                    utils.readExampleFile('./test/unit/examples/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            async.series([
                apply(iotAgentLib.activate, iotAgentConfig),
                apply(iotAgentLib.register, device1)
            ], done);
        });

        it('should call the device handler with the received data', function(done) {
            var expectedResponse = utils
                .readExampleFile('./test/unit/examples/contextProviderResponses/updateInformationResponse.json');

            iotAgentLib.setDataUpdateHandler(function(id, type, service, subservice, attributes, callback) {
                id.should.equal(device1.type + ':' + device1.id);
                type.should.equal(device1.type);
                attributes[0].value.should.equal('12');
                callback(null);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });

    describe('When the IoT Agent receives an update on the device data in XML format', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/updateContext',
            method: 'POST',
            body: utils.readExampleFile('./test/unit/examples/contextRequests/updateContext.xml', true),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': 'gardens',
                'content-type': 'application/xml'
            }
        };

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            async.series([
                apply(iotAgentLib.activate, iotAgentConfig),
                apply(iotAgentLib.register, device1)
            ], done);
        });

        it('should call the device handler with the received data', function(done) {
            var handlerCalled = false;

            iotAgentLib.setDataUpdateHandler(function(id, type, service, subservice, attributes, callback) {
                id.should.equal(device1.type + ':' + device1.id);
                type.should.equal(device1.type);
                attributes[0].value.should.equal('12');
                handlerCalled = true;
                callback(null);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                handlerCalled.should.equal(true);
                done();
            });
        });

        it('should return the response in XML Format', function(done) {
            iotAgentLib.setDataUpdateHandler(function(id, type, service, subservice, attributes, callback) {
                callback(null);
            });

            request(options, function(error, response, body) {
                response.statusCode.should.equal(200);
                response.headers['content-type'].should.match(/application\/xml.*/);
                done();
            });
        });
    });

    describe('When the IoT Agent receives a query on the device data in XML format', function() {
        var options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/queryContext',
            method: 'POST',
            body: utils.readExampleFile('./test/unit/examples/contextRequests/queryLights.xml', true),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': 'gardens',
                'content-type': 'application/xml'
            }
        };

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            async.series([
                apply(iotAgentLib.activate, iotAgentConfig),
                apply(iotAgentLib.register, device1)
            ], done);
        });

        it('should call the device handler with the received data', function(done) {
            var handlerCalled = false;

            iotAgentLib.setDataQueryHandler(function(id, type, service, subservice, attributes, callback) {
                id.should.equal(device1.type + ':' + device1.id);
                type.should.equal(device1.type);
                attributes[0].should.equal('dimming');
                handlerCalled = true;
                callback(null, {
                        id: id,
                        type: type,
                        attributes: [
                            {
                                name: 'dimming',
                                type: 'string',
                                value: '89'
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

        it('should return the response in XML format', function(done) {
            var handlerCalled = false;

            iotAgentLib.setDataQueryHandler(
                function testQueryHandler(id, type, service, subservice, attributes, callback) {
                    handlerCalled = true;
                    callback(null, {
                        id: id,
                        type: type,
                        attributes: [
                                {
                                    name: 'dimming',
                                    type: 'string',
                                    value: '89'
                                }
                            ]
                        });
                });

            request(options, function(error, response, body) {
                should.not.exist(error);
                handlerCalled.should.equal(true);
                response.headers['content-type'].should.match(/application\/xml.*/);
                body.should.match(/<queryContextResponse>/);
                body.should.match(/<entityId type="Light" isPattern="false">/);
                body.should.match(/<name>dimming<\/name>/);
                done();
            });
        });
    });

    describe('When a IoT Agent receives an update on multiple contexts', function() {
        it('should call the device handler for each of the contexts');
    });

    describe('When a context query arrives to the IoT Agent', function() {
        var options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/queryContext',
                method: 'POST',
                json: {
                    entities: [
                        {
                            type: 'Light',
                            isPattern: 'false',
                            id: 'Light:light1'
                        }
                    ],
                    attributes: [
                        'dimming'
                    ]
                },
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiare-servicepath': 'gardens'
                }
            },
            sensorData = [
                {
                    id: 'Light:light1',
                    isPattern: false,
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

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            async.series([
                apply(iotAgentLib.activate, iotAgentConfig),
                apply(iotAgentLib.register, device1)
            ], done);
        });

        it('should return the information querying the underlying devices', function(done) {
            var expectedResponse = utils
                .readExampleFile('./test/unit/examples/contextProviderResponses/queryInformationResponse.json');

            iotAgentLib.setDataQueryHandler(function(id, type, service, subservice, attributes, callback) {
                id.should.equal(device1.type + ':' + device1.id);
                type.should.equal(device1.type);
                attributes[0].should.equal('dimming');
                callback(null, sensorData[0]);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });

    describe('When a context query arrives to the IoT Agent and no handler is set', function() {
        var options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/queryContext',
                method: 'POST',
                json: {
                    entities: [
                        {
                            type: 'Light',
                            isPattern: 'false',
                            id: 'Light:light1'
                        }
                    ],
                    attributes: [
                        'dimming'
                    ]
                },
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': 'gardens'
                }
            };

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext')
                .reply(200,
                    utils.readExampleFile(
                        './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            async.series([
                apply(iotAgentLib.activate, iotAgentConfig),
                apply(iotAgentLib.register, device1)
            ], function(error) {
                done();
            });
        });

        it('should not give any error', function(done) {
            request(options, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);
                done();
            });
        });

        it('should return the empty value', function(done) {
            request(options, function(error, response, body) {
                body.contextResponses[0].contextElement.attributes[0].name.should.equal('dimming');
                body.contextResponses[0].contextElement.attributes[0].value.should.equal('');
                done();
            });
        });
    });

    describe('When a query arrives to the IoT Agent without any attributes', function() {
        var options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/queryContext',
                method: 'POST',
                json: {
                    entities: [
                        {
                            type: 'Light',
                            isPattern: 'false',
                            id: 'Light:light1'
                        }
                    ]
                },
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': 'gardens'
                }
            },
            sensorData = [
                {
                    id: 'Light:light1',
                    isPattern: false,
                    type: 'Light',
                    attributes: [
                        {
                            name: 'temperature',
                            type: 'centigrades',
                            value: '19'
                        }
                    ]
                }
            ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            async.series([
                apply(iotAgentLib.activate, iotAgentConfig),
                apply(iotAgentLib.register, device1)
            ], done);
        });

        it('should return the information of all the attributes', function(done) {
            var expectedResponse = utils.readExampleFile(
                    './test/unit/examples/contextProviderResponses/queryInformationResponseEmptyAttributes.json');

            iotAgentLib.setDataQueryHandler(function(id, type, service, subservice, attributes, callback) {
                should.exist(attributes);
                attributes.length.should.equal(1);
                attributes[0].should.equal('temperature');
                callback(null, sensorData[0]);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });

    describe('When a query arrives to the IoT Agent with an empty attributes array', function() {
        var options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/queryContext',
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
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': 'gardens'
                }
            },
            sensorData = [
                {
                    id: 'Light:light1',
                    isPattern: false,
                    type: 'Light',
                    attributes: [
                        {
                            name: 'temperature',
                            type: 'centigrades',
                            value: '19'
                        }
                    ]
                }
            ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            async.series([
                apply(iotAgentLib.activate, iotAgentConfig),
                apply(iotAgentLib.register, device1)
            ], done);
        });

        it('should return the information of all the attributes', function(done) {
            var expectedResponse = utils.readExampleFile(
                './test/unit/examples/contextProviderResponses/queryInformationResponseEmptyAttributes.json');

            iotAgentLib.setDataQueryHandler(function(id, type, service, subservice, attributes, callback) {
                should.exist(attributes);
                attributes.length.should.equal(1);
                attributes[0].should.equal('temperature');
                callback(null, sensorData[0]);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });

    describe('When a context query arrives to the IoT Agent for a type with static attributes', function() {
        var options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/queryContext',
                method: 'POST',
                json: {
                    entities: [
                        {
                            type: 'Motion',
                            isPattern: 'false',
                            id: 'Motion:motion1'
                        }
                    ],
                    attributes: [
                        'moving',
                        'location'
                    ]
                },
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': 'gardens'
                }
            },
            sensorData = [
                {
                    id: 'Motion:motion1',
                    type: 'Motion',
                    attributes: [
                        {
                            name: 'moving',
                            type: 'Boolean',
                            value: 'true'
                        }
                    ]
                }
            ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent2.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            async.series([
                apply(iotAgentLib.activate, iotAgentConfig),
                apply(iotAgentLib.register, device2)
            ], done);
        });

        it('should return the information adding the static attributes', function(done) {
            var expectedResponse = utils.readExampleFile(
                './test/unit/examples/contextProviderResponses/queryInformationStaticAttributesResponse.json');

            iotAgentLib.setDataQueryHandler(function(id, type, service, subservice, attributes, callback) {
                id.should.equal('Motion:motion1');
                type.should.equal('Motion');
                attributes[0].should.equal('moving');
                attributes[1].should.equal('location');
                callback(null, sensorData[0]);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                body.should.eql(expectedResponse);
                done();
            });
        });
    });

    describe('When a context query arrives to the IoT Agent with a payload that is not XML nor JSON', function() {
        var options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/queryContext',
                method: 'POST',
                body: 'This is a body in text format',
                headers: {
                    'Content-Type': 'text/plain',
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': 'gardens'
                }
            },
            sensorData = [
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

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should fail with a 400 error', function(done) {
            var handlerCalled = false;

            iotAgentLib.setDataQueryHandler(function(id, type, service, subservice, attributes, callback) {
                handlerCalled = true;
                callback(null, sensorData);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                handlerCalled.should.equal(false);
                done();
            });
        });

        it('should return an NGSI compliant payload', function(done) {
            var handlerCalled = false;

            iotAgentLib.setDataQueryHandler(function(id, type, service, subservice, attributes, callback) {
                handlerCalled = true;
                callback(null, sensorData);
            });

            request(options, function(error, response, body) {
                var parsedBody = JSON.parse(body);
                should.exist(parsedBody.errorCode);
                parsedBody.errorCode.code.should.equal(400);
                parsedBody.errorCode.details.should.equal('Unsuported content type in the context request: text/plain');
                parsedBody.errorCode.reasonPhrase.should.equal('UNSUPPORTED_CONTENT_TYPE');

                done();
            });
        });
    });

    describe('When a context query arrives to the IoT Agent with an invalid body', function() {
        var options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/v1/queryContext',
                method: 'POST',
                json: {}
            },
            sensorData = [
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

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent1.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v1/updateContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should fail with a 400 error', function(done) {
            var handlerCalled = false;

            iotAgentLib.setDataQueryHandler(function(id, type, service, subservice, attributes, callback) {
                handlerCalled = true;
                callback(null, sensorData);
            });

            request(options, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                handlerCalled.should.equal(false);
                done();
            });
        });
    });
});
