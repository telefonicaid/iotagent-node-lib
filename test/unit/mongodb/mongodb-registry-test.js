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

/* eslint-disable no-unused-vars */

const iotAgentLib = require('../../../lib/fiware-iotagent-lib');
const utils = require('../../tools/utils');
const should = require('should');
const logger = require('logops');
const mongo = require('mongodb').MongoClient;
const nock = require('nock');
const async = require('async');
const mongoUtils = require('./mongoDBUtils');
let contextBrokerMock;
const iotAgentConfig = {
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
            service: 'smartgondor',
            subservice: 'gardens',
            internalAttributes: {
                customAttribute: 'customValue'
            }
        },
        Termometer: {
            commands: [],
            lazy: [
                {
                    name: 'temp',
                    type: 'kelvin'
                }
            ],
            attributes: [],
            service: 'smartgondor',
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
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M'
};
const device1 = {
    id: 'light1',
    type: 'Light',
    service: 'smartgondor',
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
};
const device2 = {
    id: 'term2',
    type: 'Termometer',
    service: 'smartgondor',
    subservice: 'gardens',
    resource: '/',
    apikey: 'dsf8yy789iyushu786',
    protocol: 'GENERIC_PROTOCOL'
};
const device3 = {
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
};
let iotAgentDb;

describe('NGSI-v2 - MongoDB Device Registry', function () {
    beforeEach(function (done) {
        logger.setLevel('FATAL');

        mongoUtils.cleanDbs(function () {
            mongo.connect('mongodb://localhost:27017/iotagent', function (err, db) {
                iotAgentDb = db;
                done();
            });
        });
    });

    afterEach(function (done) {
        delete device1.registrationId;
        iotAgentLib.deactivate(function (error) {
            iotAgentDb
                .db()
                .collection('devices')
                .deleteOne({}, function (error) {
                    iotAgentDb.close(function (error) {
                        mongoUtils.cleanDbs(done);
                    });
                });
        });
    });

    describe('When a new device is connected to the IoT Agent', function () {
        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent3.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock.post('/v2/entities?options=upsert').reply(204);

            iotAgentLib.activate(iotAgentConfig, function (error) {
                done();
            });
        });

        it('should be registered in mongodb with all its attributes', function (done) {
            iotAgentLib.register(device1, function (error) {
                should.not.exist(error);

                iotAgentDb
                    .db()
                    .collection('devices')
                    .find({})
                    .toArray(function (err, docs) {
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

    describe('When a device with the same Device ID tries to register to the IOT Agent', function () {
        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent3.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock.post('/v2/entities?options=upsert').reply(204);

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent3.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock.post('/v2/entities?options=upsert').reply(204);

            iotAgentLib.activate(iotAgentConfig, function (error) {
                done();
            });
        });

        it('should be rejected with a DUPLICATE_DEVICE_ID', function (done) {
            iotAgentLib.register(device1, function (error) {
                iotAgentLib.register(device1, function (error) {
                    should.exist(error);
                    error.name.should.equal('DUPLICATE_DEVICE_ID');
                    done();
                });
            });
        });
    });

    describe('When a device with the same Device ID but different service tries to be registered', function () {
        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent3.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock.post('/v2/entities?options=upsert').reply(204);

            contextBrokerMock
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerIoTAgent3.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock.post('/v2/entities?options=upsert').reply(204);

            iotAgentLib.activate(iotAgentConfig, function (error) {
                done();
            });
        });

        it('should accept both devices', function (done) {
            iotAgentLib.register(device1, function (error) {
                iotAgentLib.register(device3, function (error) {
                    should.not.exist(error);
                    done();
                });
            });
        });
    });

    describe('When a device is removed from the IoT Agent', function () {
        beforeEach(function (done) {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/v2/registrations')
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock.post('/v2/entities?options=upsert').reply(204);

            contextBrokerMock
                .post('/v2/registrations')
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            contextBrokerMock.post('/v2/entities?options=upsert').reply(204);

            contextBrokerMock.delete('/v2/registrations/6319a7f5254b05844116584d', '').reply(204);

            iotAgentLib.activate(iotAgentConfig, function (error) {
                async.series(
                    [async.apply(iotAgentLib.register, device1), async.apply(iotAgentLib.register, device2)],
                    done
                );
            });
        });

        it('should be removed from MongoDB', function (done) {
            iotAgentLib.unregister(device1.id, null, 'smartgondor', 'gardens', function (error) {
                iotAgentDb
                    .db()
                    .collection('devices')
                    .find({})
                    .toArray(function (err, docs) {
                        should.not.exist(err);
                        should.exist(docs);
                        should.exist(docs.length);
                        docs.length.should.equal(1);
                        done();
                    });
            });
        });
    });

    describe('When the registry is queried for a device using an arbitrary attribute', function () {
        beforeEach(function (done) {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/v2/entities?options=upsert')
                .times(10)
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .reply(204);

            const devices = [];

            for (let i = 0; i < 10; i++) {
                devices.push({
                    id: 'id' + i,
                    type: 'Light' + i,
                    internalId: 'internal' + i,
                    service: 'smartgondor',
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

            iotAgentLib.activate(iotAgentConfig, function (error) {
                async.map(devices, iotAgentLib.register, function (error, results) {
                    done();
                });
            });
        });
        afterEach(function (done) {
            iotAgentLib.clearRegistry(done);
        });
        it('should return the appropriate device', function (done) {
            iotAgentLib.getDevicesByAttribute(
                'internalId',
                'internal3',
                'smartgondor',
                'gardens',
                function (error, devices) {
                    should.not.exist(error);
                    should.exist(devices);
                    devices.length.should.equal(1);
                    devices[0].id.should.equal('id3');
                    done();
                }
            );
        });
    });

    describe('When the list of devices is retrieved', function () {
        beforeEach(function (done) {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/v2/entities?options=upsert')
                .times(10)
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .reply(204);

            const devices = [];

            for (let i = 0; i < 10; i++) {
                devices.push({
                    id: 'id' + i,
                    type: 'Light' + i,
                    internalId: 'internal' + i,
                    service: 'smartgondor',
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

            iotAgentLib.activate(iotAgentConfig, function (error) {
                async.map(devices, iotAgentLib.register, function (error, results) {
                    done();
                });
            });
        });
        afterEach(function (done) {
            iotAgentLib.clearRegistry(done);
        });
        it('should return the limited number of devices', function (done) {
            iotAgentLib.listDevices('smartgondor', 'gardens', 3, 2, function (error, result) {
                should.not.exist(error);
                should.exist(result.devices);
                result.devices.length.should.equal(3);
                done();
            });
        });
        it('should return the total number of devices', function (done) {
            iotAgentLib.listDevices('smartgondor', 'gardens', 3, 2, function (error, result) {
                should.not.exist(error);
                should.exist(result.count);
                result.count.should.equal(10);
                done();
            });
        });
    });

    describe('When the device is queried with the name and type', function () {
        beforeEach(function (done) {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/v2/entities?options=upsert')
                .times(10)
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .reply(204);

            const devices = [];

            for (let i = 0; i < 10; i++) {
                devices.push({
                    id: 'id' + i,
                    type: 'Light' + i,
                    internalId: 'internal' + i,
                    service: 'smartgondor',
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
            iotAgentLib.activate(iotAgentConfig, function (error) {
                async.map(devices, iotAgentLib.register, function (error, results) {
                    done();
                });
            });
        });
        afterEach(function (done) {
            iotAgentLib.clearRegistry(done);
        });
        it('should return the device with name and type', function (done) {
            iotAgentLib.getDeviceByNameAndType(
                'Light4:id4',
                'Light4',
                'smartgondor',
                'gardens',
                function (error, device) {
                    should.not.exist(error);
                    should.exist(device);
                    should.exist(device.name);
                    should.exist(device.type);
                    device.name.should.equal('Light4:id4');
                    device.type.should.equal('Light4');
                    done();
                }
            );
        });
    });
});
