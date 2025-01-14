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
 * please contact with::[contacto@tid.es]
 */

/* eslint-disable no-unused-vars */

// #FIXME1649: parallel tests in device-provisioning-configGroup-api_test.js.

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const _ = require('underscore');
const async = require('async');
const nock = require('nock');
const utils = require('../../../tools/utils');
const request = utils.request;
const groupRegistryMemory = require('../../../../lib/services/groups/groupRegistryMemory');

const should = require('should');
const iotAgentConfig = {
    logLevel: 'FATAL',
    contextBroker: {
        host: '192.168.1.1',
        port: '1026'
    },
    server: {
        name: 'testAgent',
        port: 4041,
        host: 'localhost',
        baseRoot: '/'
    },
    types: {},
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M',
    useCBflowControl: true
};
const optionsCreation = {
    url: 'http://localhost:4041/iot/services',
    method: 'POST',
    json: {
        services: [
            {
                resource: '/deviceTest',
                apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732',
                entity_type: 'SensorMachine',
                trust: '8970A9078A803H3BL98PINEQRW8342HBAMS',
                cbHost: 'http://unexistentHost:1026',
                transport: 'HTTP',
                endpoint: 'http://myendpoint.com',
                useCBflowControl: true,
                commands: [
                    {
                        name: 'wheel1',
                        type: 'Wheel'
                    }
                ],
                lazy: [
                    {
                        name: 'luminescence',
                        type: 'Lumens'
                    }
                ],
                attributes: [
                    {
                        name: 'status',
                        type: 'Boolean'
                    }
                ],
                static_attributes: [
                    {
                        name: 'bootstrapServer',
                        type: 'Address',
                        value: '127.0.0.1'
                    }
                ]
            }
        ]
    },
    headers: {
        'fiware-service': 'testservice',
        'fiware-servicepath': '/testingPath'
    }
};
const optionsDeviceCreation = {
    url: 'http://localhost:4041/iot/devices',
    method: 'POST',
    json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice.json'),
    headers: {
        'fiware-service': 'testservice',
        'fiware-servicepath': '/testingPath'
    }
};
const optionsDelete = {
    url: 'http://localhost:4041/iot/services',
    method: 'DELETE',
    json: {},
    headers: {
        'fiware-service': 'testservice',
        'fiware-servicepath': '/testingPath'
    },
    qs: {
        resource: '/deviceTest',
        apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732'
    }
};
const optionsDeleteGroup = {
    url: 'http://localhost:4041/iot/services',
    method: 'DELETE',
    json: {},
    headers: {
        'fiware-service': 'Testservice',
        'fiware-servicepath': '/testingPath'
    },
    qs: {
        resource: '/deviceTest',
        apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732'
    }
};
const optionsDeleteDevice = {
    url: 'http://localhost:4041/iot/services',
    method: 'DELETE',
    json: {},
    headers: {
        'fiware-service': 'testservice',
        'fiware-servicepath': '/testingPath'
    },
    qs: {
        resource: '/deviceTest',
        apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732',
        device: 'true'
    }
};
const optionsUpdate = {
    url: 'http://localhost:4041/iot/services',
    method: 'PUT',
    json: {
        trust: '8970A9078A803H3BL98PINEQRW8342HBAMS',
        cbHost: 'http://anotherUnexistentHost:1026',
        transport: 'MQTT',
        endpoint: 'http://yourendpoint.com',
        commands: [
            {
                name: 'wheel1',
                type: 'Wheel'
            }
        ],
        lazy: [
            {
                name: 'luminescence',
                type: 'Lumens'
            }
        ],
        attributes: [
            {
                name: 'status',
                type: 'Boolean'
            }
        ],
        static_attributes: [
            {
                name: 'identifier',
                type: 'UUID',
                value: 'WERTYUIOP234567890'
            }
        ]
    },
    headers: {
        'fiware-service': 'testservice',
        'fiware-servicepath': '/testingPath'
    },
    qs: {
        resource: '/deviceTest',
        apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732'
    }
};
const optionsUpdateGroup = {
    url: 'http://localhost:4041/iot/services',
    method: 'PUT',
    json: {
        trust: '8970A9078A803H3BL98PINEQRW8342HBAMS',
        cbHost: 'http://anotherUnexistentHost:1026',
        transport: 'MQTT',
        endpoint: 'http://yourendpoint.com',
        commands: [
            {
                name: 'wheel1',
                type: 'Wheel'
            }
        ],
        lazy: [
            {
                name: 'luminescence',
                type: 'Lumens'
            }
        ],
        attributes: [
            {
                name: 'status',
                type: 'Boolean'
            }
        ],
        static_attributes: [
            {
                name: 'identifier',
                type: 'UUID',
                value: 'WERTYUIOP234567890'
            }
        ]
    },
    headers: {
        'fiware-service': 'Testservice',
        'fiware-servicepath': '/testingPath'
    },
    qs: {
        resource: '/deviceTest',
        apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732'
    }
};
const optionsList = {
    url: 'http://localhost:4041/iot/services',
    method: 'GET',
    json: {},
    headers: {
        'fiware-service': 'testservice',
        'fiware-servicepath': '/*'
    }
};
const optionsGet = {
    url: 'http://localhost:4041/iot/services',
    method: 'GET',
    json: {},
    headers: {
        'fiware-service': 'testservice',
        'fiware-servicepath': '/testingPath'
    }
};

