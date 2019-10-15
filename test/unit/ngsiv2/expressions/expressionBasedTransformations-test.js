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
'use strict';

/* jshint camelcase: false */

var iotAgentLib = require('../../../../lib/fiware-iotagent-lib'),
    utils = require('../../../tools/utils'),
    should = require('should'),
    logger = require('logops'),
    nock = require('nock'),
    contextBrokerMock,
    iotAgentConfig = {
        logLevel: 'FATAL',
        contextBroker: {
            host: '192.168.1.1',
            port: '1026',
            ngsiVersion: 'v2'
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
                    },
                    {
                        object_id: 'u',
                        name: 'updated',
                        type: 'Boolean',
                    },
                    {
                        object_id: 'm',
                        name: 'manufacturer',
                        type: 'Object',
                    },
                    {
                        object_id: 'r',
                        name: 'revisions',
                        type: 'Array',
                    },
                    {
                        object_id: 'x',
                        name: 'consumption_x',
                        type: 'Number',
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
                        type: 'Number',
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
                        type: 'Number',
                        expression: '${@pressure * 20}'
                    },
                    {
                        object_id: 'e',
                        name: 'consumption',
                        type: 'Number',
                        expression: '${@consumption * 20}'
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
                    },
                    {
                        object_id: 'a',
                        name: 'alive',
                        type: 'None',
                        expression: '${@alive *  20}'
                    },
                    {
                        object_id: 'u',
                        name: 'updated',
                        type: 'Boolean',
                        expression: '${@updated *  20}'
                    },
                ]
            },
            'WeatherStationMultiple': {
                commands: [],
                type: 'WeatherStation',
                lazy: [],
                active: [

                    {
                        object_id: 'p',
                        name: 'pressure',
                        type: 'Number',
                        expression: '${trim(@pressure)}'
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
                        expression: '${trim(@consumption)}'
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
                    },
                    {
                        object_id: 'a',
                        name: 'alive',
                        type: 'None',
                        expression: '${trim(@alive)}'
                    },
                    {
                        object_id: 'u',
                        name: 'updated',
                        type: 'Boolean',
                        expression: '${trim(@updated)}'
                    },
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

    describe('When an update comes for expressions with syntax errors', function() {
        // Case: Update for an attribute with bad expression
        var values = [
            {
                name: 'p',
                type: 'centigrades',
                value: '52'
            }
        ];

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
        // Case: Expression which results is sent as a new attribute
        var values = [
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

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/ws1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin2.json'))
                .query({type: 'WeatherStation'})
                .reply(204);
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
        // Case: Update for integer and string attributes with expression

        var values = [
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

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/ws1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin4.json'))
                .query({type: 'WeatherStation'})
                .reply(204);
        });

        it('should calculate it and add it to the payload', function(done) {
            iotAgentLib.update('ws1', 'WeatherStationMultiple', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes without expressions and type integer', function() {
        // Case: Update for an integer attribute without expression
        var values = [
            {
                name: 'e',
                type: 'Number',
                value: 52
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin11.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes with numeric expressions and type integer', function() {
        // Case: Update for an integer attribute with arithmetic expression
        var values = [
            {
                name: 'p',
                type: 'Number',
                value: 52
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/ws1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin1.json'))
                .query({type: 'WeatherStation'})
                .reply(204);
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('ws1', 'WeatherStation', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes with string expression and type integer', function() {
        // Case: Update for an integer attribute with string expression
        var values = [
            {
                name: 'e',
                type: 'Number',
                value: 52
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/ws1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin11.json'))
                .query({type: 'WeatherStation'})
                .reply(204);
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('ws1', 'WeatherStationMultiple', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes without expressions and type float', function() {
        // Case: Update for a Float attribute without expressions

        var values = [
            {
                name: 'e',
                type: 'Number',
                value: 0.44
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin3.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes with numeric expressions and type float', function() {
        // Case: Update for a Float attribute with arithmetic expression

        var values = [
            {
                name: 'e',
                type: 'Number',
                value: 0.44
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/ws1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin8.json'))
                .query({type: 'WeatherStation'})
                .reply(204);
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('ws1', 'WeatherStation', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes with string expressions and type float', function() {
        // Case: Update for a Float attribute with string expression

        var values = [
            {
                name: 'e',
                type: 'Number',
                value: 0.44
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/ws1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin3.json'))
                .query({type: 'WeatherStation'})
                .reply(204);
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('ws1', 'WeatherStationMultiple', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes without expressions and NULL type', function() {
        // Case: Update for a Null attribute without expression

        var values = [
            {
                name: 'a',
                type: 'None',
                value: null
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin5.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes with numeric expressions and NULL type', function() {
        // Case: Update for a Null attribute with arithmetic expression

        var values = [
            {
                name: 'a',
                type: 'None',
                value: null
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/ws1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin5.json'))
                .query({type: 'WeatherStation'})
                .reply(204);
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('ws1', 'WeatherStation', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes with string expressions and NULL type', function() {
        // Case: Update for a Null attribute with string expression

        var values = [
            {
                name: 'a',
                type: 'None',
                value: null
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/ws1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin5.json'))
                .query({type: 'WeatherStation'})
                .reply(204);
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('ws1', 'WeatherStationMultiple', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes without expressions and Boolean type', function() {
        // Case: Update for a Boolean attribute without expression

        var values = [
            {
                name: 'u',
                type: 'Boolean',
                value: true
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin9.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes with numeric expressions and Boolean type', function() {
        // Case: Update for a Boolean attribute with arithmetic expression

        var values = [
            {
                name: 'u',
                type: 'Boolean',
                value: true
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/ws1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin10.json'))
                .query({type: 'WeatherStation'})
                .reply(204);
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('ws1', 'WeatherStation', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes with string expressions and Boolean type', function() {
        // Case: Update for a Boolean attribute with string expression
        var values = [
            {
                name: 'u',
                type: 'Boolean',
                value: true
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/ws1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin9.json'))
                .query({type: 'WeatherStation'})
                .reply(204);
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('ws1', 'WeatherStationMultiple', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes without expressions and Object type', function() {
        // Case: Update for a JSON document attribute without expression
        var values = [
            {
                name: 'm',
                type: 'Object',
                value: { name: 'Manufacturer1', VAT: 'U12345678' }
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin6.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes without expressions and Object type', function() {
        // Case: Update for a JSON array attribute without expression

        var values = [
            {
                name: 'r',
                type: 'Object',
                value: ['v0.1', 'v0.2', 'v0.3']
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin7.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When there are expressions including other attributes and they are not updated', function() {

        var values = [
            {
                name: 'x',
                type: 'Number',
                value: 0.44
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin12.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When there are expressions including other attributes and they are updated', function() {

        var values = [
            {
                name: 'p',
                type: 'Number',
                value: 10
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin13.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When there are expressions including other attributes and they are updated' +
        '(overriding situation)', function() {

        var values = [
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

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextExpressionPlugin13.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should apply the expression before sending the values', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

});
