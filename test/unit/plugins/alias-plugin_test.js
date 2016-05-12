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
                .post('/v1/updateContext', utils.readExampleFile(
                    './test/unit/examples/contextRequests/updateContextAliasPlugin.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/updateContextAliasPluginSuccess.json'));
        });

        it('should rename the attributes as expected by the mappings', function(done) {
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
                .post('/v1/updateContext', utils.readExampleFile(
                    './test/unit/examples/contextRequests/updateContextAliasPlugin2.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/updateContextAliasPlugin2Success.json'));
        });

        it('should rename the attributes as expected by the mappings', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});
