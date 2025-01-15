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
 * Developed by: Federico M. Facca - Martel Innovate
 */

/* jshint camelcase: false */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const utils = require('../../../tools/utils');
const should = require('should');
const logger = require('logops');
const nock = require('nock');
const timekeeper = require('timekeeper');
let contextBrokerMock;
const iotAgentConfig = {
    logLevel: 'FATAL',
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
            type: 'Light',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Number'
                },
                {
                    object_id: 'e',
                    name: 'consumption',
                    type: 'Number'
                },
                {
                    object_id: 'a',
                    name: 'alive',
                    type: 'None'
                },
                {
                    object_id: 'u',
                    name: 'updated',
                    type: 'Boolean'
                },
                {
                    object_id: 'm',
                    name: 'manufacturer',
                    type: 'Object'
                },
                {
                    object_id: 'r',
                    name: 'revisions',
                    type: 'Array'
                },
                {
                    object_id: 'x',
                    name: 'consumption_x',
                    type: 'Number',
                    expression: 'pressure * 20'
                }
            ]
        },
        LightError: {
            commands: [],
            type: 'Light',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Number',
                    expression: 'pressure * / 20'
                }
            ]
        },
        WeatherStation: {
            commands: [],
            type: 'WeatherStation',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Number',
                    expression: 'pressure * 20'
                },
                {
                    object_id: 'e',
                    name: 'consumption',
                    type: 'Number',
                    expression: 'consumption * 20'
                },
                {
                    object_id: 'h',
                    name: 'humidity',
                    type: 'Percentage'
                },
                {
                    name: 'weather',
                    type: 'Summary',
                    expression: '"Humidity " + (humidity / 2) + " and pressure " + (pressure * 20)'
                },
                {
                    object_id: 'a',
                    name: 'alive',
                    type: 'None',
                    expression: 'alive * 20'
                },
                {
                    object_id: 'u',
                    name: 'updated',
                    type: 'Boolean',
                    expression: 'updated * 20'
                }
            ]
        },
        WeatherStationUndef: {
            commands: [],
            type: 'WeatherStation',
            lazy: [],
            active: [
                {
                    object_id: 'u',
                    name: 'undef',
                    type: 'json',
                    expression: 'u["no"]'
                },
                {
                    object_id: 'n',
                    name: 'nil',
                    type: 'json',
                    expression: 'u["no"]?u["no"]:null'
                },
                {
                    object_id: 'f',
                    name: 'falsy',
                    type: 'Boolean',
                    expression: 'u["no"]?u["no"]:false'
                },
                {
                    object_id: 'z',
                    name: 'zero',
                    type: 'Number',
                    expression: 'u["no"]?u["no"]:0'
                }
            ]
        },
        WeatherStationMultiple: {
            commands: [],
            type: 'WeatherStation',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Number',
                    expression: 'pressure|trim'
                },
                {
                    object_id: 'p25',
                    name: 'pressure25',
                    type: 'Number'
                },
                {
                    object_id: 'e',
                    name: 'consumption',
                    type: 'Number',
                    expression: 'consumption|trim'
                },
                {
                    object_id: 'h',
                    name: 'humidity12',
                    type: 'Percentage'
                },
                {
                    name: 'weather',
                    type: 'Summary',
                    expression: '"Humidity " + (humidity12 / 2) + " and pressure " + (pressure25 * 20)'
                },
                {
                    object_id: 'a',
                    name: 'alive',
                    type: 'None',
                    expression: 'alive|trim'
                },
                {
                    object_id: 'u',
                    name: 'updated',
                    type: 'Boolean',
                    expression: 'updated|trim'
                }
            ]
        },
        GPS: {
            commands: [],
            type: 'GPS',
            lazy: [],
            active: [
                {
                    name: 'location',
                    type: 'geo:json',
                    expression: "{coordinates: [lon,lat], type: 'Point'}"
                },
                {
                    name: 'TimeInstant',
                    type: 'DateTime',
                    expression: 'ts|toisodate'
                }
            ],
            explicitAttrs: true
        },
        GPS2: {
            commands: [],
            type: 'GPS',
            lazy: [],
            active: [
                {
                    name: 'location',
                    type: 'geo:json',
                    expression: "{coordinates: [lon,lat], type: 'Point'}"
                }
            ],
            explicitAttrs: true
        }
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M'
};

