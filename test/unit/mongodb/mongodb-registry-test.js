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
 */
'use strict';

var iotAgentLib = require('../../../lib/fiware-iotagent-lib'),
    deviceRegistryMongoDB = require('../../../lib/services/devices/deviceRegistryMongoDB'),
    utils = require('../../tools/utils'),
    should = require('should'),
    logger = require('logops'),
    mongo = require('mongodb').MongoClient,
    nock = require('nock'),
    async = require('async'),
    mongoUtils = require('./mongoDBUtils'),
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
                commands: [
                    {
                        name: 'position',
                        type: 'Array'
                    }
                ],
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
                ],
                staticAttributes: [
                    {
                        name: 'location',
                        type: 'Vector'
                    }
                ],
                service: 'smartGondor',
                subservice: 'gardens',
                internalAttributes: {
                    customAttribute: 'customValue'
                }
            },
            'Termometer': {
                commands: [],
                lazy: [
                    {
                        name: 'temp',
                        type: 'kelvin'
                    }
                ],
                attributes: [
                ],
                service: 'smartGondor',
                subservice: 'gardens'
            }
        },
        deviceRegistry: {
            type: 'mongodb'
        },
        mongodb: {
            host: 'localhost',
            port: '27017',
            db: 'iotagent'
        },
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M'
    },
    device1 = {
        id: 'light1',
        type: 'Light',
        service: 'smartGondor',
        subservice: 'gardens',
        endpoint: 'http://testEndpoint.com',
        transport: 'HTTP',
        resource: '/test',
        apikey: '2345678ikjhgfr678i',
        protocol: 'GENERIC_PROTOCOL',
        commands: [
            {
                name: 'position',
                type: 'Array'
            }
        ],
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
        ],
        staticAttributes: [
            {
                name: 'location',
                type: 'Vector'
            }
        ],
        internalAttributes: {
            customAttribute: 'customValue'
        }
    },
    device2 = {
        id: 'term2',
        type: 'Termometer',
        service: 'smartGondor',
        subservice: 'gardens',
        resource: '/',
        apikey: 'dsf8yy789iyushu786',
        protocol: 'GENERIC_PROTOCOL'
    },
    device3 = {
        id: 'light1',
        type: 'Light',
        service: 'smartMordor',
        subservice: 'electricity',
        endpoint: 'http://testEndpoint.com',
        transport: 'HTTP',
        resource: '/test',
        apikey: '2345678ikjhgfr678i',
        protocol: 'GENERIC_PROTOCOL',
        commands: [
            {
                name: 'position',
                type: 'Array'
            }
        ],
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
        ],
        staticAttributes: [
            {
                name: 'location',
                type: 'Vector'
            }
        ],
        internalAttributes: {
            customAttribute: 'customValue'
        }
    },
    iotAgentDb;

