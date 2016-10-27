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
            'WeatherStation': {
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
                        entity_type: 'Higrometer'
                    }
                ]
            },
            'WeatherStation2': {
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
                    }
                ]
            },
            'WeatherStation3': {
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
                        entity_name: 'Station Number ${@sn * 10}',
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

describe('Multi-entity plugin', function() {
    beforeEach(function(done) {
        logger.setLevel('FATAL');

        iotAgentLib.activate(iotAgentConfig, function() {
            iotAgentLib.clearAll(function() {
                iotAgentLib.addUpdateMiddleware(iotAgentLib.dataPlugins.attributeAlias.update);
                iotAgentLib.addQueryMiddleware(iotAgentLib.dataPlugins.attributeAlias.query);
                iotAgentLib.addUpdateMiddleware(iotAgentLib.dataPlugins.multiEntity.update);
                done();
            });
        });
    });

    afterEach(function(done) {
        iotAgentLib.clearAll(function() {
            iotAgentLib.deactivate(done);
        });
    });

    describe('When an update comes for a multientity measurement', function() {
        var values = [
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

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext', utils.readExampleFile(
                    './test/unit/examples/contextRequests/updateContextMultientityPlugin1.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/updateContextMultientityPlugin1Success.json'));
        });

        it('should send two context elements, one for each entity', function(done) {
            iotAgentLib.update('ws4', 'WeatherStation', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for a multientity defined with an expression', function() {
        var values = [
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

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext', utils.readExampleFile(
                    './test/unit/examples/contextRequests/updateContextMultientityPlugin3.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/updateContextMultientityPlugin3Success.json'));
        });

        it('should send the update value to the resulting value of the expression', function(done) {
            iotAgentLib.update('ws4', 'WeatherStation3', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });


    describe('When an update comes for a multientity measurement without type for one entity', function() {
        var values = [
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

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext', utils.readExampleFile(
                    './test/unit/examples/contextRequests/updateContextMultientityPlugin2.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/updateContextMultientityPlugin2Success.json'));
        });

        it('should use the device type as a default value', function(done) {
            iotAgentLib.update('ws4', 'WeatherStation2', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});
