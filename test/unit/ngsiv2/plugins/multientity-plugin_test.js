/*
 * Copyright 2016 Telefonica Investigación y Desarrollo, S.A.U
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
const should = require('should');
const logger = require('logops');
const nock = require('nock');
const moment = require('moment');
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
        WeatherStation: {
            commands: [],
            type: 'WeatherStation',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Hgmm'
                },
                {
                    object_id: 'h',
                    name: 'humidity',
                    type: 'Percentage',
                    entity_name: 'Higro2000',
                    entity_type: 'Higrometer',
                    metadata: {
                        unitCode: {
                            type: 'Text',
                            value: 'Hgmm'
                        }
                    }
                }
            ]
        },
        WeatherStation2: {
            commands: [],
            type: 'WeatherStation',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Hgmm'
                },
                {
                    object_id: 'h',
                    name: 'humidity',
                    type: 'Percentage',
                    entity_name: 'Higro2000'
                }
            ]
        },
        WeatherStation3: {
            commands: [],
            type: 'WeatherStation',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Hgmm'
                },
                {
                    object_id: 'h',
                    name: 'humidity',
                    type: 'Percentage',
                    entity_name: '"Station Number "+sn*10'
                }
            ]
        },
        WeatherStation4: {
            commands: [],
            type: 'WeatherStation',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Hgmm',
                    entity_name: '"Station Number "+sn*10'
                },
                {
                    object_id: 'h',
                    name: 'humidity',
                    type: 'Percentage',
                    entity_name: '"Station Number "+sn*10'
                }
            ]
        },
        WeatherStation5: {
            commands: [],
            type: 'WeatherStation',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Hgmm'
                },
                {
                    object_id: 'h',
                    name: 'pressure',
                    type: 'Hgmm',
                    entity_name: 'Higro2000',
                    entity_type: 'Higrometer'
                }
            ]
        },
        WeatherStation6: {
            commands: [],
            type: 'WeatherStation',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Hgmm',
                    entity_name: 'Higro2002',
                    entity_type: 'Higrometer'
                },
                {
                    object_id: 'h',
                    name: 'pressure',
                    type: 'Hgmm',
                    entity_name: 'Higro2000',
                    entity_type: 'Higrometer'
                }
            ]
        },
        WeatherStation7: {
            commands: [],
            type: 'WeatherStation',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Hgmm',
                    metadata: {
                        unitCode: { type: 'Text', value: 'Hgmm' }
                    },
                    entity_name: 'Higro2002',
                    entity_type: 'Higrometer'
                },
                {
                    object_id: 'h',
                    name: 'pressure',
                    type: 'Hgmm',
                    entity_name: 'Higro2000',
                    entity_type: 'Higrometer'
                }
            ]
        },
        WeatherStation8: {
            commands: [],
            type: 'WeatherStation',
            lazy: [],
            active: [
                {
                    object_id: 'v1',
                    name: 'vol',
                    expression: 'v1*100',
                    type: 'Number',
                    entity_name: 'WeatherStation1'
                },
                {
                    object_id: 'v2',
                    name: 'vol',
                    expression: 'v2*100',
                    type: 'Number',
                    entity_name: 'WeatherStation2'
                },
                {
                    object_id: 'v',
                    name: 'vol',
                    expression: 'v*100',
                    type: 'Number'
                }
            ]
        },
        WeatherStation9: {
            commands: [],
            type: 'WeatherStation',
            name: 'ws9b',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Hgmm'
                },
                {
                    object_id: 'h',
                    name: 'humidity',
                    type: 'Percentage',
                    entity_type: 'Higrometer',
                    metadata: {
                        unitCode: {
                            type: 'Text',
                            value: 'Hgmm'
                        }
                    }
                }
            ]
        },
        WeatherStation8Jexl: {
            commands: [],
            type: 'WeatherStation',
            lazy: [],
            active: [
                {
                    object_id: 'v1',
                    name: 'vol',
                    expression: 'v1 * 100',
                    type: 'Number',
                    entity_name: 'WeatherStation1'
                },
                {
                    object_id: 'v2',
                    name: 'vol',
                    expression: 'v2 * 100',
                    type: 'Number',
                    entity_name: 'WeatherStation2'
                },
                {
                    object_id: 'v',
                    name: 'vol',
                    expression: 'v * 100',
                    type: 'Number'
                }
            ]
        },
        WeatherStation9Jexl: {
            commands: [],
            type: 'WeatherStation',
            lazy: [],
            staticAttributes: [
                {
                    name: 'st1',
                    type: 'Number',
                    value: 1
                },
                {
                    name: 'st2',
                    type: 'Number',
                    value: 2
                }
            ],
            active: [
                {
                    object_id: 'v1',
                    name: 'vol',
                    expression: 'st1 * 100',
                    type: 'Number',
                    entity_name: 'WeatherStation1'
                },
                {
                    object_id: 'v2',
                    name: 'vol',
                    expression: 'st2 * 100',
                    type: 'Number',
                    entity_name: 'WeatherStation2'
                },
                {
                    object_id: 'v',
                    name: 'vol',
                    expression: 'v * 100',
                    type: 'Number'
                }
            ]
        },
        WeatherStation10: {
            commands: [],
            type: 'WeatherStation',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Hgmm'
                },
                {
                    object_id: 'h',
                    name: 'humidity',
                    type: 'Percentage',
                    entity_name: 'Higro2000',
                    entity_type: 'Higrometer',
                    metadata: {
                        unitCode: {
                            type: 'Text',
                            value: 'Hgmm'
                        }
                    }
                },
                {
                    object_id: 'TimeInstant',
                    name: 'TimeInstant',
                    type: 'DateTime',
                    entity_name: 'Higro2000',
                    entity_type: 'Higrometer'
                }
            ]
        },
        Sensor001: {
            commands: [],
            type: 'Sensor',
            lazy: [],
            active: [
                {
                    type: 'number',
                    name: 'vol',
                    object_id: 'cont1',
                    entity_name: 'SO1',
                    entity_type: 'WM'
                },
                {
                    type: 'number',
                    name: 'vol',
                    object_id: 'cont2',
                    entity_name: 'SO2',
                    entity_type: 'WM'
                },
                {
                    type: 'number',
                    name: 'vol',
                    object_id: 'cont3',
                    entity_name: 'SO3',
                    entity_type: 'WM'
                },
                {
                    type: 'number',
                    name: 'vol',
                    object_id: 'cont4',
                    entity_name: 'SO4',
                    entity_type: 'WM'
                },
                {
                    type: 'number',
                    name: 'vol',
                    object_id: 'cont5',
                    entity_name: 'SO5',
                    entity_type: 'WM'
                }
            ]
        },
        SensorCommand: {
            commands: [
                {
                    name: 'PING',
                    type: 'command'
                }
            ],
            type: 'SensorCommand',
            lazy: []
        },
        WrongStation: {
            commands: [],
            type: 'WrongStation',
            lazy: [],
            active: [
                {
                    object_id: 'v1',
                    name: 'type',
                    type: 'string',
                    entity_name: 'WrongStation1'
                },
                {
                    object_id: 'v2',
                    name: 'id',
                    type: 'string',
                    entity_name: 'WrongStation1'
                },
                {
                    object_id: 'v',
                    name: 'vol',
                    type: 'Number',
                    entity_name: 'WrongStation1'
                }
            ]
        },
        SharedIds1: {
            commands: [],
            type: 'ShareStation',
            lazy: [],
            active: [
                {
                    object_id: 'v1',
                    name: 'volt1',
                    type: 'Number',
                    entity_name: 'WeatherStation1',
                    entity_type: 'Type1'
                },
                {
                    object_id: 'v2',
                    name: 'volt2',
                    type: 'Number',
                    entity_name: 'WeatherStation1',
                    entity_type: 'Type2'
                },
                {
                    object_id: 'v3',
                    name: 'extravolt2',
                    type: 'Number',
                    entity_name: 'WeatherStation1',
                    entity_type: 'Type2'
                },
                {
                    object_id: 'v',
                    name: 'vol',
                    type: 'Number'
                }
            ]
        },
        SharedIds2: {
            commands: [],
            type: 'ShareStation',
            lazy: [],
            active: [
                {
                    object_id: 'v1',
                    name: 'vol',
                    type: 'Number',
                    entity_name: 'WeatherStation1',
                    entity_type: 'Type1'
                },
                {
                    object_id: 'v2',
                    name: 'vol',
                    type: 'Number',
                    entity_name: 'WeatherStation1',
                    entity_type: 'Type2'
                },
                {
                    object_id: 'v3',
                    name: 'extravol',
                    type: 'Number',
                    entity_name: 'WeatherStation1',
                    entity_type: 'Type2'
                },
                {
                    object_id: 'v',
                    name: 'vol',
                    type: 'Number'
                }
            ]
        },
        SharedIds3: {
            commands: [],
            type: 'ShareStation',
            lazy: [],
            active: [
                {
                    object_id: 'fakev1',
                    expression: 'v',
                    name: 'vol',
                    type: 'Number',
                    entity_name: 'WeatherStation1',
                    entity_type: 'Type1'
                },
                {
                    object_id: 'fakev2',
                    expression: 'v',
                    name: 'vol',
                    type: 'Number',
                    entity_name: 'WeatherStation1',
                    entity_type: 'Type2'
                },
                {
                    object_id: 'fakev3',
                    expression: 'v',
                    name: 'extravol',
                    type: 'Number',
                    entity_name: 'WeatherStation1',
                    entity_type: 'Type2'
                },
                {
                    object_id: 'v',
                    name: 'vol',
                    type: 'Number'
                }
            ]
        },
        GPS: {
            commands: [],
            type: 'GPS',
            lazy: [],
            active: [
                {
                    name: 'explicit',
                    type: 'number',
                    entity_name: 'SO5',
                    object_id: 'x'
                },
                {
                    name: 'explicit',
                    type: 'number',
                    entity_name: 'SO6',
                    object_id: 'y'
                }
            ],
            explicitAttrs: true
        },
        GPS1: {
            commands: [],
            type: 'GPS',
            lazy: [],
            active: [
                {
                    name: 'explicit',
                    type: 'number',
                    object_id: 'z'
                },
                {
                    name: 'expectedAtt',
                    type: 'number',
                    expression: 'z+1'
                },
                {
                    name: 'alsoexpectedAtt',
                    type: 'number',
                    expression: 'w+1',
                    skipValue: 'loquesea'
                },
                {
                    name: 'nonexpectedAttByDefaultSkipValue',
                    type: 'number',
                    expression: 'w+1'
                },
                {
                    name: 'explicit',
                    type: 'number',
                    entity_name: 'SO5',
                    object_id: 'x'
                },
                {
                    name: 'explicit',
                    type: 'number',
                    entity_name: 'SO6',
                    object_id: 'y'
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
                    name: 'foo',
                    type: 'text',
                    object_id: 'f'
                },
                {
                    name: 'attr1',
                    type: 'number',
                    entity_name: 'SO5',
                    object_id: 'x'
                },
                {
                    name: 'attr2',
                    type: 'number',
                    entity_name: 'SO6',
                    object_id: 'y'
                }
            ],
            staticAttributes: [
                {
                    name: 'bar',
                    type: 'text',
                    value: 'b'
                }
            ],
            explicitAttrs: '[ "attr1", "attr2" ]'
        },
        LightMultiDefault: {
            commands: [],
            type: 'Light',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Number',
                    entity_type: 'myType',
                    entity_name: 'Ligth:mymulti'
                },
                {
                    object_id: 'q',
                    name: 'pressure',
                    type: 'Number'
                }
            ]
        }
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    useCBflowControl: true
};

describe('NGSI-v2 - Multi-entity plugin', function () {
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

    describe('When an update comes for a multientity measurement', function () {
        const values = [
            {
                name: 'p',
                type: 'centigrades',
                value: '52'
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
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin1.json'
                    )
                )
                .reply(204);
        });

        it('should send two context elements, one for each entity', function (done) {
            iotAgentLib.update('ws4', 'WeatherStation', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for a multientity measurement based on entity_type', function () {
        const values = [
            {
                name: 'p',
                type: 'centigrades',
                value: '52'
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
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin17.json'
                    )
                )
                .reply(204);
        });

        it('should send two context elements, one for each entity', function (done) {
            iotAgentLib.update('ws9b', 'WeatherStation9', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for a multientity measurement with same attribute name', function () {
        const values = [
            {
                name: 'h',
                type: 'Hgmm',
                value: '16'
            }
        ];

        beforeEach(function () {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin4.json'
                    )
                )
                .reply(204);
        });

        it('should send context elements', function (done) {
            iotAgentLib.update('ws5', 'WeatherStation5', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for a multientity multi measurement with same attribute name', function () {
        const values = [
            {
                name: 'h',
                type: 'Hgmm',
                value: '16'
            },
            {
                name: 'p',
                type: 'Hgmm',
                value: '17'
            }
        ];

        beforeEach(function () {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin5.json'
                    )
                )
                .reply(204);
        });

        it('should send context elements', function (done) {
            iotAgentLib.update('ws6', 'WeatherStation6', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    /* jshint maxlen: 200 */
    describe('When an update comes for a multientity multi measurement with metadata and the same attribute name', function () {
        const values = [
            {
                name: 'h',
                type: 'Hgmm',
                value: '16'
            },
            {
                name: 'p',
                type: 'Hgmm',
                value: '17'
            }
        ];

        beforeEach(function () {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin8.json'
                    )
                )
                .reply(204);
        });

        it('should send context elements', function (done) {
            iotAgentLib.update('ws7', 'WeatherStation7', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for a multientity defined with an expression', function () {
        const values = [
            {
                name: 'p',
                type: 'centigrades',
                value: '52'
            },
            {
                name: 'h',
                type: 'Percentage',
                value: '12'
            },
            {
                name: 'sn',
                type: 'Number',
                value: '5'
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin3.json'
                    )
                )
                .reply(204);
        });

        it('should send the update value to the resulting value of the expression', function (done) {
            iotAgentLib.update('ws4', 'WeatherStation3', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for a multientity defined with an expression (multi values)', function () {
        const values = [
            {
                name: 'p',
                type: 'centigrades',
                value: '52'
            },
            {
                name: 'h',
                type: 'Percentage',
                value: '12'
            },
            {
                name: 'sn',
                type: 'Number',
                value: '5'
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin9.json'
                    )
                )
                .reply(204);
        });

        it('should send the update value to the resulting value of the expression', function (done) {
            iotAgentLib.update('ws8', 'WeatherStation4', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for a multientity defined with an expression (multi values / multiple entities / same attribute)', function () {
        const values = [
            {
                name: 'v',
                type: 'Number',
                value: 0
            },
            {
                name: 'v1',
                type: 'Number',
                value: 1
            },
            {
                name: 'v2',
                type: 'Number',
                value: 2
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin10.json'
                    )
                )
                .reply(204);
        });

        it('should send the update value to the resulting value of the expression', function (done) {
            iotAgentLib.update('ws9', 'WeatherStation8', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for a multientity with same entity_id and different entity_type with different attrs', function () {
        const values = [
            {
                name: 'v',
                type: 'Number',
                value: 0
            },
            {
                name: 'v1',
                type: 'Number',
                value: 1
            },
            {
                name: 'v2',
                type: 'Number',
                value: 2
            },
            {
                name: 'v3',
                type: 'Number',
                value: 3
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin12.json'
                    )
                )
                .reply(204);
        });

        it('should send the update value to three entities with different attribute names and different object_id', function (done) {
            iotAgentLib.update('sh1', 'SharedIds1', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for a multientity with same entity_id and different entity_type whit shared attrs', function () {
        const values = [
            {
                name: 'v',
                type: 'Number',
                value: 0
            },
            {
                name: 'v1',
                type: 'Number',
                value: 1
            },
            {
                name: 'v2',
                type: 'Number',
                value: 2
            },
            {
                name: 'v3',
                type: 'Number',
                value: 3
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin13.json'
                    )
                )
                .reply(204);
        });

        it('should send the update value to three entities with same attribute names', function (done) {
            iotAgentLib.update('sh2', 'SharedIds2', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for a multientity with same entity_id and different entity_type whit shared attrs and shared object_id', function () {
        const values = [
            {
                name: 'v',
                type: 'Number',
                value: 0
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin14.json'
                    )
                )
                .reply(204);
        });

        it('should send the update value to three entities with same attribute names', function (done) {
            iotAgentLib.update('sh3', 'SharedIds3', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for a multientity defined with an expression (multi values / multiple entities / same attribute) - JEXL', function () {
        const values = [
            {
                name: 'v',
                type: 'Number',
                value: 0
            },
            {
                name: 'v1',
                type: 'Number',
                value: 1
            },
            {
                name: 'v2',
                type: 'Number',
                value: 2
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin10.json'
                    )
                )
                .reply(204);
        });

        it('should send the update value to the resulting value of the expression', function (done) {
            iotAgentLib.update('ws9', 'WeatherStation8Jexl', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for a multientity defined with an expression (multi values / multiple entities / same attribute) - JEXL with static', function () {
        const values = [
            {
                name: 'v',
                type: 'Number',
                value: 0
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin10b.json'
                    )
                )
                .reply(204);
        });

        it('should send the update value to the resulting value of the expression', function (done) {
            iotAgentLib.update('ws9', 'WeatherStation9Jexl', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    beforeEach(function () {
        nock.cleanAll();

        contextBrokerMock = nock('http://192.168.1.1:1026')
            .matchHeader('fiware-service', 'smartgondor')
            .matchHeader('fiware-servicepath', 'gardens')
            .post(
                '/v2/op/update?options=flowControl',
                utils.readExampleFile(
                    // Updated test same case that updateContextMultientityPlugin4.json
                    './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin11.json'
                )
            )
            .reply(204);
    });

    describe('When an update comes for a multientity whith a wrong mapping', function () {
        const values = [
            {
                name: 'v',
                type: 'Number',
                value: 0
            },
            {
                name: 'v1',
                type: 'Number',
                value: 1
            },
            {
                name: 'v2',
                type: 'Number',
                value: 2
            }
        ];

        beforeEach(function () {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin11.json'
                    )
                )
                .reply(204);
        });

        it('should send the update value to the resulting value of the expression overwriting wrong id and type mapped attributes', function (done) {
            iotAgentLib.update('ws11', 'WrongStation', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for a multientity measurement without type for one entity', function () {
        const values = [
            {
                name: 'p',
                type: 'centigrades',
                value: '52'
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
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin2.json'
                    )
                )
                .reply(204);
        });

        it('should use the device type as a default value', function (done) {
            iotAgentLib.update('ws4', 'WeatherStation2', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for a multientity measurement explicitAttrs for one entity', function () {
        const values = [
            {
                name: 'x',
                type: 'Number',
                value: 52
            },
            {
                name: 'y',
                type: 'Number',
                value: 13
            },
            {
                name: 'z',
                type: 'Number',
                value: 12
            }
        ];

        beforeEach(function () {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin15.json'
                    )
                )
                .reply(204);
        });

        it('should remove hidden attrs from the value', function (done) {
            iotAgentLib.update('gps1', 'GPS', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for a multientity measurement explicitAttrs for several entities', function () {
        const values = [
            {
                name: 'x',
                type: 'Number',
                value: 52
            },
            {
                name: 'y',
                type: 'Number',
                value: 13
            },
            {
                name: 'z',
                type: 'Number',
                value: 12
            }
        ];

        beforeEach(function () {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin25.json'
                    )
                )
                .reply(204);
        });

        it('should remove hidden attrs from the value', function (done) {
            iotAgentLib.update('gps1', 'GPS1', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for a multientity measurement explicitAttrs as jexl for one entity', function () {
        const values = [
            {
                name: 'x',
                type: 'Number',
                value: 52
            },
            {
                name: 'y',
                type: 'Number',
                value: 13
            },
            {
                name: 'z',
                type: 'Number',
                value: 12
            }
        ];

        beforeEach(function () {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin16.json'
                    )
                )
                .reply(204);
        });

        it('should remove hidden attrs from the value', function (done) {
            iotAgentLib.update('gps1', 'GPS2', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe(
        'When an update comes for a multientity measurement and there are attributes with' +
            ' the same name but different alias and mapped to different CB entities',
        function () {
            const values = [
                {
                    name: 'cont1',
                    type: 'number',
                    value: '38'
                }
            ];

            beforeEach(function () {
                nock.cleanAll();
                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartgondor')
                    .matchHeader('fiware-servicepath', 'gardens')
                    .post(
                        '/v2/op/update?options=flowControl',
                        utils.readExampleFile(
                            './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin6.json'
                        )
                    )
                    .reply(204);
            });

            it('should update only the appropriate CB entity', function (done) {
                iotAgentLib.update('Sensor', 'Sensor001', '', values, function (error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        }
    );

    describe(
        'When an update comes for a multientity multi measurement and there are attributes with' +
            ' the same name but different alias and mapped to different CB entities',
        function () {
            const values = [
                {
                    name: 'cont1',
                    type: 'number',
                    value: '38'
                },
                {
                    name: 'cont2',
                    type: 'number',
                    value: '39'
                },
                {
                    name: 'cont3',
                    type: 'number',
                    value: '40'
                },
                {
                    name: 'cont5',
                    type: 'number',
                    value: '42'
                }
            ];

            beforeEach(function () {
                nock.cleanAll();
                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartgondor')
                    .matchHeader('fiware-servicepath', 'gardens')
                    .post(
                        '/v2/op/update?options=flowControl',
                        utils.readExampleFile(
                            './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityPlugin7.json'
                        )
                    )
                    .reply(204);
            });

            it('should update only the appropriate CB entity', function (done) {
                iotAgentLib.update('Sensor', 'Sensor001', '', values, function (error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        }
    );

    describe('When pseudo-multientity device is provisioned (entity_type and default entity_id)', function () {
        // Case: Expression which results is sent as a new attribute
        const values = [
            {
                name: 'p',
                type: 'Number',
                value: 90
            },
            {
                name: 'q',
                type: 'Number',
                value: 60
            }
        ];

        beforeEach(function () {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityJexlExpressionPlugin1.json'
                    )
                )
                .reply(204);
        });

        it('should work without invalid expression error', function (done) {
            iotAgentLib.update('lightPseudo:id', 'LightMultiDefault', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});

describe('NGSI-v2 - Multi-entity plugin is executed before timestamp process plugin', function () {
    beforeEach(function (done) {
        logger.setLevel('DEBUG');
        iotAgentConfig.timestamp = true;
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

    describe('When an update comes for a multientity measurement and timestamp is enabled in config file', function () {
        const values = [
            {
                name: 'p',
                type: 'centigrades',
                value: '52'
            },
            {
                name: 'h',
                type: 'Percentage',
                value: '12'
            },
            {
                name: 'TimeInstant',
                type: 'DateTime',
                value: '2016-05-30T16:25:22.304Z'
            }
        ];

        const singleValue = [
            {
                name: 'h',
                type: 'Percentage',
                value: '12'
            }
        ];

        beforeEach(function () {
            nock.cleanAll();
        });

        it('should send two context elements, one for each entity', function (done) {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/op/update?options=flowControl', function (body) {
                    const expectedBody = utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityTimestampPlugin1.json'
                    );
                    // Note that TimeInstant fields are not included in the json used by this mock as they are dynamic
                    // fields. The following code just checks that TimeInstant fields are present.
                    if (!body.entities[1].TimeInstant || !body.entities[1].humidity.metadata.TimeInstant) {
                        return false;
                    }

                    const timeInstantEntity = body.entities[1].TimeInstant;
                    const timeInstantAtt = body.entities[1].humidity.metadata.TimeInstant;
                    if (
                        moment(timeInstantEntity, 'YYYY-MM-DDTHH:mm:ss.SSSZ').isValid &&
                        moment(timeInstantAtt, 'YYYY-MM-DDTHH:mm:ss.SSSZ').isValid
                    ) {
                        delete body.entities[1].TimeInstant;
                        delete body.entities[1].humidity.metadata.TimeInstant;

                        delete expectedBody.entities[1].TimeInstant;
                        delete expectedBody.entities[1].humidity.metadata.TimeInstant;
                        return utils.deepEqual(body, expectedBody);
                    }
                    return false;
                })
                .reply(204);

            iotAgentLib.update('ws4', 'WeatherStation', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });

        it('should send two context elements, one for each entity bis', function (done) {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/op/update?options=flowControl', function (body) {
                    const expectedBody = utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityTimestampPlugin2.json'
                    );
                    // Note that TimeInstant fields are not included in the json used by this mock as they are dynamic
                    // fields. The following code just checks that TimeInstant fields are present.
                    if (!body.entities[0].TimeInstant || !body.entities[0].humidity.metadata.TimeInstant) {
                        return false;
                    }

                    const timeInstantEntity2 = body.entities[0].TimeInstant;
                    const timeInstantAtt = body.entities[0].humidity.metadata.TimeInstant;
                    if (
                        moment(timeInstantEntity2, 'YYYY-MM-DDTHH:mm:ss.SSSZ').isValid &&
                        moment(timeInstantAtt, 'YYYY-MM-DDTHH:mm:ss.SSSZ').isValid
                    ) {
                        delete body.entities[0].TimeInstant;
                        delete body.entities[0].humidity.metadata.TimeInstant;

                        delete expectedBody.entities[0].TimeInstant;
                        delete expectedBody.entities[0].humidity.metadata.TimeInstant;
                        return utils.deepEqual(body, expectedBody);
                    }
                    return false;
                })
                .reply(204);

            iotAgentLib.update('ws4', 'WeatherStation', '', singleValue, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });

        it('should propagate user provider timestamp to mapped entities', function (done) {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/op/update?options=flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityTimestampPlugin3.json'
                    )
                )
                .reply(204);

            const tsValue = [
                {
                    name: 'h',
                    type: 'Percentage',
                    value: '16'
                },
                {
                    // Note this timestamp is the one used at updateContextMultientityTimestampPlugin3.json
                    name: 'TimeInstant',
                    type: 'DateTime',
                    value: '2018-06-13T13:28:34.611Z'
                }
            ];
            iotAgentLib.update('ws5', 'WeatherStation10', '', tsValue, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});

describe('NGSI-v2 - Multi-entity plugin is executed for a command update for a regular entity ', function () {
    beforeEach(function (done) {
        logger.setLevel('FATAL');
        iotAgentConfig.timestamp = true;
        const time = new Date(1438760101468); // 2015-08-05T07:35:01.468+00:00
        timekeeper.freeze(time);
        iotAgentLib.activate(iotAgentConfig, function () {
            iotAgentLib.clearAll(function () {
                done();
            });
        });
    });

    afterEach(function (done) {
        timekeeper.reset();
        iotAgentLib.clearAll(function () {
            iotAgentLib.deactivate(done);
        });
    });

    it('Should send the update to the context broker', function (done) {
        contextBrokerMock = nock('http://192.168.1.1:1026')
            .matchHeader('fiware-service', 'smartgondor')
            .matchHeader('fiware-servicepath', 'gardens')
            .post(
                '/v2/entities?options=upsert,flowControl',
                utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityTimestampPlugin4.json'
                )
            )
            .reply(204);
        const commands = [
            {
                name: 'PING_status',
                type: 'commandStatus',
                value: 'OK'
            },
            {
                name: 'PING_info',
                type: 'commandResult',
                value: '1234567890'
            }
        ];

        iotAgentLib.update('sensorCommand', 'SensorCommand', '', commands, function (error) {
            should.not.exist(error);
            contextBrokerMock.done();
            done();
        });
    });
});