describe('MongoDB Device Registry', function() {
    beforeEach(function(done) {
        logger.setLevel('FATAL');

        mongoUtils.cleanDbs(function() {
            mongo.connect('mongodb://localhost:27017/iotagent', { useNewUrlParser: true }, function(err, db) {
                iotAgentDb = db;
                done();
            });
        });
    });

    afterEach(function(done) {
        delete(device1.registrationId);
        iotAgentLib.deactivate(function(error) {
            iotAgentDb.db().collection('devices').deleteOne(function(error) {
                iotAgentDb.close(function(error) {
                    deviceRegistryMongoDB.clearCache();
                    mongoUtils.cleanDbs(done);
                });
            });
        });
    });

    describe('When a new device is connected to the IoT Agent', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent3.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            contextBrokerMock
                .post('/v1/updateContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            iotAgentLib.activate(iotAgentConfig, function(error) {
                done();
            });
        });

        it('should be registered in mongodb with all its attributes', function(done) {
            iotAgentLib.register(device1, function(error) {
                should.not.exist(error);

                iotAgentDb.db().collection('devices').find({}).toArray(function(err, docs) {
                    should.not.exist(err);
                    should.exist(docs);
                    should.exist(docs.length);
                    docs.length.should.equal(1);
                    should.exist(docs[0].internalAttributes);
                    should.exist(docs[0].staticAttributes);
                    should.exist(docs[0].internalAttributes.customAttribute);
                    should.exist(docs[0].active);
                    should.exist(docs[0].commands);
                    should.exist(docs[0].resource);
                    should.exist(docs[0].endpoint);
                    should.exist(docs[0].transport);
                    should.exist(docs[0].apikey);
                    should.exist(docs[0].protocol);
                    docs[0].active.length.should.equal(1);
                    docs[0].staticAttributes.length.should.equal(1);
                    docs[0].staticAttributes[0].name.should.equal('location');
                    docs[0].active[0].name.should.equal('pressure');
                    docs[0].commands[0].name.should.equal('position');
                    docs[0].internalAttributes.customAttribute.should.equal('customValue');
                    docs[0].resource.should.equal('/test');
                    docs[0].endpoint.should.equal('http://testEndpoint.com');
                    docs[0].transport.should.equal('HTTP');
                    docs[0].protocol.should.equal('GENERIC_PROTOCOL');
                    docs[0].apikey.should.equal('2345678ikjhgfr678i');
                    done();
                });
            });
        });
    });

    describe('When a device with the same Device ID tries to register to the IOT Agent', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent3.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            contextBrokerMock
                .post('/v1/updateContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent3.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            contextBrokerMock
                .post('/v1/updateContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            iotAgentLib.activate(iotAgentConfig, function(error) {
                done();
            });
        });

        it('should be rejected with a DUPLICATE_DEVICE_ID', function(done) {
            iotAgentLib.register(device1, function(error) {
                iotAgentLib.register(device1, function(error) {
                    should.exist(error);
                    error.name.should.equal('DUPLICATE_DEVICE_ID');
                    done();
                });
            });
        });
    });

    describe('When a device with the same Device ID but different service tries to be registered', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent3.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            contextBrokerMock
                .post('/v1/updateContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .post('/NGSI9/registerContext', utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityRequests/registerIoTAgent3.json'))
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerIoTAgent1Success.json'));

            contextBrokerMock
                .post('/v1/updateContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            iotAgentLib.activate(iotAgentConfig, function(error) {
                done();
            });
        });

        it('should accept both devices', function(done) {
            iotAgentLib.register(device1, function(error) {
                iotAgentLib.register(device3, function(error) {
                    should.not.exist(error);
                    done();
                });
            });
        });
    });

    describe('When a device is removed from the IoT Agent', function() {
        beforeEach(function(done) {
            var expectedPayload3 = utils
                .readExampleFile('./test/unit/examples/contextAvailabilityRequests/unregisterDevice3.json');

            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/NGSI9/registerContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerNewDevice1Success.json'));

            contextBrokerMock
                .post('/v1/updateContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .post('/NGSI9/registerContext')
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/registerNewDevice2Success.json'));

            contextBrokerMock
                .post('/v1/updateContext')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            contextBrokerMock
                .post('/NGSI9/registerContext', expectedPayload3)
                .reply(200, utils.readExampleFile(
                    './test/unit/examples/contextAvailabilityResponses/unregisterDevice1Success.json'));

            iotAgentLib.activate(iotAgentConfig, function(error) {
                async.series([
                    async.apply(iotAgentLib.register, device1),
                    async.apply(iotAgentLib.register, device2)
                ], done);
            });
        });

        it('should be removed from MongoDB', function(done) {
            iotAgentLib.unregister(device1.id, 'smartGondor', 'gardens', function(error) {
                iotAgentDb.db().collection('devices').find({}).toArray(function(err, docs) {
                    should.not.exist(err);
                    should.exist(docs);
                    should.exist(docs.length);
                    docs.length.should.equal(1);
                    done();
                });
            });
        });
    });

    describe('When the registry is queried for a device using an arbitrary attribute', function() {
        beforeEach(function(done) {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/v1/updateContext')
                .times(10)
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .reply(200,
                utils.readExampleFile(
                    './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            var devices = [];

            for (var i = 0; i < 10; i++) {
                devices.push({
                    id: 'id' + i,
                    type: 'Light' + i,
                    internalId: 'internal' + i,
                    service: 'smartGondor',
                    subservice: 'gardens',
                    active: [
                        {
                            id: 'attrId',
                            type: 'attrType' + i,
                            value: i
                        }
                    ]
                });
            }

            iotAgentLib.activate(iotAgentConfig, function(error) {
                async.map(devices, iotAgentLib.register, function(error, results) {
                    done();
                });
            });
        });
        afterEach(function(done) {
            iotAgentLib.clearRegistry(done);
        });
        it('should return the appropriate device', function(done) {
            iotAgentLib.getDevicesByAttribute('internalId', 'internal3', 'smartGondor', 'gardens',
                function(error, devices) {
                    should.not.exist(error);
                    should.exist(devices);
                    devices.length.should.equal(1);
                    devices[0].id.should.equal('id3');
                    done();
                });
        });
    });

    describe('When the list of devices is retrieved', function() {
        beforeEach(function(done) {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/v1/updateContext')
                .times(10)
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .reply(200,
                    utils.readExampleFile(
                        './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            var devices = [];

            for (var i = 0; i < 10; i++) {
                devices.push({
                    id: 'id' + i,
                    type: 'Light' + i,
                    internalId: 'internal' + i,
                    service: 'smartGondor',
                    subservice: 'gardens',
                    active: [
                        {
                            id: 'attrId',
                            type: 'attrType' + i,
                            value: i
                        }
                    ]
                });
            }

            iotAgentLib.activate(iotAgentConfig, function(error) {
                async.map(devices, iotAgentLib.register, function(error, results) {
                    done();
                });
            });
        });
        afterEach(function(done) {
            iotAgentLib.clearRegistry(done);
        });
        it('should return the limited number of devices', function(done) {
            iotAgentLib.listDevices('smartGondor', 'gardens', 3, 2, function(error, result) {
                should.not.exist(error);
                should.exist(result.devices);
                result.devices.length.should.equal(3);
                done();
            });
        });
        it('should return the total number of devices', function(done) {
            iotAgentLib.listDevices('smartGondor', 'gardens', 3, 2, function(error, result) {
                should.not.exist(error);
                should.exist(result.count);
                result.count.should.equal(10);
                done();
            });
        });
    });
});
