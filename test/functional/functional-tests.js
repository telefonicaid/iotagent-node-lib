/*
 * Copyright 2023 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of iotagent-json
 *
 * iotagent-json is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * iotagent-json is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with iotagent-json.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 *
 * Modified by: Miguel Angel Pedraza
 */

/* eslint-disable no-unused-vars*/
/* eslint-disable no-unused-expressions*/

const config = require('./config-test.js');
const nock = require('nock');
const chai = require('chai');
const expect = chai.expect;
const iotAgentLib = require('../../lib/fiware-iotagent-lib');
const async = require('async');
const utils = require('../tools/utils');
const testUtils = require('./testUtils');
const request = utils.request;
const logger = require('logops');
var chaiMatchPattern = require('chai-match-pattern');

chai.use(chaiMatchPattern);
var _ = chaiMatchPattern.getLodashModule();
let contextBrokerMock;

const globalEnv = {
    service: 'smartgondor',
    servicePath: '/gardens',
    apikey: '123456',
    entity_type: 'TestType',
    entity_name: 'TestType:TestDevice',
    deviceId: 'TestDevice'
};

describe('FUNCTIONAL TESTS', function () {
    describe('Basic group provision with attributes', function () {
        const provision = {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 's',
                                name: 'status',
                                type: 'Boolean'
                            },
                            {
                                object_id: 't',
                                name: 'temperature',
                                type: 'Number'
                            }
                        ],
                        static_attributes: []
                    }
                ]
            },
            headers: {
                'fiware-service': globalEnv.service,
                'fiware-servicepath': globalEnv.servicePath
            }
        };

        const measure = {
            url: 'http://localhost:' + config.http.port + '/iot/json',
            method: 'POST',
            qs: {
                i: globalEnv.deviceId,
                k: globalEnv.apikey
            },
            json: {
                s: false,
                t: 10
            }
        };

        const expectation = {
            id: globalEnv.entity_name,
            type: globalEnv.entity_type,
            temperature: {
                value: 10,
                type: 'Number'
            },
            status: {
                value: false,
                type: 'Boolean'
            }
        };

        beforeEach(function (done) {
            let type = testUtils.groupToIoTAConfigType(
                provision.json.services[0],
                provision.headers['fiware-service'],
                provision.headers['fiware-servicepath']
            );
            config.iota.types[type.name] = type.type;
            iotAgentLib.activate(config.iota, function (error) {
                done(error);
            });
        });

        afterEach(function (done) {
            nock.cleanAll();
            iotAgentLib.clearAll(function () {
                iotAgentLib.deactivate(function () {
                    iotAgentLib.setDataUpdateHandler();
                    iotAgentLib.setCommandHandler();
                    done();
                });
            });
        });

        it('should send its value to the Context Broker', async function () {
            await testUtils.testCase(measure, expectation, provision, globalEnv, config, 'single', '');
        });
    });

    describe('Basic group provision with attributes and multientity', function () {
        const provision = {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 's',
                                name: 'status',
                                type: 'Boolean'
                            },
                            {
                                object_id: 't',
                                name: 'temperature',
                                type: 'Number',
                                entity_name: 'TheLightType2:MQTT_3',
                                entity_type: 'TheLightType2'
                            }
                        ],
                        static_attributes: []
                    }
                ]
            },
            headers: {
                'fiware-service': globalEnv.service,
                'fiware-servicepath': globalEnv.servicePath
            }
        };

        const measure = {
            url: 'http://localhost:' + config.http.port + '/iot/json',
            method: 'POST',
            qs: {
                i: globalEnv.deviceId,
                k: globalEnv.apikey
            },
            json: {
                s: false,
                t: 10
            }
        };

        const expectation = {
            entities: [
                {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    status: {
                        value: false,
                        type: 'Boolean'
                    }
                },
                {
                    id: 'TheLightType2:MQTT_3',
                    type: 'TheLightType2',
                    temperature: {
                        value: 10,
                        type: 'Number'
                    }
                }
            ],
            actionType: 'append'
        };

        beforeEach(function (done) {
            let type = testUtils.groupToIoTAConfigType(
                provision.json.services[0],
                provision.headers['fiware-service'],
                provision.headers['fiware-servicepath']
            );
            config.iota.types[type.name] = type.type;
            iotAgentLib.activate(config.iota, function (error) {
                done(error);
            });
        });

        afterEach(function (done) {
            nock.cleanAll();
            iotAgentLib.clearAll(function () {
                iotAgentLib.deactivate(function () {
                    iotAgentLib.setDataUpdateHandler();
                    iotAgentLib.setCommandHandler();
                    done();
                });
            });
        });

        it('should send its value to the Context Broker', async function () {
            await testUtils.testCase(measure, expectation, provision, globalEnv, config, 'multientity', '');
        });
    });
});
