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
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 */
'use strict';

/* jshint camelcase: false */

var iotAgentLib = require('../../../lib/fiware-iotagent-lib'),
    utils = require('../../tools/utils'),
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
                lazy: [],
                active: [
                    {
                        object_id: 'p',
                        name: 'pressure',
                        type: 'Hgmm',
                        expression: '${@pressure * 20}'
                    }
                ]
            },
            'LightError': {
                commands: [],
                type: 'Light',
                lazy: [],
                active: [
                    {
                        object_id: 'p',
                        name: 'pressure',
                        type: 'Hgmm',
                        expression: '${@pressure * / 20}'
                    }
                ]
            },
            'WeatherStation': {
                commands: [],
                type: 'WeatherStation',
                lazy: [],
                active: [
                    {
                        object_id: 'p',
                        name: 'pressure',
                        type: 'Hgmm',
                        expression: '${@pressure * 20}'
                    },
                    {
                        object_id: 'h',
                        name: 'humidity',
                        type: 'Percentage'
                    },
                    {
                        name: 'weather',
                        type: 'Summary',
                        expression: 'Humidity ${@humidity / 2} and pressure ${@pressure * 20}'
                    }
                ]
            },
            'WeatherStationMultiple': {
                commands: [],
                type: 'WeatherStation',
                lazy: [],
                active: [
                    {
                        object_id: 'p',
                        name: 'pressure25',
                        type: 'Hgmm',
                        expression: '${@pressure * 20}'
                    },
                    {
                        object_id: 'h',
                        name: 'humidity12',
                        type: 'Percentage'
                    },
                    {
                        name: 'weather',
                        type: 'Summary',
                        expression: 'Humidity ${@humidity12 / 2} and pressure ${@pressure25 * 20}'
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

describe('Expression-based transformations plugin', function() {
    beforeEach(function(done) {
        logger.setLevel('FATAL');

        iotAgentLib.activate(iotAgentConfig, function() {
            iotAgentLib.clearAll(function() {
                iotAgentLib.addUpdateMiddleware(iotAgentLib.dataPlugins.attributeAlias.update);
                iotAgentLib.addQueryMiddleware(iotAgentLib.dataPlugins.attributeAlias.query);
                iotAgentLib.addUpdateMiddleware(iotAgentLib.dataPlugins.expressionTransformation.update);
                done();
            });
        });
    });

    afterEach(function(done) {
        iotAgentLib.clearAll(function() {
            iotAgentLib.deactivate(done);
        });
    });

    describe('When an update comes for attributes with expressions', function() {
        var values = [
            {
                name: 'p',
                type: 'centigrades',
                value: '52'
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext', utils.readExampleFile(
                    './test/unit/examples/contextRequests/updateContextExpressionPlugin1.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/updateContextExpressionPlugin1Success.json'));
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for expressions with syntax errors', function() {
        var values = [
            {
                name: 'p',
                type: 'centigrades',
                value: '52'
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext', utils.readExampleFile(
                    './test/unit/examples/contextRequests/updateContextExpressionPlugin4.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/updateContextExpressionPlugin1Success.json'));
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('light1', 'LightError', '', values, function(error) {
                should.exist(error);
                error.name.should.equal('INVALID_EXPRESSION');
                error.code.should.equal(400);
                done();
            });
        });
    });

    describe('When there are expression attributes that are just calculated (not sent by the device)', function() {
        var values = [
            {
                name: 'p',
                type: 'centigrades',
                value: '52'
            },
            {
                name: 'h',
                type: 'percentage',
                value: '12'
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext', utils.readExampleFile(
                    './test/unit/examples/contextRequests/updateContextExpressionPlugin2.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/updateContextExpressionPlugin2Success.json'));
        });

        it('should calculate them and add them to the payload', function(done) {
            iotAgentLib.update('ws1', 'WeatherStation', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an expression with multiple variables with numbers arrive', function() {
        var values = [
            {
                name: 'p',
                type: 'centigrades',
                value: '52'
            },
            {
                name: 'h',
                type: 'percentage',
                value: '12'
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext', utils.readExampleFile(
                    './test/unit/examples/contextRequests/updateContextExpressionPlugin5.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/updateContextExpressionPlugin5Success.json'));
        });

        it('should calculate it and add it to the payload', function(done) {
            iotAgentLib.update('ws1', 'WeatherStationMultiple', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When a measure arrives and there is not enough information to calculate an expression', function() {
        var values = [
            {
                name: 'p',
                type: 'centigrades',
                value: '52'
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext', utils.readExampleFile(
                    './test/unit/examples/contextRequests/updateContextExpressionPlugin3.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/updateContextExpressionPlugin3Success.json'));
        });

        it('should not calculate the expression', function(done) {
            iotAgentLib.update('ws1', 'WeatherStation', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});
