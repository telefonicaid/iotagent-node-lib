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
 * If not, see http://www.gnu.org/licenses/.
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
const timekeeper = require('timekeeper');
const should = require('should');
const logger = require('logops');
const nock = require('nock');
let contextBrokerMock;
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
        LightNoTimestamp: {
            commands: [],
            type: 'Light',
            lazy: [
                {
                    name: 'temperature',
                    type: 'centigrades'
                }
            ],
            timestamp: false,
            active: [
                {
                    name: 'pressure',
                    type: 'Hgmm'
                }
            ]
        },
        BrokenLight: {
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
            type: 'Termometer',
            commands: [],
            lazy: [
                {
                    name: 'temp',
                    type: 'kelvin'
                }
            ],
            active: []
        },
        Humidity: {
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
        Motion: {
            type: 'Motion',
            commands: [],
            lazy: [],
            staticAttributes: [
                {
                    name: 'location',
                    type: 'geo:point',
                    value: '153,523'
                }
            ],
            active: [
                {
                    name: 'humidity',
                    type: 'percentage'
                }
            ]
        },
        Lamp: {
            type: 'Lamp',
            commands: [],
            lazy: [],
            staticAttributes: [
                {
                    name: 'controlledProperty',
                    type: 'text',
                    value: 'StaticValue',
                    metadata: {
                        includes: { type: 'Text', value: 'bell' }
                    }
                }
            ],
            active: [
                {
                    name: 'luminosity',
                    type: 'text',
                    metadata: {
                        unitCode: { type: 'Text', value: 'CAL' }
                    }
                }
            ]
        },
        StupidDevice: {
            type: 'StupidDevice',
            commands: [],
            lazy: [],
            staticAttributes: [],
            active: [
                {
                    name: 'type',
                    object_id: 't',
                    type: 'text'
                },
                {
                    name: 'id',
                    object_id: 'i',
                    type: 'text'
                },
                {
                    name: 'meas',
                    object_id: 'm',
                    type: 'String'
                }
            ]
        },
        StupidDevice2: {
            type: 'StupidDevice2',
            commands: [],
            lazy: [],
            staticAttributes: [],
            active: [
                {
                    name: 'type',
                    object_id: 'type',
                    type: 'text'
                },
                {
                    name: 'id',
                    object_id: 'id',
                    type: 'text'
                },
                {
                    name: 'meas',
                    object_id: 'meas',
                    type: 'String'
                }
            ]
        }
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    useCBflowControl: true
};

