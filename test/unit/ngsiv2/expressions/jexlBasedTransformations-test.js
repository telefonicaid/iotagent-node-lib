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
                    type: 'None',
                    skipValue: 'null passes'
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
                    expression: 'pressure * / 20',
                    skipValue: 'null passes'
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
                    expression: '"Humidity " + (humidity / 2) + " and pressure " + (p * 20)'
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
        WeatherStationWithIdNumber: {
            commands: [],
            type: 'WeatherStation',
            entityNameExp: 'id',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Number',
                    expression: 'pressure * 20'
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
        },
        GPS2b: {
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
                    name: 'temperature',
                    type: 'Number',
                    expression: 't * 10'
                }
            ],
            explicitAttrs: true
        },
        GPS3: {
            commands: [],
            type: 'GPS',
            lazy: [],
            staticAttributes: [
                {
                    name: 'color',
                    type: 'string',
                    value: 'blue'
                }
            ],
            active: [
                {
                    name: 'price',
                    type: 'number'
                },
                {
                    name: 'location',
                    type: 'geo:json',
                    expression: "{coordinates: [lon,lat], type: 'Point'}"
                }
            ],
            explicitAttrs: ' location&&price ? [ "location", "price" ] : location ? [ "location" ] : []'
        },
        GPS4: {
            commands: [],
            type: 'GPS',
            lazy: [],
            staticAttributes: [
                {
                    name: 'color',
                    type: 'string',
                    value: 'blue'
                }
            ],
            active: [
                {
                    name: 'price',
                    type: 'number'
                },
                {
                    name: 'location',
                    type: 'geo:json',
                    expression: "{coordinates: [lon,lat], type: 'Point'}"
                }
            ],
            explicitAttrs: '[ "loca" + "tion" ]'
        },
        GPS5: {
            commands: [],
            type: 'GPS',
            lazy: [],
            staticAttributes: [
                {
                    name: 'color',
                    type: 'string',
                    value: 'blue'
                }
            ],
            active: [
                {
                    name: 'price',
                    type: 'number'
                },
                {
                    object_id: 'theLocation',
                    name: 'mylocation',
                    type: 'geo:json'
                }
            ],
            explicitAttrs: "theLocation ? ['mylocation'] :  []"
        },
        GPS5b: {
            commands: [],
            type: 'GPS',
            lazy: [],
            staticAttributes: [
                {
                    name: 'lat',
                    type: 'string',
                    value: 52
                }
            ],
            active: [
                {
                    name: 'price',
                    type: 'number'
                },
                {
                    object_id: 'theLocation',
                    name: 'mylocation',
                    type: 'geo:json',
                    expression: "{coordinates: [lon,lat], type: 'Point'}"
                }
            ],
            explicitAttrs: "mylocation ? [{object_id: 'theLocation'}] : []"
        },
        GPS6: {
            commands: [],
            type: 'GPS',
            lazy: [],
            staticAttributes: [
                {
                    name: 'lat',
                    type: 'Number',
                    value: 52
                },
                {
                    name: 'lon',
                    type: 'Number',
                    value: 13
                }
            ],
            active: [
                {
                    name: 'location',
                    type: 'geo:json',
                    expression: "{coordinates: [lon,lat], type: 'Point'}"
                }
            ],
            explicitAttrs: 'TimeInstant == null ? [] : true' // which is true
        },
        GPS7: {
            commands: [],
            type: 'GPS',
            lazy: [],
            staticAttributes: [
                {
                    name: 'color',
                    type: 'string',
                    value: 'blue'
                }
            ],
            active: [
                {
                    name: 'price',
                    type: 'number'
                },
                {
                    name: 'location',
                    type: 'geo:json',
                    expression: "{coordinates: [lon,lat], type: 'Point'}"
                }
            ],
            explicitAttrs: '[ ]'
        },
        skipvalue: {
            commands: [],
            type: 'skipvalue',
            lazy: [],
            active: [
                {
                    name: 'alwaysSkip',
                    type: 'Number',
                    skipValue: true,
                    expression: 'true'
                },
                {
                    name: 'neverSkip',
                    type: 'Number',
                    skipValue: true,
                    expression: 'false'
                },
                {
                    name: 'skip',
                    type: 'Number',
                    skipValue: 33,
                    expression: 'condition'
                },
                {
                    object_id: 'condition',
                    name: 'condition',
                    type: 'Number'
                },
                {
                    object_id: 'nonProgressAtt1',
                    name: 'nonProgressatt1',
                    type: 'Number',
                    expression: 'nonexistent * 2'
                },
                {
                    object_id: 'nonProgressAtt2',
                    name: 'nonProgressatt2',
                    type: 'Number',
                    expression: 'nonexistent * 2',
                    skipValue: null
                }
            ]
        },
        nestedExpressionsObj: {
            commands: [],
            type: 'nestedExpressionsObj',
            lazy: [],
            active: [
                {
                    name: 'value3',
                    object_id: 'v3',
                    type: 'Number',
                    expression: 'v*2'
                },
                {
                    name: 'value2',
                    object_id: 'v2',
                    type: 'Number',
                    expression: 'v3*2'
                },
                {
                    name: 'value1',
                    object_id: 'v1',
                    type: 'Number',
                    expression: 'v2*2'
                }
            ]
        },
        nestedExpressionsName: {
            commands: [],
            type: 'nestedExpressionsName',
            lazy: [],
            active: [
                {
                    name: 'prefix',
                    object_id: 't1',
                    type: 'text',
                    expression: '"pre_"+t'
                },
                {
                    name: 'postfix',
                    object_id: 't2',
                    type: 'text',
                    expression: 'prefix+"_post"'
                }
            ]
        },
        nestedExpressionsSkip: {
            commands: [],
            type: 'nestedExpressionsSkip',
            lazy: [],
            active: [
                {
                    name: 'prefix',
                    object_id: 't1',
                    type: 'text',
                    expression: '"pre_"+t'
                },
                {
                    name: 'postfix',
                    object_id: 't2',
                    type: 'text',
                    expression: 'prefix+"_post"'
                },
                {
                    name: 't',
                    object_id: 't',
                    type: 'text',
                    expression: 'null'
                }
            ]
        },
        nestedExpressionDirect: {
            commands: [],
            type: 'nestedExpressionsDirect',
            lazy: [],
            active: [
                {
                    name: 'correctedLevel',
                    type: 'Number',
                    expression: 'level * 0.897'
                },
                {
                    name: 'normalizedLevel',
                    type: 'Number',
                    expression: 'correctedLevel / 100'
                }
            ]
        },
        nestedExpressionReverse: {
            commands: [],
            type: 'nestedExpressionsReverse',
            lazy: [],
            active: [
                {
                    name: 'normalizedLevel',
                    type: 'Number',
                    expression: 'correctedLevel / 100'
                },
                {
                    name: 'correctedLevel',
                    type: 'Number',
                    expression: 'level * 0.897'
                }
            ]
        },
        nestedExpressionsAnti: {
            commands: [],
            type: 'nestedExpressionsAnti',
            lazy: [],
            active: [
                {
                    name: 'a',
                    type: 'Number',
                    expression: 'b*10'
                },
                {
                    name: 'b',
                    type: 'Number',
                    expression: 'a*10'
                }
            ]
        },
        testNull: {
            commands: [],
            type: 'testNull',
            lazy: [],
            active: [
                {
                    name: 'a',
                    type: 'Number',
                    expression: 'v'
                },
                {
                    name: 'b',
                    type: 'Number',
                    expression: 'v*3'
                },
                {
                    name: 'c',
                    type: 'Boolean',
                    expression: 'v==null'
                },
                {
                    name: 'd',
                    type: 'Text',
                    expression: "v?'no soy null':'soy null'"
                },
                {
                    name: 'e',
                    type: 'Text',
                    expression: "v==null?'soy null':'no soy null'"
                },
                {
                    name: 'f',
                    type: 'Text',
                    expression: "(v*3)==null?'soy null':'no soy null'"
                },
                {
                    name: 'g',
                    type: 'Boolean',
                    expression: 'v == undefined'
                }
            ]
        },
        testNullSkip: {
            commands: [],
            type: 'testNullSkip',
            lazy: [],
            active: [
                {
                    name: 'a',
                    type: 'Number',
                    expression: 'v',
                    skipValue: 'avoidNull'
                },
                {
                    name: 'b',
                    type: 'Number',
                    expression: 'v*3',
                    skipValue: 'avoidNull'
                },
                {
                    name: 'c',
                    type: 'Boolean',
                    expression: 'v==null',
                    skipValue: 'avoidNull'
                },
                {
                    name: 'd',
                    type: 'Text',
                    expression: "v?'no soy null':'soy null'",
                    skipValue: 'avoidNull'
                },
                {
                    name: 'e',
                    type: 'Text',
                    expression: "v==null?'soy null':'no soy null'",
                    skipValue: 'avoidNull'
                },
                {
                    name: 'f',
                    type: 'Text',
                    expression: "(v*3)==null?'soy null':'no soy null'",
                    skipValue: 'avoidNull'
                },
                {
                    name: 'g',
                    type: 'Boolean',
                    expression: 'v == undefined',
                    skipValue: 'avoidNull'
                }
            ]
        },
        testNullExplicit: {
            type: 'testNullExplicit',
            explicitAttrs: true,
            commands: [],
            lazy: [],
            active: [
                {
                    name: 'a',
                    type: 'Number',
                    expression: 'v'
                },
                {
                    name: 'b',
                    type: 'Number',
                    expression: 'v*3'
                },
                {
                    name: 'c',
                    type: 'Boolean',
                    expression: 'v==null'
                },
                {
                    name: 'd',
                    type: 'Text',
                    expression: "v?'no soy null':'soy null'"
                },
                {
                    name: 'e',
                    type: 'Text',
                    expression: "v==null?'soy null':'no soy null'"
                },
                {
                    name: 'f',
                    type: 'Text',
                    expression: "(v*3)==null?'soy null':'no soy null'"
                },
                {
                    name: 'g',
                    type: 'Boolean',
                    expression: 'v == undefined'
                }
            ]
        }
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M',
    useCBflowControl: true
};

