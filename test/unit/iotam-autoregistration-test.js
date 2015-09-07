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
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 */
'use strict';

var iotAgentLib = require('../../'),
    nock = require('nock'),
    utils = require('../tools/utils'),
    should = require('should'),
    iotAgentConfig = {
        logLevel: 'FATAL',
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
            }
        },
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S',
        iotManager: {
            host: 'mockediotam.com',
            port: 9876,
            path: '/protocols',
            protocol: 'GENERIC_PROTOCOL',
            description: 'A generic protocol',
            defaultResource: '/iot/d'
        }
    },
    iotamMock;

describe('IoT Manager autoregistration', function() {
    describe('When the IoT Agent is started without a "iotManager" config parameter and empty services', function() {
        beforeEach(function() {
            nock.cleanAll();

            iotamMock = nock('http://mockediotam.com:9876')
                .post('/protocols',
                    utils.readExampleFile('./test/unit/iotamRequests/registrationEmpty.json'))
                .reply(200,
                    utils.readExampleFile('./test/unit/iotamResponses/registrationSuccess.json'));
        });

        afterEach(function(done) {
            iotAgentLib.deactivate(done);
        });

        it('should register itself to the provided IoT Manager URL', function(done) {
            iotAgentLib.activate(iotAgentConfig, function(error) {
                should.not.exist(error);
                iotamMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agents is started with "iotManager" config with missing attributes', function() {
        beforeEach(function() {
            nock.cleanAll();

            delete iotAgentConfig.providerUrl;

            iotamMock = nock('http://mockediotam.com:9876')
                .post('/protocols',
                utils.readExampleFile('./test/unit/iotamRequests/registrationEmpty.json'))
                .reply(200,
                utils.readExampleFile('./test/unit/iotamResponses/registrationSuccess.json'));
        });

        afterEach(function() {
            iotAgentConfig.providerUrl = 'http://smartGondor.com';
        });

        it('should fail with a MISSING_CONFIG_PARAMS error', function(done) {
            iotAgentLib.activate(iotAgentConfig, function(error) {
                should.exist(error);
                error.name.should.equal('MISSING_CONFIG_PARAMS');
                done();
            });
        });
    });

    describe('When the IoT Agents is started with "iotManager" config and multiple services', function() {
        it('should send all the service information to the IoT Manager in the registration');
    });

    describe('When a new service is created in the IoT Agent', function() {
        it('should update the registration in the IoT Manager');
    });

    describe('When a service is removed from the IoT Agent', function() {
        it('should update the registration in the IoT Manager');
    });
});
