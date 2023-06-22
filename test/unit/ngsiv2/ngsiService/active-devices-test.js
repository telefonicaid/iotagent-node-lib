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
        }
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com'
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
                    '/v2/entities?options=upsert',
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

        it('should ignore if wrong type or id are target atributes in the context broker', function (done) {
            const wrongvalues = [
                {
                    name: 'type',
                    type: 'string',
                    value: 'wrongtype'
                },
                {
                    name: 'id',
                    type: 'string',
                    value: 'wrongid'
                }
            ];

            iotAgentLib.update('light1', 'Light', '', wrongvalues.concat(values), function (error) {
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
                    '/v2/entities?options=upsert',
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
                    '/v2/entities?options=upsert',
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

    describe('When the IoT Agent receives new information, the timestamp flag is onand timezone is defined', function () {
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
                    '/v2/entities?options=upsert',
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
                    '/v2/entities?options=upsert',
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
                    '/v2/entities?options=upsert',
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
                    '/v2/entities?options=upsert',
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
                    '/v2/entities?options=upsert',
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
                    '/v2/entities?options=upsert',
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
                    '/v2/entities?options=upsert',
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
                    '/v2/entities?options=upsert',
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
                    '/v2/entities?options=upsert',
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

    describe('When the IoT Agent receives new information from a device and the appendMode flag is on', function () {
        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert',
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextRequests/updateContext.json')
                )
                .reply(204);

            iotAgentConfig.appendMode = true;
            iotAgentLib.activate(iotAgentConfig, done);
        });

        afterEach(function (done) {
            iotAgentConfig.appendMode = false;

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

    describe('When the IoT Agent receives new information from a device and CBis defined using environment variables', function () {
        beforeEach(function (done) {
            process.env.IOTA_CB_HOST = 'cbhost';

            nock.cleanAll();

            contextBrokerMock = nock('http://cbhost:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .patch(
                    '/v2/entities/light1/attrs',
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextRequests/updateContext.json')
                )
                .query({ type: 'Light' })
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
