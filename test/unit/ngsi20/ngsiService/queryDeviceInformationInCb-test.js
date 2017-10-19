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
                        type: 'number'
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
                        'type': 'geo:point',
                        'value': '153,523'
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

describe('Query device information in the Context Broker', function() {
    var attributes = [
        'state',
        'dimming'
    ];

    beforeEach(function(done) {
        logger.setLevel('FATAL');


        iotAgentLib.activate(iotAgentConfig, done);
    });

    afterEach(function(done) {
        iotAgentLib.deactivate(done);
    });

    describe('When the user requests information about a registered device', function() {
        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .get('/v2/entities/light1?attrs=state,dimming')
                .reply(200,
                utils.readExampleFile('./test/unit/ngsi20/examples/contextResponses/queryContext1Success.json'));
        });

        it('should return the information about the desired attributes', function(done) {
            iotAgentLib.query('light1', 'Light', '', attributes, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the user requests information about a device that it\'s not in the CB', function() {
        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .get('/v2/entities/light3?attrs=state,dimming')
                .reply(404,
                utils.readExampleFile('./test/unit/ngsi20/examples/contextResponses/queryContext2Error.json'));

        });

        it('should return a DEVICE_NOT_FOUND_ERROR', function(done) {
            iotAgentLib.query('light3', 'Light', '', attributes, function(error) {
                should.exist(error);
                error.name.should.equal('DEVICE_NOT_FOUND');
                done();
            });
        });
    });

    describe('When the user requests information and there is an unknown errorCode in the response', function() {
        beforeEach(function() {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .get('/v2/entities/light3?attrs=state,dimming')
                .reply(516,
                utils.readExampleFile('./test/unit/ngsi20/examples/contextResponses/queryContext2UnknownError.json'));

        });

        it('should return a ENTITY_GENERIC_ERROR', function(done) {
            iotAgentLib.query('light3', 'Light', '', attributes, function(error) {

                should.exist(error);
                should.exist(error.code);
                should.exist(error.message);
                should.exist(error.name);
                should.exist(error.details.error);
                error.code.should.equal(516);
                error.message.should.equal('Error accesing entity data for device: light3 of type: Light');
                error.name.should.equal('ENTITY_GENERIC_ERROR');
                error.details.error.should.equal('A new and unknown error');
                done();
            });
        });
    });

});
