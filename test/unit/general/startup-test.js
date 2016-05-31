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

var iotAgentLib = require('../../../lib/fiware-iotagent-lib'),
    should = require('should'),
    nock = require('nock'),
    utils = require('../../tools/utils'),
    config = require('../../../lib/commonConfig'),
    _ = require('underscore'),
    iotAgentConfig = {
        logLevel: 'ERROR',
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
                attributes: [
                    {
                        name: 'pressure',
                        type: 'Hgmm'
                    }
                ]
            }
        },
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    },
    iotAgentConfigNoUrl = _.clone(iotAgentConfig),
    iotAgentConfigNoTypes = _.clone(iotAgentConfig),
    iotamMock;

describe('Startup tests', function() {
    describe('When the IoT Agent is started without a "providerUrl" config parameter', function() {
        beforeEach(function() {
            delete iotAgentConfigNoUrl.providerUrl;
        });

        it('should not start and raise a MISSING_CONFIG_PARAMS error', function(done) {
            iotAgentLib.activate(iotAgentConfigNoUrl, function(error) {
                should.exist(error);
                should.exist(error.name);
                error.name.should.equal('MISSING_CONFIG_PARAMS');
                done();
            });
        });
    });
    describe('When the IoT Agent is started without a "types" attribute', function() {
        beforeEach(function() {
            delete iotAgentConfigNoTypes.types;
        });

        it('should not start and raise a MISSING_CONFIG_PARAMS error', function(done) {
            iotAgentLib.activate(iotAgentConfigNoTypes, function(error) {
                should.exist(error);
                should.exist(error.name);
                error.name.should.equal('MISSING_CONFIG_PARAMS');
                done();
            });
        });
    });
    describe('When the IoT Agent is started with environment variables', function() {
        beforeEach(function() {
            process.env.IOTA_CB_HOST = 'cbhost';
            process.env.IOTA_CB_PORT = '1111';
            process.env.IOTA_NORTH_HOST = 'localhost';
            process.env.IOTA_NORTH_PORT = '2222';
            process.env.IOTA_PROVIDER_URL = 'prvider:3333';
            process.env.IOTA_REGISTRY_TYPE = 'mongo';
            process.env.IOTA_LOG_LEVEL = 'FATAL';
            process.env.IOTA_TIMESTAMP = true;
            process.env.IOTA_IOTAM_HOST = 'iotamhost';
            process.env.IOTA_IOTAM_PORT = '4444';
            process.env.IOTA_IOTAM_PATH = '/iotampath';
            process.env.IOTA_IOTAM_PROTOCOL = 'PDI_PROTOCOL';
            process.env.IOTA_IOTAM_DESCRIPTION = 'The IoTAM Protocol';
            process.env.IOTA_MONGO_HOST = 'mongohost';
            process.env.IOTA_MONGO_PORT = '5555';
            process.env.IOTA_MONGO_DB = 'themongodb';
            process.env.IOTA_MONGO_REPLICASET = 'customReplica';
            process.env.IOTA_DEFAULT_RESOURCE = '/iot/custom';

            nock.cleanAll();

            iotamMock = nock('http://iotamhost:4444')
                .post('/iotampath')
                .reply(200, utils.readExampleFile('./test/unit/examples/iotamResponses/registrationSuccess.json'));
        });

        afterEach(function() {
            delete process.env.IOTA_CB_HOST;
            delete process.env.IOTA_CB_PORT;
            delete process.env.IOTA_NORTH_HOST;
            delete process.env.IOTA_NORTH_PORT;
            delete process.env.IOTA_PROVIDER_URL;
            delete process.env.IOTA_REGISTRY_TYPE;
            delete process.env.IOTA_LOG_LEVEL;
            delete process.env.IOTA_TIMESTAMP;
            delete process.env.IOTA_IOTAM_HOST;
            delete process.env.IOTA_IOTAM_PORT;
            delete process.env.IOTA_IOTAM_PATH;
            delete process.env.IOTA_IOTAM_PROTOCOL;
            delete process.env.IOTA_IOTAM_DESCRIPTION;
            delete process.env.IOTA_MONGO_HOST;
            delete process.env.IOTA_MONGO_PORT;
            delete process.env.IOTA_MONGO_DB;
            delete process.env.IOTA_MONGO_REPLICASET;
            delete process.env.IOTA_DEFAULT_RESOURCE;
        });

        afterEach(function(done) {
            iotAgentLib.deactivate(done);
        });

        it('should not start and raise a MISSING_CONFIG_PARAMS error', function(done) {
            iotAgentLib.activate(iotAgentConfig, function(error) {
                config.getConfig().contextBroker.host.should.equal('cbhost');
                config.getConfig().contextBroker.port.should.equal('1111');
                config.getConfig().server.host.should.equal('localhost');
                config.getConfig().server.port.should.equal('2222');
                config.getConfig().providerUrl.should.equal('prvider:3333');
                config.getConfig().deviceRegistry.type.should.equal('mongo');
                config.getConfig().logLevel.should.equal('FATAL');
                config.getConfig().timestamp.should.equal(true);
                config.getConfig().iotManager.host.should.equal('iotamhost');
                config.getConfig().iotManager.port.should.equal('4444');
                config.getConfig().iotManager.path.should.equal('/iotampath');
                config.getConfig().iotManager.protocol.should.equal('PDI_PROTOCOL');
                config.getConfig().iotManager.description.should.equal('The IoTAM Protocol');
                config.getConfig().defaultResource.should.equal('/iot/custom');
                config.getConfig().mongodb.host.should.equal('mongohost');
                config.getConfig().mongodb.port.should.equal('5555');
                config.getConfig().mongodb.db.should.equal('themongodb');
                config.getConfig().mongodb.replicaSet.should.equal('customReplica');
                done();
            });
        });
    });
});