describe('NGSI-v2 - Active attributes test', function () {
    const values = [
        {
            name: 'state',
            type: 'boolean',
            value: true
        },
        {
            name: 'dimming',
            type: 'number',
            value: 87
        }
    ];

    beforeEach(function () {
        logger.setLevel('FATAL');
    });

    afterEach(function (done) {
        iotAgentLib.deactivate(done);
    });

    describe('When the IoT Agent receives new information from a device', function () {
        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextRequests/updateContext.json')
                )
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should change the value of the corresponding attribute in the context broker', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives new information and the timestamp flag is on', function () {
        let modifiedValues;

        beforeEach(function (done) {
            const time = new Date(1438760101468); // 2015-08-05T07:35:01.468+00:00

            modifiedValues = [
                {
                    name: 'state',
                    type: 'boolean',
                    value: true
                },
                {
                    name: 'dimming',
                    type: 'number',
                    value: 87
                }
            ];

            timekeeper.freeze(time);

            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextRequests/updateContextTimestamp.json')
                )
                .reply(204);

            iotAgentConfig.timestamp = true;
            iotAgentLib.activate(iotAgentConfig, done);
        });

        afterEach(function (done) {
            delete iotAgentConfig.timestamp;
            timekeeper.reset();

            done();
        });

        it('should add the timestamp to the entity and all the attributes', function (done) {
            iotAgentLib.update('light1', 'Light', '', modifiedValues, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives new information and the timestamp flag is false', function () {
        let modifiedValues;

        beforeEach(function (done) {
            modifiedValues = [
                {
                    name: 'state',
                    type: 'boolean',
                    value: true
                },
                {
                    name: 'dimming',
                    type: 'number',
                    value: 87
                }
            ];

            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextTimestampFalse.json'
                    )
                )
                .reply(204);

            iotAgentConfig.timestamp = false;
            iotAgentLib.activate(iotAgentConfig, done);
        });

        afterEach(function (done) {
            delete iotAgentConfig.timestamp;

            done();
        });

        it('should not add the timestamp to the entity and the attributes', function (done) {
            iotAgentLib.update('lightNoTimestamp1', 'LightNoTimestamp', '', modifiedValues, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives new information and the timestamp flag is false but the measure contains timeInstant', function () {
        let modifiedValues;

        beforeEach(function (done) {
            const time = new Date(1438760101468); // 2015-08-05T07:35:01.468+00:00

            modifiedValues = [
                {
                    name: 'state',
                    type: 'boolean',
                    value: true
                },
                {
                    name: 'TimeInstant',
                    type: 'DateTime',
                    value: '2015-12-14T08:06:01.468Z'
                }
            ];

            timekeeper.freeze(time);
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextTimestampFalseTimeInstant.json'
                    )
                )
                .reply(204);

            iotAgentConfig.timestamp = false;
            iotAgentLib.activate(iotAgentConfig, done);
        });

        afterEach(function (done) {
            delete iotAgentConfig.timestamp;
            timekeeper.reset();

            done();
        });

        it('should add the timestamp attribute to the entity but not as attribute metadata', function (done) {
            iotAgentLib.update('lightNoTimestamp1', 'LightNoTimestamp', '', modifiedValues, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoTA gets a set of values with a TimeInstant which are not in ISO8601 format', function () {
        let modifiedValues;

        beforeEach(function (done) {
            modifiedValues = [
                {
                    name: 'state',
                    type: 'Boolean',
                    value: 'true'
                },
                {
                    name: 'TimeInstant',
                    type: 'ISO8601',
                    value: '2018-10-05T11:03:56 00:00Z'
                }
            ];

            nock.cleanAll();

            iotAgentConfig.timestamp = true;
            iotAgentLib.activate(iotAgentConfig, done);
        });

        afterEach(function (done) {
            delete iotAgentConfig.timestamp;
            done();
        });

        it('should fail with a 400 BAD_TIMESTAMP error', function (done) {
            iotAgentLib.update('light1', 'Light', '', modifiedValues, function (error) {
                should.exist(error);
                error.code.should.equal(400);
                error.name.should.equal('BAD_TIMESTAMP');
                done();
            });
        });
    });

    describe('When the IoTA gets a set of values with a TimeInstant which are in ISO8601 format without milis', function () {
        let modifiedValues;

        beforeEach(function (done) {
            const time = new Date(1666477342000); // 2022-10-22T22:22:22Z

            modifiedValues = [
                {
                    name: 'state',
                    type: 'boolean',
                    value: true
                },
                {
                    name: 'TimeInstant',
                    type: 'DateTime',
                    value: '2022-10-22T22:22:22Z'
                }
            ];

            timekeeper.freeze(time);

            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextTimestampOverrideWithoutMilis.json'
                    )
                )
                .reply(204);

            iotAgentConfig.timestamp = true;
            iotAgentLib.activate(iotAgentConfig, done);
        });

        afterEach(function (done) {
            delete iotAgentConfig.timestamp;
            timekeeper.reset();

            done();
        });

        it('should not fail', function (done) {
            iotAgentLib.update('light1', 'Light', '', modifiedValues, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives new information, the timestamp flag is on and timezone is defined', function () {
        let modifiedValues;

        beforeEach(function (done) {
            const time = new Date(1438760101468); // 2015-08-05T07:35:01.468+00:00

            modifiedValues = [
                {
                    name: 'state',
                    type: 'boolean',
                    value: true
                },
                {
                    name: 'dimming',
                    type: 'number',
                    value: 87
                }
            ];

            timekeeper.freeze(time);

            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextTimestampTimezone.json'
                    )
                )
                .reply(204);

            iotAgentConfig.timestamp = true;
            iotAgentConfig.types.Light.timezone = 'America/Los_Angeles';
            iotAgentLib.activate(iotAgentConfig, done);
        });

        afterEach(function (done) {
            delete iotAgentConfig.timestamp;
            delete iotAgentConfig.types.Light.timezone;
            timekeeper.reset();

            done();
        });

        it('should add the timestamp to the entity and all the attributes', function (done) {
            iotAgentLib.update('light1', 'Light', '', modifiedValues, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoTA gets a set of values with a TimeInstant and the timestamp flag is on', function () {
        let modifiedValues;

        beforeEach(function (done) {
            const time = new Date(1438760101468); // 2015-08-05T07:35:01.468+00:00

            modifiedValues = [
                {
                    name: 'state',
                    type: 'boolean',
                    value: true
                },
                {
                    name: 'TimeInstant',
                    type: 'DateTime',
                    value: '2015-12-14T08:06:01.468Z'
                }
            ];

            timekeeper.freeze(time);

            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextTimestampOverride.json'
                    )
                )
                .reply(204);

            iotAgentConfig.timestamp = true;
            iotAgentLib.activate(iotAgentConfig, done);
        });

        afterEach(function (done) {
            delete iotAgentConfig.timestamp;
            timekeeper.reset();

            done();
        });

        it('should not override the received instant and should add metadatas for this request', function (done) {
            iotAgentLib.update('light1', 'Light', '', modifiedValues, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoTA gets a set of values with a TimeInstant, the timestamp flag is onand timezone is defined', function () {
        let modifiedValues;

        beforeEach(function (done) {
            const time = new Date(1438760101468); // 2015-08-05T07:35:01.468+00:00

            modifiedValues = [
                {
                    name: 'state',
                    type: 'boolean',
                    value: true
                },
                {
                    name: 'TimeInstant',
                    type: 'DateTime',
                    value: '2015-12-14T08:06:01.468Z'
                }
            ];

            timekeeper.freeze(time);

            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextTimestampOverride.json'
                    )
                )
                .reply(204);

            iotAgentConfig.timestamp = true;
            iotAgentConfig.types.Light.timezone = 'America/Los_Angeles';
            iotAgentLib.activate(iotAgentConfig, done);
        });

        afterEach(function (done) {
            delete iotAgentConfig.timestamp;
            delete iotAgentConfig.types.Light.timezone;
            timekeeper.reset();

            done();
        });

        it('should not override the received instant and should not add metadatas for this request', function (done) {
            iotAgentLib.update('light1', 'Light', '', modifiedValues, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe("When the IoT Agent receives information from a device whose type doesn't have a type name", function () {
        beforeEach(function (done) {
            nock.cleanAll();

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should fail with a 500 TYPE_NOT_FOUND error', function (done) {
            iotAgentLib.update('light1', 'BrokenLight', '', values, function (error) {
                should.exist(error);
                error.code.should.equal(500);
                error.name.should.equal('TYPE_NOT_FOUND');
                done();
            });
        });
    });

    describe('When the Context Broker returns an HTTP error code updating an entity', function () {
        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextRequests/updateContext.json')
                )
                .reply(
                    413,
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextResponses/updateContext1Failed.json')
                );

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should return ENTITY_GENERIC_ERROR an error to the caller', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.exist(error);
                should.exist(error.name);
                error.code.should.equal(413);
                error.details.description.should.equal('payload size: 1500000, max size supported: 1048576');
                error.details.error.should.equal('RequestEntityTooLarge');
                error.name.should.equal('ENTITY_GENERIC_ERROR');
                done();
            });
        });
    });

    describe('When the Context Broker returns an application error code updating an entity', function () {
        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextRequests/updateContext.json')
                )
                .reply(
                    400,
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextResponses/updateContext2Failed.json')
                );

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should return ENTITY_GENERIC_ERROR an error to the caller', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.exist(error);
                should.exist(error.name);
                error.name.should.equal('ENTITY_GENERIC_ERROR');
                done();
            });
        });
    });

    describe('When there is a transport error connecting to the Context Broker', function () {
        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextRequests/updateContext.json')
                )
                .reply(
                    500,
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextResponses/updateContext2Failed.json')
                );

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should return a ENTITY_GENERIC_ERROR error to the caller', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
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

    describe('When the IoT Agent recieves information for a type with a configured Context Broker', function () {
        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:3024')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextRequests/updateContext5.json')
                )
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should use the Context Broker defined by the type', function (done) {
            iotAgentLib.update('humSensor', 'Humidity', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an IoT Agent receives information for a type with static attributes', function () {
        const newValues = [
            {
                name: 'moving',
                type: 'boolean',
                value: true
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextStaticAttributes.json'
                    )
                )
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });
        it('should decorate the entity with the static attributes', function (done) {
            iotAgentLib.update('motion1', 'Motion', '', newValues, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an IoT Agent receives information for a type with static attributes with metadata', function () {
        const newValues = [
            {
                name: 'luminosity',
                type: 'text',
                value: '100'
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            /* jshint maxlen: 200 */
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextStaticAttributesMetadata.json'
                    )
                )
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });
        it('should decorate the entity with the static attributes', function (done) {
            iotAgentLib.update('lamp1', 'Lamp', '', newValues, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives new information from a device', function () {
        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextRequests/updateContext.json')
                )
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        afterEach(function (done) {
            done();
        });

        it('should change the value of the corresponding attribute in the context broker', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives autoprovisioned id and type measures', function () {
        const valuesIdType = [
            {
                name: 'id',
                type: 'aTypeProvidedByIoTACodeCallingUpdateOnLib1',
                value: 'idIoTA'
            },
            {
                name: 'type',
                type: 'aTypeProvidedByIoTACodeCallingUpdateOnLib2',
                value: 'typeIoTA'
            },
            {
                name: 'm',
                type: 'aTypeProvidedByIoTACodeCallingUpdateOnLib3',
                value: 'measIoTA'
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            // Note that in the case of measure_id and measure_type the type provided by the IOTA when calling iotAgentLib.update()
            // is used (thus ignoring the one of the StupidDevice group for id or type, which is 'text') but in the case of measIoTA the type provided in the
            // provisioning ('String') is used
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl', {
                    id: 'stupiddevice1',
                    type: 'StupidDevice',
                    meas: {
                        value: 'measIoTA',
                        type: 'String'
                    },
                    measure_id: {
                        type: 'aTypeProvidedByIoTACodeCallingUpdateOnLib1',
                        value: 'idIoTA'
                    },
                    measure_type: {
                        type: 'aTypeProvidedByIoTACodeCallingUpdateOnLib2',
                        value: 'typeIoTA'
                    }
                })
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should not affect to the real ID and Type to store in the context broker', function (done) {
            iotAgentLib.update('stupiddevice1', 'StupidDevice', '', valuesIdType, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives provisioned id and type measures with different object_id names', function () {
        const valuesIdType2 = [
            {
                name: 'i',
                type: 'text',
                value: 'idIoTA2'
            },
            {
                name: 't',
                type: 'text',
                value: 'typeIoTA2'
            },
            {
                name: 'm',
                type: 'text',
                value: 'measIoTA2'
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl', {
                    id: 'stupiddevice2',
                    type: 'StupidDevice',
                    meas: {
                        value: 'measIoTA2',
                        type: 'String'
                    }
                })
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should not affect to the real ID and Type to store in the context broker', function (done) {
            iotAgentLib.update('stupiddevice2', 'StupidDevice', '', valuesIdType2, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives provisioned id and type measures with the same object_id name', function () {
        const valuesIdType3 = [
            {
                name: 'id',
                type: 'text',
                value: 'idIoTA'
            },
            {
                name: 'type',
                type: 'text',
                value: 'typeIoTA'
            },
            {
                name: 'meas',
                type: 'text',
                value: 'measIoTA'
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl', {
                    id: 'stupiddevice3',
                    type: 'StupidDevice2',
                    meas: {
                        value: 'measIoTA',
                        type: 'String'
                    },
                    measure_id: {
                        value: 'idIoTA',
                        type: 'text'
                    },
                    measure_type: {
                        value: 'typeIoTA',
                        type: 'text'
                    }
                })
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should not affect to the real ID and Type to store in the context broker', function (done) {
            iotAgentLib.update('stupiddevice3', 'StupidDevice2', '', valuesIdType3, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives new information from a device and CBis defined using environment variables', function () {
        beforeEach(function (done) {
            process.env.IOTA_CB_HOST = 'cbhost';

            nock.cleanAll();

            contextBrokerMock = nock('http://cbhost:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextRequests/updateContext6.json')
                )
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should change the value of the corresponding attribute in the context broker', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });

        afterEach(function (done) {
            delete process.env.IOTA_CB_HOST;
            done();
        });
    });
});
