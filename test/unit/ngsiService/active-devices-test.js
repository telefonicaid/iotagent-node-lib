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
    timekeeper = require('timekeeper'),
    should = require('should'),
    logger = require('logops'),
    nock = require('nock'),
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
            },
            'BrokenLight': {
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
                type: 'Termometer',
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
            'Humidity': {
                type: 'Humidity',
                cbHost: 'http://192.168.1.1:3024',
                commands: [],
                lazy: [],
                active: [
                    {
                        name: 'humidity',
                        type: 'percentage'
                    }
                ]
            },
            'Motion': {
                type: 'Motion',
                commands: [],
                lazy: [],
                staticAttributes: [
                    {
                        'name': 'location',
                        'type': 'Vector',
                        'value': '(123,523)'
                    }
                ],
                active: [
                    {
                        name: 'humidity',
                        type: 'percentage'
                    }
                ]
            }
        },
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    };

describe('Active attributes test', function() {
    var values = [
        {
            name: 'state',
            type: 'Boolean',
            value: 'true'
        },
        {
            name: 'dimming',
            type: 'Percentage',
            value: '87'
        }
    ];

    beforeEach(function() {
        logger.setLevel('FATAL');
    });

    afterEach(function(done) {
        iotAgentLib.deactivate(done);
    });

    describe('When the IoT Agent receives new information from a device', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext',
                    utils.readExampleFile('./test/unit/examples/contextRequests/updateContext1.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should change the value of the corresponding attribute in the context broker', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives new information from a device and the appendMode flag is on', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext',
                utils.readExampleFile('./test/unit/examples/contextRequests/updateContextAppendMode.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'));

            iotAgentConfig.appendMode = true;
            iotAgentLib.activate(iotAgentConfig, done);
        });

        afterEach(function(done) {
            iotAgentConfig.appendMode = false;

            done();
        });

        it('should change the value of the corresponding attribute in the context broker', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives new information and the timestamp flag is on', function() {
        var modifiedValues;

        beforeEach(function(done) {
            var time = new Date(1438760101468);

            modifiedValues = [
                {
                    name: 'state',
                    type: 'Boolean',
                    value: 'true'
                },
                {
                    name: 'dimming',
                    type: 'Percentage',
                    value: '87'
                }
            ];

            timekeeper.freeze(time);

            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext',
                    utils.readExampleFile('./test/unit/examples/contextRequests/updateContextTimestamp.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'));

            iotAgentConfig.timestamp = true;
            iotAgentLib.activate(iotAgentConfig, done);
        });

        afterEach(function(done) {
            delete iotAgentConfig.timestamp;
            timekeeper.reset();

            done();
        });

        it('should add the timestamp to the entity and all the attributes', function(done) {
            iotAgentLib.update('light1', 'Light', '', modifiedValues, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoTA gets a set of values with a TimeInstant and the timestamp flag is on', function() {
        var modifiedValues;

        beforeEach(function(done) {
            var time = new Date(1438760101468);

            modifiedValues = [
                {
                    name: 'state',
                    type: 'Boolean',
                    value: 'true'
                },
                {
                    name: 'TimeInstant',
                    type: 'ISO8601',
                    value: '2015-12-14T08:06:01.468Z'
                }
            ];

            timekeeper.freeze(time);

            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext',
                    utils.readExampleFile('./test/unit/examples/contextRequests/updateContextTimestampOverride.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'));

            iotAgentConfig.timestamp = true;
            iotAgentLib.activate(iotAgentConfig, done);
        });

        afterEach(function(done) {
            delete iotAgentConfig.timestamp;
            timekeeper.reset();

            done();
        });

        it('should not override the received instant and should not add metadatas for this request', function(done) {
            iotAgentLib.update('light1', 'Light', '', modifiedValues, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives information from a device whose type doesn\'t have a type name', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should fail with a 500 TYPE_NOT_FOUND error', function(done) {
            iotAgentLib.update('light1', 'BrokenLight', '', values, function(error) {
                should.exist(error);
                error.code.should.equal(500);
                error.name.should.equal('TYPE_NOT_FOUND');
                done();
            });
        });
    });

    describe('When the Context Broker returns an HTTP error code updating an entity', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext',
                    utils.readExampleFile('./test/unit/examples/contextRequests/updateContext1.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Failed.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should return ENTITY_GENERIC_ERROR an error to the caller', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.exist(error);
                should.exist(error.name);
                error.details.code.should.equal('413');
                error.details.details.should.equal('payload size: 1500000, max size supported: 1048576');
                error.details.reasonPhrase.should.equal('Request Entity Too Large');
                error.name.should.equal('ENTITY_GENERIC_ERROR');
                done();
            });
        });
    });

    describe('When the Context Broker returns an application error code updating an entity', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext',
                utils.readExampleFile('./test/unit/examples/contextRequests/updateContext1.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/examples/contextResponses/updateContext2Failed.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should return ENTITY_GENERIC_ERROR an error to the caller', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.exist(error);
                should.exist(error.name);
                error.name.should.equal('ENTITY_GENERIC_ERROR');
                done();
            });
        });
    });

    describe('When there is a transport error connecting to the Context Broker', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext',
                utils.readExampleFile('./test/unit/examples/contextRequests/updateContext1.json'))
                .reply(500,
                utils.readExampleFile('./test/unit/examples/contextResponses/updateContext2Failed.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should return a ENTITY_GENERIC_ERROR error to the caller', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.exist(error);
                should.exist(error.name);
                error.name.should.equal('ENTITY_GENERIC_ERROR');
                should.exist(error.details);
                should.exist(error.code);
                error.code.should.equal(500);
                done();
            });
        });
    });

    describe('When the IoT Agent recieves information for a type with a configured Context Broker', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:3024')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext',
                utils.readExampleFile('./test/unit/examples/contextRequests/updateContext2.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should use the Context Broker defined by the type', function(done) {
            iotAgentLib.update('humSensor', 'Humidity', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an IoT Agent receives information for a type with static attributes', function() {
        var newValues = [
            {
                name: 'moving',
                type: 'Boolean',
                value: 'true'
            }
        ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext',
                utils.readExampleFile('./test/unit/examples/contextRequests/updateContextStaticAttributes.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });
        it('should decorate the entity with the static attributes', function(done) {
            iotAgentLib.update('motion1', 'Motion', '', newValues, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});
