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

var iotAgentLib = require('../../'),
    utils = require('../tools/utils'),
    async = require('async'),
    apply = async.apply,
    should = require('should'),
    logger = require('fiware-node-logger'),
    nock = require('nock'),
    mongoUtils = require('./mongoDBUtils'),
    request = require('request'),
    contextBrokerMock,
    iotAgentConfig = {
        contextBroker: {
            host: '10.11.128.16',
            port: '1026'
        },
        server: {
            port: 4041
        },
        types: {
            'Light': {
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
            'Motion': {
                commands: [],
                lazy: [
                    {
                        name: 'moving',
                        type: 'Boolean'
                    }
                ],
                staticAttributes: [
                    {
                        'name': 'location',
                        'type': 'Vector',
                        'value': '(123,523)'
                    }
                ],
                active: []
            },
            'Robot': {
                commands: [
                    {
                        name: 'position',
                        type: 'Array'
                    }
                ],
                lazy: [],
                staticAttributes: [],
                active:[]
            }
        },
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    },
    device1 = {
        id: 'light1',
        type: 'Light'
    },
    device2 = {
        id: 'motion1',
        type: 'Motion'
    },
    device3 = {
        id: 'r2d2',
        type: 'Robot'
    };

describe.only('Command functionalities', function() {
    beforeEach(function() {
        logger.setLevel('FATAL');
    });

    afterEach(function(done) {
        iotAgentLib.clearAll(function() {
            iotAgentLib.deactivate(function() {
                mongoUtils.cleanDbs(done);
            });
        });
    });

    describe('When a device is preregistered with commands', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://10.11.128.16:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext',
                utils.readExampleFile('./test/unit/contextAvailabilityRequests/registerIoTAgentCommands.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/contextAvailabilityResponses/registerIoTAgent1Success.json'));

                iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should register as Context Provider of the commands', function(done) {
            iotAgentLib.register(device3, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
    describe('When a command arrives to the IoT Agent as Context Provider', function() {
        it('should call the client handler');
        it('should create the attribute with the "_status" prefix in the Context Broker');
    });
    describe('When an update arrives from the south bound for a registered command', function() {
        it('should update its value in the Context Broker');
        it('should update its status in the Context Broker');
    });
});