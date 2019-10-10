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
        autocast: true,
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
                lazy: [
                    {
                        object_id: 't',
                        name: 'temperature',
                        type: 'centigrades'
                    }
                ],
                active: [
                    {
                        object_id: 'p',
                        name: 'pressure',
                        type: 'Hgmm'
                    },
                    {
                        object_id: 'l',
                        name: 'luminance',
                        type: 'lumens'
                    },
                    {
                        object_id: 'ut',
                        name: 'unix_timestamp',
                        type: 'Number'
                    },
                    {
                        object_id: 'ap',
                        name: 'active_power',
                        type: 'Number'
                    },
                    {
                        object_id: 'ap',
                        name: 'active_power',
                        type: 'Number'
                    },
                    {
                        object_id: 's',
                        name: 'status',
                        type: 'Boolean'
                    },
                    {
                        object_id: 'al',
                        name: 'keep_alive',
                        type: 'None'
                    },
                    {
                        object_id: 'ta',
                        name: 'tags',
                        type: 'Array'
                    },
                    {
                        object_id: 'c',
                        name: 'configuration',
                        type: 'Object'
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

describe('Attribute alias plugin', function() {
    beforeEach(function(done) {
        logger.setLevel('FATAL');

        iotAgentLib.activate(iotAgentConfig, function() {
            iotAgentLib.clearAll(function() {
                iotAgentLib.addUpdateMiddleware(iotAgentLib.dataPlugins.attributeAlias.update);
                iotAgentLib.addQueryMiddleware(iotAgentLib.dataPlugins.attributeAlias.query);
                done();
            });
        });
    });

    afterEach(function(done) {
        iotAgentLib.clearAll(function() {
            iotAgentLib.deactivate(done);
        });
    });
    describe('When an update comes for attributes with aliases', function() {
        var values = [
            {
                name: 't',
                type: 'centigrades',
                value: '52'
            },
            {
                name: 'p',
                type: 'Hgmm',
                value: '20071103T131805'
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextAliasPlugin1.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should rename the attributes as expected by the alias mappings' +
            'and cast values to JSON native types', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
    describe('When an update comes for attributes with aliases and a different type', function() {
        var values = [
            {
                name: 'l',
                type: 'lums',
                value: '9'
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextAliasPlugin2.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should rename the attributes as expected by the alias mappings' +
            'and cast values to JSON native types', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
    describe('When an update comes for attributes with aliases and integer type', function() {
        var values = [
            {
                name: 'ut',
                type: 'Number',
                value: '99823423'
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextAliasPlugin3.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should rename the attributes as expected by the mappings', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes with aliases and integer type.', function() {
        var values = [
            {
                name: 'ut',
                type: 'Number',
                value: '99823423'
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextAliasPlugin3.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should rename the attributes as expected by the alias mappings' +
            'and cast values to JSON native types', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes with aliases and float type', function() {
        var values = [
            {
                name: 'ap',
                type: 'Number',
                value: '0.45'
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextAliasPlugin4.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should rename the attributes as expected by the alias mappings' +
            'and cast values to JSON native types', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes with aliases and boolean type', function() {
        var values = [
            {
                name: 's',
                type: 'Boolean',
                value: false
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextAliasPlugin5.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should rename the attributes as expected by the alias mappings' +
            'and cast values to JSON native types', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes with aliases and None type', function() {
        var values = [
            {
                name: 'al',
                type: 'None',
                value: 'null'
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextAliasPlugin6.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should rename the attributes as expected by the alias mappings' +
            'and cast values to JSON native types', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes with aliases and Array type', function() {
        var values = [
            {
                name: 'ta',
                type: 'Array',
                value: '["iot","device"]'
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextAliasPlugin7.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should rename the attributes as expected by the alias mappings' +
            'and cast values to JSON native types', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes for attributes with aliases and Object type', function() {
        var values = [
            {
                name: 'c',
                type: 'Object',
                value: '{"firmware": {"version": "1.1.0","hash": "cf23df2207d99a74fbe169e3eba035e633b65d94"}}'
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextAliasPlugin8.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should rename the attributes as expected by the alias mappings' +
            'and cast values to JSON native types', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });


    describe('When an update comes for attributes with aliases and Object type, but value is String', function() {
        var values = [
            {
                name: 'c',
                type: 'Object',
                value: 'string_value'
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextAliasPlugin9.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should rename the attributes as expected by the alias mappings' +
            'and cast values to JSON native types', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});
