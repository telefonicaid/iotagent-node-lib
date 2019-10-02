/*
 * Copyright 2015 Telefonica Investigación y Desarrollo, S.A.U
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
 * please contact with::daniel.moranjimenez@telefonica.com
 *
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */

'use strict';

var iotAgentLib = require('../../../../lib/fiware-iotagent-lib'),
    utils = require('../../../tools/utils'),
    should = require('should'),
    logger = require('logops'),
    nock = require('nock'),
    contextBrokerMock,
    iotAgentConfig = {
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
                        name: 'temperature',
                        type: 'centigrades'
                    }
                ],
                active: [
                    {
                        name: 'pressure',
                        type: 'Hgmm'
                    }
                ]
            },
            'BrokenLight': {
                commands: [],
                lazy: [
                    {
                        name: 'temperature',
                        type: 'centigrades'
                    }
                ],
                active: [
                    {
                        name: 'pressure',
                        type: 'Hgmm'
                    }
                ]
            },
            'Termometer': {
                type: 'Termometer',
                commands: [],
                lazy: [
                    {
                        name: 'temp',
                        type: 'kelvin'
                    }
                ],
                active: [
                ]
            },
            'Humidity': {
                type: 'Humidity',
                cbHost: 'http://192.168.1.1:3024',
                commands: [],
                lazy: [],
                active: [
                    {
                        name: 'humidity',
                        type: 'percentage'
                    }
                ]
            },
            'Motion': {
                type: 'Motion',
                commands: [],
                lazy: [],
                staticAttributes: [
                    {
                        'name': 'location',
                        'type': 'Vector',
                        'value': '(123,523)'
                    }
                ],
                active: [
                    {
                        name: 'humidity',
                        type: 'percentage'
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

describe('Timestamp compression plugin', function() {
    beforeEach(function(done) {
        logger.setLevel('FATAL');
        iotAgentLib.activate(iotAgentConfig, function() {
            iotAgentLib.clearAll(function() {
                iotAgentLib.addUpdateMiddleware(iotAgentLib.dataPlugins.compressTimestamp.updateNgsi2);
                iotAgentLib.addQueryMiddleware(iotAgentLib.dataPlugins.compressTimestamp.queryNgsi2);
                done();
            });
        });
    });

    afterEach(function(done) {
        iotAgentLib.clearAll(function() {
            iotAgentLib.deactivate(done);
        });
    });
    describe('When an update comes with a timestamp through the plugin', function() {
        var values = [
            {
                name: 'state',
                type: 'Boolean',
                value: 'true'
            },
            {
                name: 'TheTargetValue',
                type: 'DateTime',
                value: '20071103T131805'
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateContextCompressTimestamp1.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should return an entity with all its timestamps expanded to have separators', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an update comes with a timestamp through the plugin with metadata', function() {
        var values = [
            {
                name: 'state',
                type: 'Boolean',
                value: true,
                metadata: [
                    {
                        name: 'TimeInstant',
                        type: 'DateTime',
                        value: '20071103T131805'
                    }
                ]
            },
            {
                name: 'TheTargetValue',
                type: 'DateTime',
                value: '20071103T131805'
            }
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities/light1/attrs', utils.readExampleFile(
                './test/unit/ngsiv2/examples/contextRequests/updateContextCompressTimestamp2.json'))
                .query({type: 'Light'})
                .reply(204);
        });

        it('should return an entity with all its timestamps expanded to have separators', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When a query comes for a timestamp through the plugin', function() {
        var values = [
            'state',
            'TheTargetValue'
        ];

        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .get('/v2/entities/light1/attrs?attrs=state,TheTargetValue&type=Light')
                .reply(200, utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextResponses/queryContextCompressTimestamp1Success.json'));
        });

        it('should return an entity with all its timestamps without separators (basic format)', function(done) {
            iotAgentLib.query('light1', 'Light', '', values, function(error, response) {
                should.not.exist(error);
                should.exist(response);
                should.exist(response.TheTargetValue);
                should.exist(response.TheTargetValue.value);
                response.TheTargetValue.value.should.equal('20071103T131805');
                done();
            });
        });
    });

});
