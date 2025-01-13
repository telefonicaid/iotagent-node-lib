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
 * please contact with::daniel.moranjimenez@telefonica.com
 */

/* eslint-disable no-unused-vars */

const iotAgentLib = require('../../../lib/fiware-iotagent-lib');
const async = require('async');
const should = require('should');
const nock = require('nock');
const utils = require('../../tools/utils');
const request = utils.request;
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
    deviceRegistry: {
        type: 'memory'
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M',
    useCBflowControl: true
};
let contextBrokerMock;

describe('NGSI-v2 - In memory device registry', function () {
    beforeEach(function (done) {
        iotAgentLib.activate(iotAgentConfig, done);
    });

    afterEach(function (done) {
        iotAgentLib.deactivate(done);
    });

    describe('When a the registry is queried for a device using an arbitrary attribute', function () {
        beforeEach(function (done) {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/v2/entities?options=upsert,flowControl')
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

            async.map(devices, iotAgentLib.register, function (error, results) {
                done();
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

    describe('When a the registry is queried for devices in multiple services', function () {
        beforeEach(function (done) {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/v2/entities?options=upsert,flowControl')
                .times(10)
                .reply(204);

            const devices = [];

            for (let i = 0; i < 10; i++) {
                devices.push({
                    id: 'id' + i,
                    type: 'Light' + (i % 2),
                    internalId: 'internal' + i,
                    service: 'smartgondor' + (i % 3),
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

            async.map(devices, iotAgentLib.register, function (error, results) {
                done();
            });
        });
        afterEach(function (done) {
            iotAgentLib.clearRegistry(done);
        });
        it('should return all the matching devices', function (done) {
            iotAgentLib.getDevicesByAttribute('type', 'Light0', undefined, 'gardens', function (error, devices) {
                should.not.exist(error);
                should.exist(devices);
                devices.length.should.equal(5);
                done();
            });
        });
    });

    describe('When a the registry is queried for devices in a particular service', function () {
        beforeEach(function (done) {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/v2/entities?options=upsert,flowControl')
                .times(10)
                .reply(204);

            const devices = [];

            for (let i = 0; i < 10; i++) {
                devices.push({
                    id: 'id' + i,
                    type: 'Light',
                    internalId: 'internal' + i,
                    service: 'smartgondor' + (i % 3),
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

            async.map(devices, iotAgentLib.register, function (error, results) {
                done();
            });
        });
        afterEach(function (done) {
            iotAgentLib.clearRegistry(done);
        });
        it('should return all the matching devices in  that service', function (done) {
            iotAgentLib.getDevicesByAttribute('type', 'Light', 'smartgondor0', 'gardens', function (error, devices) {
                should.not.exist(error);
                should.exist(devices);
                devices.length.should.equal(4);
                done();
            });
        });
    });

    describe('When a the registry is queried for device in a particular name and type', function () {
        beforeEach(function (done) {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/v2/entities?options=upsert,flowControl')
                .times(10)
                .reply(204);

            const devices = [];

            for (let i = 0; i < 10; i++) {
                devices.push({
                    id: 'id' + i,
                    name: 'name' + i,
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

            async.map(devices, iotAgentLib.register, function (error, results) {
                done();
            });
        });

        afterEach(function (done) {
            iotAgentLib.clearRegistry(done);
        });
        it('should return the name and type of device', function (done) {
            iotAgentLib.getDeviceByNameAndType('name5', 'Light5', 'smartgondor', 'gardens', function (error, device) {
                should.not.exist(error);
                should.exist(device);
                should.exist(device.name);
                should.exist(device.type);
                device.name.should.equal('name5');
                device.type.should.equal('Light5');
                Object.keys(device).length.should.equal(12);
                done();
            });
        });
    });
});