const iotAgentConfigTS = {
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
        },
        WaterTank: {
            commands: [],
            type: 'WaterTank',
            lazy: [],
            active: [
                {
                    object_id: 'cnt2',
                    name: 'contA',
                    type: 'Number'
                },
                {
                    object_id: 'cnt3',
                    name: 'contB',
                    type: 'Number'
                },
                {
                    object_id: 'false2',
                    name: 'waterLeavingTanks',
                    type: 'Number',
                    expression: 'cnt2*0.1',
                    entity_name: 'PA_A_0001',
                    entity_type: 'WaterTank'
                },
                {
                    object_id: 'false3',
                    name: 'waterLeavingTanks',
                    type: 'Number',
                    expression: 'cnt3*0.1',
                    entity_name: 'PA_B_0001',
                    entity_type: 'WaterTank'
                },
                {
                    object_id: 'foostatus2',
                    name: 'status',
                    type: 'Text',
                    expression: 'status',
                    entity_name: 'PA_A_0001',
                    entity_type: 'WaterTank'
                },
                {
                    object_id: 'foostatus3',
                    name: 'status',
                    type: 'Text',
                    expression: 'status',
                    entity_name: 'PA_B_0001',
                    entity_type: 'WaterTank'
                }
            ],
            explicitAttrs:
                "contA&&contB?['TimeInstant','contA',{object_id:'false2'},'contB',{object_id:'false3'},'status']:contA?['TimeInstant','contA',{object_id:'false2'},{object_id:'foostatus2'}]:contB?['TimeInstant','contB',{object_id:'false3'},{object_id:'foostatus3'}]:[]"
        }
    },
    timestamp: true,
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    useCBflowControl: true
};