const iotAgentConfigTS = {
    logLevel: 'FATAL',
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
        GPS: {
            commands: [],
            type: 'GPS',
            lazy: [],
            active: [
                {
                    name: 'location',
                    type: 'geo:json',
                    expression: "{coordinates: [lon,lat], type: 'Point'}"
                }
            ],
            explicitAttrs: true
        }
    },
    timestamp: true,
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com'
};

describe('NGSI-LD: JEXL', function () {
    beforeEach(function (done) {
        //logger.setLevel('FATAL');

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

    describe('When there are expression attributes that are just calculated (not sent by the device)', function () {
        // Case: Expression which results is sent as a new attribute
        const values = [
            {
                name: 'p',
                type: 'Number',
                value: 52
            },
            {
                name: 'h',
                type: 'Percentage',
                value: '12'
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextExpressionPlugin2.json'
                    )
                )
                .reply(204);
        });

        it('should calculate them and add them to the payload', function (done) {
            iotAgentLib.update('ws1', 'WeatherStation', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an expression with multiple variables with numbers arrive', function () {
        // Case: Update for integer and string attributes with expression

        const values = [
            {
                name: 'p25',
                type: 'Number',
                value: 52
            },
            {
                name: 'h',
                type: 'percentage',
                value: '12'
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextExpressionPlugin4a.json'
                    )
                )
                .reply(204);
        });

        it('should calculate it and add it to the payload', function (done) {
            iotAgentLib.update('ws1', 'WeatherStationMultiple', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes without expressions and type integer', function () {
        // Case: Update for an integer attribute without expression
        const values = [
            {
                name: 'e',
                type: 'Number',
                value: 52
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextExpressionPlugin11.json'
                    )
                )
                .reply(204);
        });

        it('should apply the expression before sending the values', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes with numeric expressions and type integer', function () {
        // Case: Update for an integer attribute with arithmetic expression
        const values = [
            {
                name: 'p',
                type: 'Number',
                value: 52
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextExpressionPlugin1a.json'
                    )
                )
                .reply(204);
        });

        it('should apply the expression before sending the values', function (done) {
            iotAgentLib.update('ws1', 'WeatherStation', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes without expressions and type float', function () {
        // Case: Update for a Float attribute without expressions

        const values = [
            {
                name: 'e',
                type: 'Number',
                value: 0.44
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextExpressionPlugin3.json'
                    )
                )
                .reply(204);
        });

        it('should apply the expression before sending the values', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes with numeric expressions and type float', function () {
        // Case: Update for a Float attribute with arithmetic expression

        const values = [
            {
                name: 'e',
                type: 'Number',
                value: 0.44
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextExpressionPlugin8a.json'
                    )
                )
                .reply(204);
        });

        it('should apply the expression before sending the values', function (done) {
            iotAgentLib.update('ws1', 'WeatherStation', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes without expressions and Boolean type', function () {
        // Case: Update for a Boolean attribute without expression

        const values = [
            {
                name: 'u',
                type: 'Boolean',
                value: true
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextExpressionPlugin9.json'
                    )
                )
                .reply(204);
        });

        it('should apply the expression before sending the values', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes without expressions and Object type', function () {
        // Case: Update for a JSON document attribute without expression
        const values = [
            {
                name: 'm',
                type: 'Object',
                value: { name: 'Manufacturer1', VAT: 'U12345678' }
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextExpressionPlugin6.json'
                    )
                )
                .reply(204);
        });

        it('should apply the expression before sending the values', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes without expressions and Object type', function () {
        // Case: Update for a JSON array attribute without expression

        const values = [
            {
                name: 'r',
                type: 'Object',
                value: ['v0.1', 'v0.2', 'v0.3']
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextExpressionPlugin7.json'
                    )
                )
                .reply(204);
        });

        it('should apply the expression before sending the values', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When there are expressions including other attributes and they are updated', function () {
        const values = [
            {
                name: 'p',
                type: 'Number',
                value: 10
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextExpressionPlugin13.json'
                    )
                )
                .reply(204);
        });

        it('should apply the expression before sending the values', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When there are expressions including other attributes and they are updated (overriding situation)', function () {
        const values = [
            {
                name: 'x',
                type: 'Number',
                value: 0.44
            },
            {
                name: 'p',
                type: 'Number',
                value: 10
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextExpressionPlugin13.json'
                    )
                )
                .reply(204);
        });

        it('should apply the expression before sending the values', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When a measure arrives and there is not enough information to calculate an expression', function () {
        const values = [
            {
                name: 'p',
                type: 'centigrades',
                value: '52'
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextExpressionPlugin29.json'
                    )
                )
                .reply(204);
        });

        it('should not calculate the expression', function (done) {
            iotAgentLib.update('ws1', 'WeatherStation', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
    describe('When a measure arrives and there is not enough information to calculate an expression', function () {
        const values = [
            {
                name: 'u',
                type: 'json',
                value: '{}'
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextExpressionPlugin31.json'
                    )
                )
                .reply(204);
        });

        it('should not calculate the expression and allow falsy values', function (done) {
            iotAgentLib.update('ws1', 'WeatherStationUndef', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When there are additional attributes sent by the device to be calculated and removed', function () {
        // Case: Expression which results is sent as a new attribute
        const values = [
            {
                name: 'lat',
                type: 'Number',
                value: 52
            },
            {
                name: 'lon',
                type: 'Number',
                value: 13
            },
            {
                name: 'ts',
                type: 'Number',
                value: 1
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextExpressionPlugin32.json'
                    )
                )
                .reply(204);
        });

        it('should calculate them and remove non-explicitAttrs from the payload', function (done) {
            iotAgentLib.update('gps1', 'GPS', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
    describe('When there is an extra TimeInstant sent by the device to be removed', function () {
        // Case: Expression which results is sent as a new attribute
        const values = [
            {
                name: 'lat',
                type: 'Number',
                value: 52
            },
            {
                name: 'lon',
                type: 'Number',
                value: 13
            },
            {
                name: 'TimeInstant',
                type: 'DateTime',
                value: '2015-08-05T07:35:01.468+00:00'
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextExpressionPlugin34.json'
                    )
                )
                .reply(204);
        });

        it('should calculate them and remove non-explicitAttrs from the payload', function (done) {
            iotAgentLib.update('gps1', 'GPS2', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});

describe('NGSI-LD: JEXL - Timestamps', function () {
    beforeEach(function (done) {
        logger.setLevel('FATAL');

        iotAgentLib.activate(iotAgentConfigTS, function () {
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

    describe('When timestamps are added but are not explicitly defined', function () {
        // Case: Expression which results is sent as a new attribute
        const values = [
            {
                name: 'lat',
                type: 'Number',
                value: 52
            },
            {
                name: 'lon',
                type: 'Number',
                value: 13
            },
            {
                name: 'ts',
                type: 'Number',
                value: 1
            }
        ];

        beforeEach(function () {
            const time = new Date(1438760101468); // 2015-08-05T07:35:01.468+00:00

            timekeeper.freeze(time);
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextExpressionPlugin33.json'
                    )
                )
                .reply(204);
        });

        afterEach(function (done) {
            timekeeper.reset();
            done();
        });

        it('should calculate them and not remove the timestamp from the payload', function (done) {
            iotAgentLib.update('gps1', 'GPS', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});
