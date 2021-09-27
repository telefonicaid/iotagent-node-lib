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
        port: 4041
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
                    entity_name: 'Station Number ${@sn * 10}'
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
                    entity_name: 'Station Number ${@sn * 10}'
                },
                {
                    object_id: 'h',
                    name: 'humidity',
                    type: 'Percentage',
                    entity_name: 'Station Number ${@sn * 10}'
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
                    expression: '${@v1*100}',
                    type: 'Number',
                    entity_name: 'WeatherStation1'
                },
                {
                    object_id: 'v2',
                    name: 'vol',
                    expression: '${@v2*100}',
                    type: 'Number',
                    entity_name: 'WeatherStation2'
                },
                {
                    object_id: 'v',
                    name: 'vol',
                    expression: '${@v*100}',
                    type: 'Number'
                }
            ]
        },
        WeatherStation8Jexl: {
            commands: [],
            type: 'WeatherStation',
            expressionLanguage: 'jexl',
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
        }
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com'
};

describe('NGSI-v2 - Multi-entity plugin', function () {
    beforeEach(function (done) {
        logger.setLevel('FATAL');

        iotAgentLib.activate(iotAgentConfig, function () {
            iotAgentLib.clearAll(function () {
                iotAgentLib.addUpdateMiddleware(iotAgentLib.dataPlugins.attributeAlias.update);
                iotAgentLib.addQueryMiddleware(iotAgentLib.dataPlugins.attributeAlias.query);
                iotAgentLib.addUpdateMiddleware(iotAgentLib.dataPlugins.expressionTransformation.update);
                iotAgentLib.addUpdateMiddleware(iotAgentLib.dataPlugins.multiEntity.update);
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
                    '/v2/op/update',
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
                    '/v2/op/update',
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
                    '/v2/op/update',
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
                    '/v2/op/update',
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
                    '/v2/op/update',
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
                    '/v2/op/update',
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
                    '/v2/op/update',
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
                    '/v2/op/update',
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
                    '/v2/op/update',
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
                        '/v2/op/update',
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
                        '/v2/op/update',
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
});

describe('NGSI-v2 - Multi-entity plugin is executed before timestamp process plugin', function () {
    beforeEach(function (done) {
        logger.setLevel('FATAL');

        iotAgentConfig.timestamp = true;
        iotAgentLib.activate(iotAgentConfig, function () {
            iotAgentLib.clearAll(function () {
                iotAgentLib.addUpdateMiddleware(iotAgentLib.dataPlugins.attributeAlias.update);
                iotAgentLib.addQueryMiddleware(iotAgentLib.dataPlugins.attributeAlias.query);
                iotAgentLib.addUpdateMiddleware(iotAgentLib.dataPlugins.multiEntity.update);
                iotAgentLib.addUpdateMiddleware(iotAgentLib.dataPlugins.timestampProcess.update);
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
                .post('/v2/op/update', function (body) {
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
                        return JSON.stringify(body) === JSON.stringify(expectedBody);
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

        it('should send two context elements, one for each entity', function (done) {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/op/update', function (body) {
                    const expectedBody = utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextMultientityTimestampPlugin2.json'
                    );
                    // Note that TimeInstant fields are not included in the json used by this mock as they are dynamic
                    // fields. The following code just checks that TimeInstant fields are present.
                    if (!body.entities[1].TimeInstant || !body.entities[1].humidity.metadata.TimeInstant) {
                        return false;
                    }

                    const timeInstantEntity2 = body.entities[1].TimeInstant;
                    const timeInstantAtt = body.entities[1].humidity.metadata.TimeInstant;
                    if (
                        moment(timeInstantEntity2, 'YYYY-MM-DDTHH:mm:ss.SSSZ').isValid &&
                        moment(timeInstantAtt, 'YYYY-MM-DDTHH:mm:ss.SSSZ').isValid
                    ) {
                        delete body.entities[1].TimeInstant;
                        delete body.entities[1].humidity.metadata.TimeInstant;

                        delete expectedBody.entities[1].TimeInstant;
                        delete expectedBody.entities[1].humidity.metadata.TimeInstant;
                        return JSON.stringify(body) === JSON.stringify(expectedBody);
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
                    '/v2/op/update',
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

            iotAgentLib.update('ws5', 'WeatherStation', '', tsValue, function (error) {
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
                iotAgentLib.addUpdateMiddleware(iotAgentLib.dataPlugins.attributeAlias.update);
                iotAgentLib.addQueryMiddleware(iotAgentLib.dataPlugins.attributeAlias.query);
                iotAgentLib.addUpdateMiddleware(iotAgentLib.dataPlugins.multiEntity.update);
                iotAgentLib.addUpdateMiddleware(iotAgentLib.dataPlugins.timestampProcess.update);
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
                '/v2/op/update',
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