// Add new options using the literal groups instead of services
const configGroupTerm = 'groups';

const newOptionsCreation = JSON.parse(JSON.stringify(optionsCreation));
newOptionsCreation.url = newOptionsCreation.url.replace('services', configGroupTerm);
newOptionsCreation.json[configGroupTerm] = newOptionsCreation.json.services;
delete newOptionsCreation.json.services;

const newOptionsList = JSON.parse(JSON.stringify(optionsList));
newOptionsList.url = newOptionsList.url.replace('services', configGroupTerm);

const newOptionsGet = JSON.parse(JSON.stringify(optionsGet));
newOptionsGet.url = newOptionsGet.url.replace('services', configGroupTerm);

describe('NGSI-v2 - Device Group Configuration API', function () {
    beforeEach(function (done) {
        iotAgentLib.activate(iotAgentConfig, function () {
            groupRegistryMemory.clear(done);
        });
    });

    afterEach(function (done) {
        iotAgentLib.setConfigurationHandler();

        iotAgentLib.deactivate(function () {
            groupRegistryMemory.clear(done);
        });
    });
    describe('When a new device group creation request arrives', function () {
        it('should return a 200 OK', function (done) {
            request(optionsCreation, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(201);
                done();
            });
        });
        it('should store it in the DB', function (done) {
            request(optionsCreation, function (error, response, body) {
                request(optionsList, function (error, response, body) {
                    body.count.should.equal(1);
                    body.services[0].apikey.should.equal('801230BJKL23Y9090DSFL123HJK09H324HV8732');
                    body.services[0].transport.should.equal('HTTP');
                    body.services[0].endpoint.should.equal('http://myendpoint.com');
                    done();
                });
            });
        });
        it('should store attributes in the DB', function (done) {
            request(optionsCreation, function (error, response, body) {
                request(optionsList, function (error, response, body) {
                    body.count.should.equal(1);
                    should.exist(body.services[0].attributes);
                    body.services[0].attributes.length.should.equal(1);
                    body.services[0].attributes[0].name.should.equal('status');

                    should.exist(body.services[0].lazy);
                    body.services[0].lazy.length.should.equal(1);
                    body.services[0].lazy[0].name.should.equal('luminescence');

                    should.exist(body.services[0].commands);
                    body.services[0].commands.length.should.equal(1);
                    body.services[0].commands[0].name.should.equal('wheel1');

                    should.exist(body.services[0].static_attributes);
                    body.services[0].static_attributes.length.should.equal(1);
                    body.services[0].static_attributes[0].name.should.equal('bootstrapServer');

                    done();
                });
            });
        });
        it('should store the service information from the headers into the DB', function (done) {
            request(optionsCreation, function (error, response, body) {
                request(optionsList, function (error, response, body) {
                    body.count.should.equal(1);
                    body.services[0].service.should.equal('testservice');
                    body.services[0].subservice.should.equal('/testingPath');
                    done();
                });
            });
        });
        it('should call the configuration creation handler', function (done) {
            let handlerCalled = false;

            iotAgentLib.setConfigurationHandler(function (newConfiguration, callback) {
                should.exist(newConfiguration);
                should.exist(callback);
                newConfiguration.apikey.should.equal('801230BJKL23Y9090DSFL123HJK09H324HV8732');
                newConfiguration.trust.should.equal('8970A9078A803H3BL98PINEQRW8342HBAMS');
                handlerCalled = true;
                callback();
            });

            request(optionsCreation, function (error, response, body) {
                handlerCalled.should.equal(true);
                done();
            });
        });
    });
    describe('When a new device group creation request arrives with explicitAttrs', function () {
        const optionsCreation1 = {
            url: 'http://localhost:4041/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/deviceTest',
                        apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732',
                        entity_type: 'SensorMachine',
                        trust: '8970A9078A803H3BL98PINEQRW8342HBAMS',
                        cbHost: 'http://unexistentHost:1026',
                        explicitAttrs: true
                    }
                ]
            },
            headers: {
                'fiware-service': 'testservice',
                'fiware-servicepath': '/testingPath'
            }
        };
        it('should return a 200 OK', function (done) {
            request(optionsCreation1, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(201);
                done();
            });
        });
        it('should store it in the DB', function (done) {
            request(optionsCreation1, function (error, response, body) {
                request(optionsList, function (error, response, body) {
                    body.count.should.equal(1);
                    body.services[0].apikey.should.equal('801230BJKL23Y9090DSFL123HJK09H324HV8732');
                    body.services[0].explicitAttrs.should.equal(true);
                    done();
                });
            });
        });
    });
    describe('When a new creation request arrives for a pair (resource, apiKey) already existant', function () {
        it('should return a 400 DUPLICATE_GROUP error', function (done) {
            request(optionsCreation, function (error, response, body) {
                request(optionsCreation, function (error, response, body) {
                    should.not.exist(error);
                    response.statusCode.should.equal(409);
                    body.name.should.equal('DUPLICATE_GROUP');
                    done();
                });
            });
        });
    });
    describe('When a creation request arrives without the fiware-service header', function () {
        beforeEach(function () {
            delete optionsCreation.headers['fiware-service'];
        });

        afterEach(function () {
            optionsCreation.headers['fiware-service'] = 'testservice';
        });

        it('should fail with a 400 MISSING_HEADERS Error', function (done) {
            request(optionsCreation, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_HEADERS');
                done();
            });
        });
    });
    describe('When a creation request arrives without the fiware-servicepath header', function () {
        beforeEach(function () {
            delete optionsCreation.headers['fiware-servicepath'];
        });

        afterEach(function () {
            optionsCreation.headers['fiware-servicepath'] = '/testingPath';
        });

        it('should fail with a 400 MISSING_HEADERS Error', function (done) {
            request(optionsCreation, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_HEADERS');
                done();
            });
        });
    });
    describe('When a device group with a missing mandatory attribute in the payload arrives', function () {
        beforeEach(function () {
            delete optionsCreation.json.services[0].resource;
        });

        afterEach(function () {
            optionsCreation.json.services[0].resource = '/deviceTest';
        });

        it('should fail with a 400 WRONG_SYNTAX error', function (done) {
            request(optionsCreation, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('WRONG_SYNTAX');
                done();
            });
        });
    });
    describe('When a device group removal request arrives', function () {
        beforeEach(function (done) {
            request(optionsCreation, done);
        });

        it('should return a 204 OK', function (done) {
            request(optionsDelete, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(204);
                done();
            });
        });
        it('should remove it from the database', function (done) {
            request(optionsDelete, function (error, response, body) {
                request(optionsList, function (error, response, body) {
                    body.count.should.equal(0);
                    done();
                });
            });
        });
        it('should remove it from the configuration', function (done) {
            request(optionsDelete, function (error, response, body) {
                should.not.exist(iotAgentConfig.types.SensorMachine);
                done();
            });
        });
    });
    describe('When a device group removal request arrives with service-header in uppercase', function () {
        beforeEach(function (done) {
            request(optionsCreation, done);
        });

        it('should return a 204 OK', function (done) {
            request(optionsDeleteGroup, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(204);
                done();
            });
        });
        it('should remove it from the database', function (done) {
            request(optionsDeleteGroup, function (error, response, body) {
                request(optionsList, function (error, response, body) {
                    body.count.should.equal(0);
                    done();
                });
            });
        });
        it('should remove it from the configuration', function (done) {
            request(optionsDeleteGroup, function (error, response, body) {
                should.not.exist(iotAgentConfig.types.SensorMachine);
                done();
            });
        });
    });
    describe('When a device group removal request arrives with device=true option', function () {
        let contextBrokerMock;

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'testservice')
                .matchHeader('fiware-servicepath', '/testingPath')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(204);

            contextBrokerMock
                .matchHeader('fiware-service', 'testservice')
                .matchHeader('fiware-servicepath', '/testingPath')
                .post('/v2/registrations')
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock
                .matchHeader('fiware-service', 'testservice')
                .matchHeader('fiware-servicepath', '/testingPath')
                .delete('/v2/registrations/6319a7f5254b05844116584d', '')
                .reply(204);

            contextBrokerMock
                .matchHeader('fiware-service', 'testservice')
                .matchHeader('fiware-servicepath', '/testingPath')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(204);

            async.series(
                [
                    iotAgentLib.clearAll,
                    async.apply(request, optionsCreation),
                    async.apply(request, optionsDeviceCreation)
                ],
                done
            );
        });

        it('should remove all associated devices', function (done) {
            const options = {
                url: 'http://localhost:4041/iot/devices/Light1',
                headers: {
                    'fiware-service': 'testservice',
                    'fiware-servicepath': '/testingPath'
                },
                method: 'GET'
            };

            function test(error, response, body) {
                response.statusCode.should.equal(404);
                done();
            }

            async.series(
                [
                    async.apply(request, optionsDeleteDevice),
                    async.apply(request, options),
                    async.apply(request, options, test)
                ],
                done
            );
        });

        it('should call the remove configuration handler', function (done) {
            let handlerCalled = false;

            iotAgentLib.setRemoveConfigurationHandler(function (newConfiguration, callback) {
                should.exist(newConfiguration);
                should.exist(callback);
                handlerCalled = true;
                callback();
            });

            request(optionsDeleteDevice, function (error, response, body) {
                handlerCalled.should.equal(true);
                done();
            });
        });

        afterEach(function (done) {
            nock.cleanAll();
            done();
        });
    });
    describe('When a device group removal arrives declaring a different service', function () {
        const optionsDeleteDifferentService = _.clone(optionsDelete);

        beforeEach(function (done) {
            optionsDeleteDifferentService.headers['fiware-service'] = 'unexistentService';
            request(optionsCreation, done);
        });

        afterEach(function (done) {
            optionsDeleteDifferentService.headers['fiware-service'] = 'testservice';
            done();
        });

        it('should return a 403 MISMATCHED_SERVICE error', function (done) {
            request(optionsDelete, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(403);
                body.name.should.equal('MISMATCHED_SERVICE');
                done();
            });
        });
    });

    describe('When a device group removal arrives declaring a different subservice', function () {
        const optionsDeleteDifferentService = _.clone(optionsDelete);

        beforeEach(function (done) {
            optionsDeleteDifferentService.headers['fiware-servicepath'] = '/unexistentSubservice';
            request(optionsCreation, done);
        });

        afterEach(function (done) {
            optionsDeleteDifferentService.headers['fiware-servicepath'] = '/testingPath';
            done();
        });

        it('should return a 403 MISMATCHED_SERVICE error', function (done) {
            request(optionsDelete, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(403);
                body.name.should.equal('MISMATCHED_SERVICE');
                done();
            });
        });
    });

    describe('When a device group removal arrives to a DB with three groups', function () {
        beforeEach(function (done) {
            const optionsCreation1 = _.clone(optionsCreation);
            const optionsCreation2 = _.clone(optionsCreation);
            const optionsCreation3 = _.clone(optionsCreation);

            optionsCreation1.json = { services: [] };
            optionsCreation3.json = { services: [] };

            optionsCreation1.json.services[0] = _.clone(optionsCreation.json.services[0]);
            optionsCreation3.json.services[0] = _.clone(optionsCreation.json.services[0]);

            optionsCreation1.json.services[0].apikey = 'qwertyuiop';
            optionsCreation3.json.services[0].apikey = 'lkjhgfds';

            async.series(
                [
                    async.apply(request, optionsCreation1),
                    async.apply(request, optionsCreation2),
                    async.apply(request, optionsCreation3)
                ],
                done
            );
        });

        it('should remove just the selected group', function (done) {
            request(optionsDelete, function (error, response, body) {
                request(optionsList, function (error, response, body) {
                    body.count.should.equal(2);

                    for (let i = 0; i < body.services.length; i++) {
                        body.services[i].apikey.should.not.equal('801230BJKL23Y9090DSFL123HJK09H324HV8732');
                    }

                    done();
                });
            });
        });
    });

    describe('When a device group removal request arrives without the mandatory headers', function () {
        beforeEach(function () {
            delete optionsDelete.headers['fiware-servicepath'];
        });

        afterEach(function () {
            optionsDelete.headers['fiware-servicepath'] = '/testingPath';
        });

        it('should fail with a 400 MISSING_HEADERS Error', function (done) {
            request(optionsDelete, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_HEADERS');
                done();
            });
        });
    });

    describe('When a device group removal request arrives without the mandatory parameters', function () {
        beforeEach(function () {
            delete optionsDelete.qs;
        });

        afterEach(function () {
            optionsDelete.qs = {
                resource: '/deviceTest',
                apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732'
            };
        });

        it('should fail with a 400 MISSING_HEADERS Error', function (done) {
            request(optionsDelete, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_HEADERS');
                done();
            });
        });
    });

    describe('When a device group update request arrives', function () {
        beforeEach(function (done) {
            const optionsCreation1 = _.clone(optionsCreation);
            const optionsCreation2 = _.clone(optionsCreation);
            const optionsCreation3 = _.clone(optionsCreation);

            optionsCreation1.json = { services: [] };
            optionsCreation3.json = { services: [] };

            optionsCreation1.json.services[0] = _.clone(optionsCreation.json.services[0]);
            optionsCreation3.json.services[0] = _.clone(optionsCreation.json.services[0]);

            optionsCreation1.json.services[0].apikey = 'qwertyuiop';
            optionsCreation3.json.services[0].apikey = 'lkjhgfds';

            async.series(
                [
                    async.apply(request, optionsCreation1),
                    async.apply(request, optionsCreation2),
                    async.apply(request, optionsCreation3)
                ],
                done
            );
        });

        it('should return a 204 OK', function (done) {
            request(optionsUpdate, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(204);
                done();
            });
        });

        it('should update the appropriate values in the database', function (done) {
            request(optionsUpdate, function (error, response, body) {
                request(optionsList, function (error, response, body) {
                    let found = false;
                    body.count.should.equal(3);

                    for (let i = 0; i < body.services.length; i++) {
                        if (
                            body.services[i].apikey === '801230BJKL23Y9090DSFL123HJK09H324HV8732' &&
                            body.services[i].resource === '/deviceTest'
                        ) {
                            body.services[i].cbHost.should.equal('http://anotherUnexistentHost:1026');
                            body.services[i].static_attributes.length.should.equal(1);
                            body.services[i].endpoint = 'http://yourendpoint.com';
                            body.services[i].transport = 'MQTT';
                            found = true;
                        }
                    }

                    found.should.equal(true);
                    done();
                });
            });
        });
        it('should call the configuration creation handler', function (done) {
            let handlerCalled = false;

            iotAgentLib.setConfigurationHandler(function (newConfiguration, callback) {
                should.exist(newConfiguration);
                should.exist(callback);
                newConfiguration.cbHost.should.equal('http://anotherUnexistentHost:1026');
                newConfiguration.trust.should.equal('8970A9078A803H3BL98PINEQRW8342HBAMS');
                newConfiguration.service.should.equal('testservice');
                newConfiguration.subservice.should.equal('/testingPath');
                newConfiguration.resource.should.equal('/deviceTest');
                newConfiguration.apikey.should.equal('801230BJKL23Y9090DSFL123HJK09H324HV8732');
                handlerCalled = true;
                callback();
            });

            request(optionsUpdate, function (error, response, body) {
                handlerCalled.should.equal(true);
                done();
            });
        });
    });

    describe('When a device group update request arrives with service-header in uppercase', function () {
        beforeEach(function (done) {
            const optionsCreation1 = _.clone(optionsCreation);
            const optionsCreation2 = _.clone(optionsCreation);
            const optionsCreation3 = _.clone(optionsCreation);

            optionsCreation1.json = { services: [] };
            optionsCreation3.json = { services: [] };

            optionsCreation1.json.services[0] = _.clone(optionsCreation.json.services[0]);
            optionsCreation3.json.services[0] = _.clone(optionsCreation.json.services[0]);

            optionsCreation1.json.services[0].apikey = 'qwertyuiop';
            optionsCreation3.json.services[0].apikey = 'lkjhgfds';

            async.series(
                [
                    async.apply(request, optionsCreation1),
                    async.apply(request, optionsCreation2),
                    async.apply(request, optionsCreation3)
                ],
                done
            );
        });

        it('should return a 204 OK', function (done) {
            request(optionsUpdateGroup, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(204);
                done();
            });
        });
        it('should update the appropriate values in the database', function (done) {
            request(optionsUpdateGroup, function (error, response, body) {
                request(optionsList, function (error, response, body) {
                    let found = false;
                    body.count.should.equal(3);

                    for (let i = 0; i < body.services.length; i++) {
                        if (
                            body.services[i].apikey === '801230BJKL23Y9090DSFL123HJK09H324HV8732' &&
                            body.services[i].resource === '/deviceTest'
                        ) {
                            body.services[i].cbHost.should.equal('http://anotherUnexistentHost:1026');
                            body.services[i].static_attributes.length.should.equal(1);
                            found = true;
                        }
                    }

                    found.should.equal(true);
                    done();
                });
            });
        });
        it('should call the configuration creation handler', function (done) {
            let handlerCalled = false;

            iotAgentLib.setConfigurationHandler(function (newConfiguration, callback) {
                should.exist(newConfiguration);
                should.exist(callback);
                newConfiguration.cbHost.should.equal('http://anotherUnexistentHost:1026');
                newConfiguration.trust.should.equal('8970A9078A803H3BL98PINEQRW8342HBAMS');
                newConfiguration.service.should.equal('Testservice');
                newConfiguration.subservice.should.equal('/testingPath');
                newConfiguration.resource.should.equal('/deviceTest');
                newConfiguration.apikey.should.equal('801230BJKL23Y9090DSFL123HJK09H324HV8732');
                handlerCalled = true;
                callback();
            });

            request(optionsUpdateGroup, function (error, response, body) {
                handlerCalled.should.equal(true);
                done();
            });
        });
    });

    describe('When a device group update request arrives declaring a different service', function () {
        beforeEach(function (done) {
            optionsUpdate.headers['fiware-service'] = 'UnexistentService';
            request(optionsCreation, done);
        });

        afterEach(function () {
            optionsUpdate.headers['fiware-service'] = 'testservice';
        });

        it('should return a 200 OK', function (done) {
            request(optionsUpdate, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(403);
                body.name.should.equal('MISMATCHED_SERVICE');
                done();
            });
        });
    });

    describe('When a device group update request arrives declaring a different subservice', function () {
        beforeEach(function (done) {
            optionsUpdate.headers['fiware-servicepath'] = '/UnexistentServicepath';
            request(optionsCreation, done);
        });

        afterEach(function () {
            optionsUpdate.headers['fiware-servicepath'] = '/testingPath';
        });

        it('should return a 200 OK', function (done) {
            request(optionsUpdate, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(403);
                body.name.should.equal('MISMATCHED_SERVICE');
                done();
            });
        });
    });

    describe('When a device group update request arrives without the mandatory headers', function () {
        beforeEach(function () {
            delete optionsUpdate.headers['fiware-servicepath'];
        });

        afterEach(function () {
            optionsUpdate.headers['fiware-servicepath'] = '/testingPath';
        });

        it('should fail with a 400 MISSING_HEADERS Error', function (done) {
            request(optionsUpdate, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_HEADERS');
                done();
            });
        });
    });

    describe('When a device group update request arrives without the mandatory parameters', function () {
        beforeEach(function () {
            delete optionsUpdate.qs.resource;
        });

        afterEach(function () {
            optionsUpdate.qs.resource = '/deviceTest';
        });

        it('should fail with a 400 MISSING_HEADERS Error', function (done) {
            request(optionsUpdate, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_HEADERS');
                done();
            });
        });
    });

    describe('When a device group update request arrives with a different explicitAttrs value', function () {
        const optionsCreation1 = {
            url: 'http://localhost:4041/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/deviceTest',
                        apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732',
                        entity_type: 'SensorMachine',
                        trust: '8970A9078A803H3BL98PINEQRW8342HBAMS',
                        cbHost: 'http://unexistentHost:1026',
                        explicitAttrs: true
                    }
                ]
            },
            headers: {
                'fiware-service': 'testservice',
                'fiware-servicepath': '/testingPath'
            }
        };
        const optionsUpdate1 = {
            url: 'http://localhost:4041/iot/services',
            method: 'PUT',
            json: {
                explicitAttrs: false
            },
            headers: {
                'fiware-service': 'testservice',
                'fiware-servicepath': '/testingPath'
            },
            qs: {
                resource: '/deviceTest',
                apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732'
            }
        };

        beforeEach(function (done) {
            request(optionsCreation1, done);
        });

        it('should update value of explicitAttrs', function (done) {
            request(optionsUpdate1, function (error, response, body) {
                request(optionsList, function (error, response, body) {
                    body.count.should.equal(1);
                    body.services[0].apikey.should.equal('801230BJKL23Y9090DSFL123HJK09H324HV8732');
                    body.services[0].explicitAttrs.should.equal(false);
                    done();
                });
            });
        });
    });

    describe('When a device group listing request arrives', function () {
        beforeEach(function (done) {
            const optionsCreation1 = _.clone(optionsCreation);
            const optionsCreation2 = _.clone(optionsCreation);
            const optionsCreation3 = _.clone(optionsCreation);

            optionsCreation2.json = { services: [] };
            optionsCreation3.json = { services: [] };

            optionsCreation2.json.services[0] = _.clone(optionsCreation.json.services[0]);
            optionsCreation3.json.services[0] = _.clone(optionsCreation.json.services[0]);

            optionsCreation2.json.services[0].apikey = 'qwertyuiop';
            optionsCreation3.json.services[0].apikey = 'lkjhgfds';

            async.series(
                [
                    async.apply(request, optionsCreation1),
                    async.apply(request, optionsCreation2),
                    async.apply(request, optionsCreation3)
                ],
                done
            );
        });

        it('should return a 200 OK', function (done) {
            request(optionsList, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);
                done();
            });
        });
        it('should return all the configured device groups from the database', function (done) {
            request(optionsList, function (error, response, body) {
                should.exist(body.count);
                should.exist(body.services);
                body.count.should.equal(3);
                body.services.length.should.equal(3);
                done();
            });
        });
    });

    describe('When a device info request arrives', function () {
        beforeEach(function (done) {
            async.series([async.apply(request, optionsCreation)], done);
        });

        it('should return a 200 OK', function (done) {
            request(optionsGet, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);
                done();
            });
        });
        it('should return all the configured device groups from the database', function (done) {
            request(optionsGet, function (error, response, body) {
                body.services[0].service.should.equal('testservice');
                done();
            });
        });
    });

    describe('When a new device from a created group arrives to the IoT Agent and sends a measure', function () {
        let contextBrokerMock;
        const values = [
            {
                name: 'status',
                type: 'String',
                value: 'STARTING'
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://unexistentHost:1026')
                .matchHeader('fiware-service', 'testservice')
                .matchHeader('fiware-servicepath', '/testingPath')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextRequests/updateContext3WithStatic.json')
                )
                .reply(204, {});
            async.series([async.apply(request, optionsCreation)], done);
        });

        afterEach(function (done) {
            nock.cleanAll();
            done();
        });

        it('should use the configured data', function (done) {
            iotAgentLib.update(
                'machine1',
                'SensorMachine',
                '801230BJKL23Y9090DSFL123HJK09H324HV8732',
                values,
                function (error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                }
            );
        });
    });

    describe('When a group listing request arrives with offset and limit parameters', function () {
        const optConstrainedList = {
            url: 'http://localhost:4041/iot/services',
            method: 'GET',
            qs: {
                limit: 3,
                offset: 2
            },
            json: {},
            headers: {
                'fiware-service': 'testservice',
                'fiware-servicepath': '/*'
            }
        };

        beforeEach(function (done) {
            const optionsCreationList = [];
            const creationFns = [];

            for (let i = 0; i < 10; i++) {
                optionsCreationList[i] = _.clone(optionsCreation);
                optionsCreationList[i].json = { services: [] };
                optionsCreationList[i].json.services[0] = _.clone(optionsCreation.json.services[0]);
                optionsCreationList[i].json.services[0].apikey = 'qwertyuiop' + i;
                creationFns.push(async.apply(request, optionsCreationList[i]));
            }

            async.series(creationFns, done);
        });

        it('should return a 200 OK', function (done) {
            request(optConstrainedList, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);
                done();
            });
        });
        it('should use the limit parameter to constrain the number of entries', function (done) {
            request(optConstrainedList, function (error, response, body) {
                should.exist(body.count);
                should.exist(body.services);
                body.services.length.should.equal(3);
                done();
            });
        });
        it('should use return the total number of entities', function (done) {
            request(optConstrainedList, function (error, response, body) {
                should.exist(body.count);
                should.exist(body.services);
                body.count.should.equal(10);
                done();
            });
        });
    });

    describe('When a new device group creation request arrives with the NEW API endpoint ', function () {
        it('should return a 200 OK', function (done) {
            request(newOptionsCreation, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(201);
                done();
            });
        });
        it('should be recovered using the OLD API endpoint', function (done) {
            request(newOptionsCreation, function (error, response, body) {
                request(optionsList, function (error, response, body) {
                    body.count.should.equal(1);
                    body.services[0].apikey.should.equal('801230BJKL23Y9090DSFL123HJK09H324HV8732');
                    body.services[0].transport.should.equal('HTTP');
                    body.services[0].endpoint.should.equal('http://myendpoint.com');

                    body.count.should.equal(1);
                    should.exist(body.services[0].attributes);
                    body.services[0].attributes.length.should.equal(1);
                    body.services[0].attributes[0].name.should.equal('status');

                    should.exist(body.services[0].lazy);
                    body.services[0].lazy.length.should.equal(1);
                    body.services[0].lazy[0].name.should.equal('luminescence');

                    should.exist(body.services[0].commands);
                    body.services[0].commands.length.should.equal(1);
                    body.services[0].commands[0].name.should.equal('wheel1');

                    should.exist(body.services[0].static_attributes);
                    body.services[0].static_attributes.length.should.equal(1);
                    body.services[0].static_attributes[0].name.should.equal('bootstrapServer');

                    body.count.should.equal(1);
                    body.services[0].service.should.equal('testservice');
                    body.services[0].subservice.should.equal('/testingPath');
                    done();
                });
            });
        });
    });
    describe('When a new device group creation request arrives with the NEW OLD endpoint ', function () {
        it('should return a 200 OK', function (done) {
            request(optionsCreation, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(201);
                done();
            });
        });
        it('should be recovered using the NEW API endpoint', function (done) {
            request(optionsCreation, function (error, response, body) {
                request(newOptionsList, function (error, response, body) {
                    body.count.should.equal(1);
                    body[configGroupTerm][0].apikey.should.equal('801230BJKL23Y9090DSFL123HJK09H324HV8732');
                    body[configGroupTerm][0].transport.should.equal('HTTP');
                    body[configGroupTerm][0].endpoint.should.equal('http://myendpoint.com');

                    body.count.should.equal(1);
                    should.exist(body[configGroupTerm][0].attributes);
                    body[configGroupTerm][0].attributes.length.should.equal(1);
                    body[configGroupTerm][0].attributes[0].name.should.equal('status');

                    should.exist(body[configGroupTerm][0].lazy);
                    body[configGroupTerm][0].lazy.length.should.equal(1);
                    body[configGroupTerm][0].lazy[0].name.should.equal('luminescence');

                    should.exist(body[configGroupTerm][0].commands);
                    body[configGroupTerm][0].commands.length.should.equal(1);
                    body[configGroupTerm][0].commands[0].name.should.equal('wheel1');

                    should.exist(body[configGroupTerm][0].static_attributes);
                    body[configGroupTerm][0].static_attributes.length.should.equal(1);
                    body[configGroupTerm][0].static_attributes[0].name.should.equal('bootstrapServer');

                    body.count.should.equal(1);
                    body[configGroupTerm][0].service.should.equal('testservice');
                    body[configGroupTerm][0].subservice.should.equal('/testingPath');
                    done();
                });
            });
        });
    });
});
