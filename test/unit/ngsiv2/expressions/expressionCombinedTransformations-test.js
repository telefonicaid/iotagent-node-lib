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
let contextBrokerMock;
const iotAgentConfigJexl = {
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'v2'
    },
    server: {
        port: 4041
    },
    defaultExpressionLanguage: 'jexl',
    types: {
        WeatherStationLegacy: {
            commands: [],
            type: 'WeatherStation',
            expressionLanguage: 'legacy',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Number',
                    expression: '${@pressure * 20}'
                }
            ]
        },
        WeatherStationJexl: {
            commands: [],
            type: 'WeatherStation',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Number',
                    expression: 'pressure * 20'
                }
            ]
        }
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M',
    throttling: 'PT5S'
};
const iotAgentConfigLegacy = {
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'v2'
    },
    server: {
        port: 4041
    },
    types: {
        WeatherStationLegacy: {
            commands: [],
            type: 'WeatherStation',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Number',
                    expression: '${@pressure * 20}'
                }
            ]
        },
        WeatherStationJexl: {
            commands: [],
            type: 'WeatherStation',
            expressionLanguage: 'jexl',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Number',
                    expression: 'pressure * 20'
                }
            ]
        }
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M',
    throttling: 'PT5S'
};

describe('Combine Jexl and legacy expressions (default JEXL) - NGSI v2', function () {
    beforeEach(function (done) {
        logger.setLevel('FATAL');

        iotAgentLib.activate(iotAgentConfigJexl, function () {
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

    describe('When an update comes for type with expression "legacy"', function () {
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
                .patch(
                    '/v2/entities/ws1/attrs',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin15.json'
                    )
                )
                .query({ type: 'WeatherStation' })
                .reply(204);
        });

        it('should apply the legacy expression before sending the values', function (done) {
            iotAgentLib.update('ws1', 'WeatherStationLegacy', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for type with expression "JEXL" - default', function () {
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
                .patch(
                    '/v2/entities/ws2/attrs',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin15.json'
                    )
                )
                .query({ type: 'WeatherStation' })
                .reply(204);
        });

        it('should apply the default (JEXL) expression before sending the values', function (done) {
            iotAgentLib.update('ws2', 'WeatherStationJexl', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});

describe('Combine Jexl and legacy expressions (default Legacy) - NGSI v2', function () {
    beforeEach(function (done) {
        logger.setLevel('FATAL');

        iotAgentLib.activate(iotAgentConfigLegacy, function () {
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

    describe('When an update comes for type with expression "legacy" - default', function () {
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
                .patch(
                    '/v2/entities/ws3/attrs',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin15.json'
                    )
                )
                .query({ type: 'WeatherStation' })
                .reply(204);
        });

        it('should apply the legacy expression before sending the values', function (done) {
            iotAgentLib.update('ws3', 'WeatherStationLegacy', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for type with expression "JEXL"', function () {
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
                .patch(
                    '/v2/entities/ws4/attrs',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin15.json'
                    )
                )
                .query({ type: 'WeatherStation' })
                .reply(204);
        });

        it('should apply the default (JEXL) expression before sending the values', function (done) {
            iotAgentLib.update('ws4', 'WeatherStationJexl', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});
