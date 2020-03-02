/*
 * Copyright 2020 Telefonica Investigación y Desarrollo, S.A.U
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
 * Modified by: Jason Fox - FIWARE Foundation
 */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const nock = require('nock');
const utils = require('../../../tools/utils');
const config = require('../../../../lib/commonConfig');
const iotAgentConfig = {
    logLevel: 'FATAL',
    contextBroker: {
        host: '192.168.1.1',
        port: '1026'
    },
    server: {
        port: 4041
    },
    types: {
        Light: {
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
    providerUrl: 'http://smartGondor.com'
};
let iotamMock;

describe('NGSI-LD - Startup tests', function() {
    describe('When the IoT Agent is started with environment variables', function() {
        beforeEach(function() {
            process.env.IOTA_CB_HOST = 'cbhost';
            process.env.IOTA_CB_PORT = '1111';
            process.env.IOTA_CB_NGSI_VERSION = 'v2';
            process.env.IOTA_NORTH_HOST = 'localhost';
            process.env.IOTA_NORTH_PORT = '2222';
            process.env.IOTA_PROVIDER_URL = 'provider:3333';
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
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/iotamResponses/registrationSuccess.json')
                );
        });

        afterEach(function() {
            delete process.env.IOTA_CB_HOST;
            delete process.env.IOTA_CB_PORT;
            delete process.env.IOTA_CB_NGSI_VERSION;
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

        it('should load the correct configuration parameters', function(done) {
            iotAgentLib.activate(iotAgentConfig, function(error) {
                config.getConfig().contextBroker.url.should.equal('http://cbhost:1111');
                config.getConfig().contextBroker.ngsiVersion.should.equal('v2');
                config.getConfig().server.host.should.equal('localhost');
                config.getConfig().server.port.should.equal('2222');
                config.getConfig().providerUrl.should.equal('provider:3333');
                config.getConfig().deviceRegistry.type.should.equal('mongo');
                config.getConfig().logLevel.should.equal('FATAL');
                config.getConfig().timestamp.should.equal(true);
                config.getConfig().iotManager.url.should.equal('http://iotamhost:4444');
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
