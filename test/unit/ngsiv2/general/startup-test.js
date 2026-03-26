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

/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-expressions */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const should = require('should');
const nock = require('nock');
const utils = require('../../../tools/utils');
const request = utils.request;
const config = require('../../../../lib/commonConfig');
const iotAgentConfig = {
    logLevel: 'FATAL',
    contextBroker: {
        host: '192.168.1.1',
        port: '1026'
    },
    server: {
        port: 4041,
        host: 'localhost'
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
    providerUrl: 'http://smartgondor.com'
};
let iotamMock;

describe('NGSI-v2 - Startup tests', function () {
    describe('When the IoT Agent is started with environment variables', function () {
        beforeEach(function () {
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
            process.env.IOTA_MONGO_URI = 'mongodb://mongohost:5555/themongodb?replicaSet=customReplica';
            process.env.IOTA_DEFAULT_RESOURCE = '/iot/custom';
            process.env.IOTA_EXPRESS_LIMIT = '10000';
            process.env.IOTA_CMD_MODE = 'notification';
            process.env.IOTA_USE_CB_FLOW_CONTROL = true;
            process.env.IOTA_STORE_LAST_MEASURE = true;
            process.env.IOTA_HEALTH_CHECK = true;

            nock.cleanAll();

            iotamMock = nock('http://iotamhost:4444')
                .post('/iotampath')
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/ngsiv2/examples/iotamResponses/registrationSuccess.json')
                );
        });

        afterEach(function () {
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
            delete process.env.IOTA_MONGO_URI;
            delete process.env.IOTA_DEFAULT_RESOURCE;
            delete process.env.IOTA_EXPRESS_LIMIT;
            delete process.env.IOTA_CMD_MODE;
            delete process.env.IOTA_USE_CB_FLOW_CONTROL;
            delete process.env.IOTA_STORE_LAST_MEASURE;
            delete process.env.IOTA_HEALTH_CHECK;
        });

        afterEach(function (done) {
            iotAgentLib.deactivate(done);
        });

        it('should load the correct configuration parameters', function (done) {
            iotAgentLib.activate(iotAgentConfig, function (error) {
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
                // config.getConfig().mongodb.host.should.equal('mongohost');
                // config.getConfig().mongodb.port.should.equal('5555');
                // config.getConfig().mongodb.db.should.equal('themongodb');
                config
                    .getConfig()
                    .mongodb.uri.should.equal('mongodb://mongohost:5555/themongodb?replicaSet=customReplica');
                // config.getConfig().mongodb.replicaSet.should.equal('customReplica');
                done();
            });
        });
    });

    describe('When the IoT Agent is started with mongodb params', function () {
        beforeEach(function () {
            process.env.IOTA_MONGO_URI =
                'mongodb://customUser:customPassword@mongohost:5555/themongodb?replicaSet=customReplica&authSource=customAuthSource';
            // process.env.IOTA_MONGO_HOST = 'mongohost';
            // process.env.IOTA_MONGO_PORT = '5555';
            // process.env.IOTA_MONGO_DB = 'themongodb';
            // process.env.IOTA_MONGO_REPLICASET = 'customReplica';
            // process.env.IOTA_MONGO_USER = 'customUser';
            // process.env.IOTA_MONGO_PASSWORD = 'customPassword';
            // process.env.IOTA_MONGO_AUTH_SOURCE = 'customAuthSource';
            // process.env.IOTA_MONGO_RETRIES = '10';
            // process.env.IOTA_MONGO_RETRY_TIME = '5';
            process.env.IOTA_HEALTH_CHECK = true;

            nock.cleanAll();

            iotamMock = nock('http://iotamhost:4444')
                .post('/iotampath')
                .reply(
                    200,
                    utils.readExampleFile('./test/unit/ngsiv2/examples/iotamResponses/registrationSuccess.json')
                );
        });

        afterEach(function () {
            delete process.env.IOTA_MONGO_URI;
            delete process.env.IOTA_HEALTH_CHECK;
        });

        afterEach(function (done) {
            iotAgentLib.deactivate(done);
        });

        ['true', 'True', 'TRUE'].forEach(function (t) {
            it('should load ssl=true with ssl=' + t, function (done) {
                process.env.IOTA_MONGO_URI =
                    'mongodb://customUser:customPassword@mongohost:5555/themongodb?replicaSet=customReplica&authSource=customAuthSource&ssl=true';
                iotAgentLib.activate(iotAgentConfig, function (error) {
                    config
                        .getConfig()
                        .mongodb.uri.should.equal(
                            'mongodb://customUser:customPassword@mongohost:5555/themongodb?replicaSet=customReplica&authSource=customAuthSource&ssl=true'
                        );
                    done();
                });
            });
        });

        ['false', 'False', 'FALSE', 'invalid'].forEach(function (t) {
            it('should load ssl=false with ssl=' + t, function (done) {
                process.env.IOTA_MONGO_URI =
                    'mongodb://customUser:customPassword@mongohost:5555/themongodb?replicaSet=customReplica&authSource=customAuthSource&ssl=false';

                iotAgentLib.activate(iotAgentConfig, function (error) {
                    config
                        .getConfig()
                        .mongodb.uri.should.equal(
                            'mongodb://customUser:customPassword@mongohost:5555/themongodb?replicaSet=customReplica&authSource=customAuthSource&ssl=false'
                        );
                    done();
                });
            });
        });

        ['', 'undefined'].forEach(function (t) {
            it('should load no ssl parameter with ssl=' + t, function (done) {
                if (t !== 'undefined') {
                    process.env.IOTA_MONGO_URI =
                        'mongodb://customUser:customPassword@mongohost:5555/themongodb?replicaSet=customReplica&authSource=customAuthSource';
                }

                iotAgentLib.activate(iotAgentConfig, function (error) {
                    config
                        .getConfig()
                        .mongodb.uri.should.equal(
                            'mongodb://customUser:customPassword@mongohost:5555/themongodb?replicaSet=customReplica&authSource=customAuthSource'
                        );
                    done();
                });
            });
        });
    });

    describe('When the IoT Agent is started with Keystone', function () {
        beforeEach(function () {
            process.env.IOTA_AUTH_ENABLED = 'true';
            process.env.IOTA_AUTH_USER = '1111';
            process.env.IOTA_AUTH_PASSWORD = 'xxxx';
        });

        afterEach(function () {
            delete process.env.IOTA_AUTH_ENABLED;
            delete process.env.IOTA_AUTH_USER;
            delete process.env.IOTA_AUTH_PASSWORD;
        });

        afterEach(function (done) {
            iotAgentLib.deactivate(done);
        });

        it('should load the correct configuration parameters', function (done) {
            iotAgentLib.activate(iotAgentConfig, function (error) {
                config.getConfig().authentication.user.should.equal('1111');
                config.getConfig().authentication.password.should.equal('xxxx');
                done();
            });
        });
    });

    describe('When the IoT Agent is started with Keyrock', function () {
        beforeEach(function () {
            process.env.IOTA_AUTH_ENABLED = 'true';
            process.env.IOTA_AUTH_CLIENT_ID = '1111';
            process.env.IOTA_AUTH_CLIENT_SECRET = 'xxxx';
        });

        afterEach(function () {
            delete process.env.IOTA_AUTH_ENABLED;
            delete process.env.IOTA_AUTH_CLIENT_ID;
            delete process.env.IOTA_AUTH_CLIENT_SECRET;
        });

        afterEach(function (done) {
            iotAgentLib.deactivate(done);
        });

        it('should load the correct configuration parameters', function (done) {
            iotAgentLib.activate(iotAgentConfig, function (error) {
                config.getConfig().authentication.clientId.should.equal('1111');
                config.getConfig().authentication.clientSecret.should.equal('xxxx');
                done();
            });
        });
    });
});