describe('Java expression language (JEXL) based transformations plugin', function () {
    beforeEach(function (done) {
        logger.setLevel('FATAL');

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

    describe('When an update comes for expressions with syntax errors', function () {
        // Case: Update for an attribute with bad expression
        const values = [
            {
                name: 'p',
                type: 'Number',
                value: 1040
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin30.json'
                    )
                )
                .reply(204);
        });

        it('should ignore the expression and send the values', function (done) {
            iotAgentLib.update('light1', 'LightError', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When applying expressions with null values', function () {
        // Case: Update for an attribute with bad expression
        const values = [
            {
                name: 'v',
                type: 'Number',
                value: null
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl', {
                    id: 'testNull1',
                    type: 'testNull',
                    v: {
                        value: null,
                        type: 'Number'
                    },
                    c: {
                        value: true,
                        type: 'Boolean'
                    },
                    d: {
                        value: 'soy null',
                        type: 'Text'
                    },
                    e: {
                        value: 'soy null',
                        type: 'Text'
                    },
                    f: {
                        value: 'no soy null',
                        type: 'Text'
                    },
                    g: {
                        value: true,
                        type: 'Boolean'
                    }
                })
                .reply(204);
        });

        it('it should be handled properly', function (done) {
            iotAgentLib.update('testNull1', 'testNull', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When applying expressions without values (NaN)', function () {
        // Case: Update for an attribute with bad expression
        const values = [
            {
                name: 'z',
                type: 'Number',
                value: null
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl', {
                    id: 'testNull2',
                    type: 'testNull',
                    z: {
                        value: null,
                        type: 'Number'
                    },
                    c: {
                        value: true,
                        type: 'Boolean'
                    },
                    d: {
                        value: 'soy null',
                        type: 'Text'
                    },
                    e: {
                        value: 'soy null',
                        type: 'Text'
                    },
                    f: {
                        value: 'no soy null',
                        type: 'Text'
                    },
                    g: {
                        value: true,
                        type: 'Boolean'
                    }
                })
                .reply(204);
        });

        it('it should be handled properly', function (done) {
            iotAgentLib.update('testNull2', 'testNull', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When applying expressions with null values - Skip values disabled', function () {
        // Case: Update for an attribute with bad expression
        const values = [
            {
                name: 'v',
                type: 'Number',
                value: null
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl', {
                    id: 'testNullSkip1',
                    type: 'testNullSkip',
                    v: {
                        value: null,
                        type: 'Number'
                    },
                    a: {
                        value: null,
                        type: 'Number'
                    },
                    b: {
                        value: null,
                        type: 'Number'
                    },
                    c: {
                        value: true,
                        type: 'Boolean'
                    },
                    d: {
                        value: 'soy null',
                        type: 'Text'
                    },
                    e: {
                        value: 'soy null',
                        type: 'Text'
                    },
                    f: {
                        value: 'no soy null',
                        type: 'Text'
                    },
                    g: {
                        value: true,
                        type: 'Boolean'
                    }
                })
                .reply(204);
        });

        it('it should be handled properly', function (done) {
            iotAgentLib.update('testNullSkip1', 'testNullSkip', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When applying expressions without values (NaN) - Skip values disabled', function () {
        // Case: Update for an attribute with bad expression
        const values = [
            {
                name: 'z',
                type: 'Number',
                value: null
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl', {
                    id: 'testNullSkip2',
                    type: 'testNullSkip',
                    z: {
                        value: null,
                        type: 'Number'
                    },
                    a: {
                        value: null,
                        type: 'Number'
                    },
                    b: {
                        value: null,
                        type: 'Number'
                    },
                    c: {
                        value: true,
                        type: 'Boolean'
                    },
                    d: {
                        value: 'soy null',
                        type: 'Text'
                    },
                    e: {
                        value: 'soy null',
                        type: 'Text'
                    },
                    f: {
                        value: 'no soy null',
                        type: 'Text'
                    },
                    g: {
                        value: true,
                        type: 'Boolean'
                    }
                })
                .reply(204);
        });

        it('it should be handled properly', function (done) {
            iotAgentLib.update('testNullSkip2', 'testNullSkip', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When applying expressions with not explicit measures - explicitAttrs = true', function () {
        // Case: Update for an attribute with bad expression
        const values = [
            {
                name: 'v',
                type: 'Number',
                value: null
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl', {
                    id: 'testNullExplicit1',
                    type: 'testNullExplicit',
                    c: {
                        value: true,
                        type: 'Boolean'
                    },
                    d: {
                        value: 'soy null',
                        type: 'Text'
                    },
                    e: {
                        value: 'soy null',
                        type: 'Text'
                    },
                    f: {
                        value: 'no soy null',
                        type: 'Text'
                    },
                    g: {
                        value: true,
                        type: 'Boolean'
                    }
                })
                .reply(204);
        });

        it('it should be handled properly', function (done) {
            iotAgentLib.update('testNullExplicit1', 'testNullExplicit', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin2.json'
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin4.json'
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin11.json'
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin1.json'
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin3.json'
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin8.json'
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

    describe('When an update comes for attributes without expressions and NULL type', function () {
        // Case: Update for a Null attribute without expression

        const values = [
            {
                name: 'a',
                type: 'None',
                value: null
            }
        ];

        beforeEach(function () {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin5.json'
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin9.json'
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin6.json'
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin7.json'
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

    describe('When there are expressions including other attributes and they are not updated', function () {
        const values = [
            {
                name: 'x',
                type: 'Number',
                value: 0.44
            }
        ];

        beforeEach(function () {
            nock.cleanAll();
        });

        it('should apply the expression before sending the values', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin13.json'
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin13.json'
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin29.json'
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

    describe('When a measure arrives with id number', function () {
        const values = [
            {
                name: 'p',
                type: 'centigrades',
                value: '52'
            }
        ];
        const typeInformation = {
            service: 'smartgondor',
            subservice: 'gardens',
            name: '1234',
            id: '1234',
            type: 'WeatherStation',
            active: [{ object_id: 'p', name: 'pressure', type: 'Number', expression: 'pressure * 20' }]
        };

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin29b.json'
                    )
                )
                .reply(204);
        });

        it('should calculate the expression', function (done) {
            iotAgentLib.update(1234, 'WeatherStationWithIdNumber', '', values, typeInformation, function (error) {
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin31.json'
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin32.json'
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin35.json'
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

    describe('When there is an extra measure sent by the device to be removed', function () {
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
                name: 'another',
                type: 'Number',
                value: 99
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin41.json'
                    )
                )
                .reply(204);
        });

        it('should calculate them and remove non-explicitAttrs from the payload', function (done) {
            iotAgentLib.update('gps1', 'GPS2b', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When there is an extra TimeInstant sent by the device to be removed by string', function () {
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin34b.json'
                    )
                )
                .reply(204);
        });

        it('should calculate them and remove non-explicitAttrs by string from the payload', function (done) {
            iotAgentLib.update('gps1', 'GPS3', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When there is an extra TimeInstant sent by the device to be removed by jexl expression', function () {
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin34b.json'
                    )
                )
                .reply(204);
        });

        it('should calculate them and remove non-explicitAttrs by jexl expression from the payload', function (done) {
            iotAgentLib.update('gps1', 'GPS4', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When there is an extra TimeInstant sent by the device to be removed by jexl expression with context ', function () {
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
                name: 'theLocation',
                type: 'geo:json',
                value: { coordinates: [13, 52], type: 'Point' }
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin36.json'
                    )
                )
                .reply(204);
        });

        it('should calculate them and remove non-explicitAttrs by jexl expression with context from the payload ', function (done) {
            iotAgentLib.update('gps1', 'GPS5', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When there is an extra TimeInstant sent by the device to be removed by jexl expression with context defined with object_id', function () {
        // Case: Expression which results is sent as a new attribute
        const values = [
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin36b.json'
                    )
                )
                .reply(204);
        });

        it('should calculate them and remove non-explicitAttrs by jexl expression with context from the payload ', function (done) {
            iotAgentLib.update('gps1', 'GPS5b', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When there is an extra TimeInstant sent by the device to be removedb jexl expression using static attrs', function () {
        // Case: Expression which results is sent as a new attribute
        const values = [
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin34.json'
                    )
                )
                .reply(204);
        });

        it('should calculate them and remove non-explicitAttrs from the payload', function (done) {
            iotAgentLib.update('gps1', 'GPS6', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When there is an extra TimeInstant sent by the device to be removed by jexl expression with context but with empty explicitAttrs', function () {
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
                name: 'myattr',
                type: 'String',
                value: 'location'
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin37.json'
                    )
                )
                .reply(204);
        });

        it('should calculate them and remove non-explicitAttrs by jexl expression with context from the payload ', function (done) {
            iotAgentLib.update('gps1', 'GPS7', '', values, function (error) {
                should.not.exist(error);
                done();
            });
        });
    });

    describe('When using skipValue is expression in a device', function () {
        // Case: Expression which results is sent as a new attribute
        const values = [
            {
                name: 'alwaysSkip',
                type: 'Number',
                value: 1
            },
            {
                name: 'neverSkip',
                type: 'Number',
                value: 2
            },
            {
                name: 'skip',
                type: 'Number',
                value: 3
            },
            {
                name: 'condition',
                type: 'Number',
                value: 33
            }
        ];

        beforeEach(function () {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionSkip.json'
                    )
                )
                .reply(204);
        });
        afterEach(function (done) {
            done();
        });

        it('should not propagate skipped values', function (done) {
            iotAgentLib.update('skip1', 'skipvalue', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When using nested expressions by pointing to previous objetc_ids in a device ', function () {
        const values = [
            {
                name: 'v',
                type: 'Number',
                value: 5
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl', {
                    id: 'nested1',
                    type: 'nestedExpressionsObj',
                    v: {
                        value: 5,
                        type: 'Number'
                    },
                    value3: {
                        value: 10,
                        type: 'Number'
                    }
                })
                .reply(204);
        });

        afterEach(function (done) {
            done();
        });

        it('should not calculate values using nested object_ids', function (done) {
            iotAgentLib.update('nested1', 'nestedExpressionsObj', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When using nested expressions by pointing to previous attributes names in a device ', function () {
        const values = [
            {
                name: 't',
                type: 'Text',
                value: 'nestedText'
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl', {
                    id: 'nested2',
                    type: 'nestedExpressionsName',
                    t: {
                        value: 'nestedText',
                        type: 'Text'
                    },
                    prefix: {
                        value: 'pre_nestedText',
                        type: 'text'
                    },
                    postfix: {
                        value: 'pre_nestedText_post',
                        type: 'text'
                    }
                })
                .reply(204);
        });

        afterEach(function (done) {
            done();
        });

        it('should calculate values using nested attributes names', function (done) {
            iotAgentLib.update('nested2', 'nestedExpressionsName', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When using nested expressions by pointing to previous attributes names and skipValue ', function () {
        const values = [
            {
                name: 't',
                type: 'Text',
                value: 'nestedText'
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl', {
                    id: 'nested3',
                    type: 'nestedExpressionsSkip',
                    prefix: {
                        value: 'pre_nestedText',
                        type: 'text'
                    },
                    postfix: {
                        value: 'pre_nestedText_post',
                        type: 'text'
                    }
                })
                .reply(204);
        });

        afterEach(function (done) {
            done();
        });

        it('should calculate values using nested attributes names and skip measures', function (done) {
            iotAgentLib.update('nested3', 'nestedExpressionsSkip', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When using nested expressions - Direct case', function () {
        const values = [
            {
                name: 'level',
                type: 'Number',
                value: 100
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl', {
                    id: 'nestedDirect',
                    type: 'nestedExpressionsDirect',
                    level: {
                        value: 100,
                        type: 'Number'
                    },
                    correctedLevel: {
                        value: 89.7,
                        type: 'Number'
                    },
                    normalizedLevel: {
                        value: 0.897,
                        type: 'Number'
                    }
                })
                .reply(204);
        });

        afterEach(function (done) {
            done();
        });

        it('should calculate values using nested attributes names and skip measures', function (done) {
            iotAgentLib.update('nestedDirect', 'nestedExpressionDirect', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When using nested expressions - Reverse case - Antipattern', function () {
        const values = [
            {
                name: 'level',
                type: 'Number',
                value: 100
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl', {
                    id: 'nestedReverse',
                    type: 'nestedExpressionsReverse',
                    level: {
                        value: 100,
                        type: 'Number'
                    },
                    correctedLevel: {
                        value: 89.7,
                        type: 'Number'
                    }
                })
                .reply(204);
        });

        afterEach(function (done) {
            done();
        });

        it('should calculate values using nested attributes names and skip measures', function (done) {
            iotAgentLib.update('nestedReverse', 'nestedExpressionReverse', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When using nested expressions - Antipattern', function () {
        const values = [
            {
                name: 'a',
                type: 'Number',
                value: 10
            },
            {
                name: 'b',
                type: 'Number',
                value: 20
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl', {
                    id: 'nestedAnti',
                    type: 'nestedExpressionsAnti',
                    a: {
                        value: 200,
                        type: 'Number'
                    },
                    b: {
                        value: 2000,
                        type: 'Number'
                    }
                })
                .reply(204);
        });

        afterEach(function (done) {
            done();
        });

        it('should calculate values using nested attributes names and skip measures', function (done) {
            iotAgentLib.update('nestedAnti', 'nestedExpressionsAnti', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});

describe('Java expression language (JEXL) based transformations plugin - Timestamps', function () {
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
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin33.json'
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

    describe('When explicitAttrs is a jexl expression in a multientity case', function () {
        // Case: Expression which results is sent as a new attribute
        const values = [
            {
                name: 'cnt3',
                type: 'Number',
                value: '31450.000'
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
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin40.json'
                    )
                )
                .reply(204);
        });

        afterEach(function (done) {
            timekeeper.reset();
            done();
        });

        it('should calculate them and not remove the timestamp from the payload', function (done) {
            iotAgentLib.update('water1', 'WaterTank', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});
