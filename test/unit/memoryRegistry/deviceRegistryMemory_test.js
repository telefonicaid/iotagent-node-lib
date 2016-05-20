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
 * please contact with::daniel.moranjimenez@telefonica.com
 */
'use strict';

var iotAgentLib = require('../../../lib/fiware-iotagent-lib'),
    async = require('async'),
    should = require('should'),
    nock = require('nock'),
    utils = require('../../tools/utils'),
    iotAgentConfig = {
        logLevel: 'FATAL',
        contextBroker: {
            host: '192.168.1.1',
            port: '1026'
        },
        server: {
            name: 'testAgent',
            port: 4041,
            baseRoot: '/'
        },
        types: {},
        deviceRegistry: {
            type: 'memory'
        },
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    },
    contextBrokerMock;

describe('In memory device registry', function() {
    beforeEach(function(done) {
        iotAgentLib.activate(iotAgentConfig, done);
    });

    afterEach(function(done) {
        iotAgentLib.deactivate(done);
    });

    describe('When a the registry is queried for a device using an arbitrary attribute', function() {
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

            async.map(devices, iotAgentLib.register, function(error, results) {
                done();
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

    describe('When a the registry is queried for devices in multiple services', function() {
        beforeEach(function(done) {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/v1/updateContext')
                .times(10)
                .reply(200,
                    utils.readExampleFile(
                        './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            var devices = [];

            for (var i = 0; i < 10; i++) {
                devices.push({
                    id: 'id' + i,
                    type: 'Light' + i % 2,
                    internalId: 'internal' + i,
                    service: 'smartGondor' + i % 3,
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

            async.map(devices, iotAgentLib.register, function(error, results) {
                done();
            });
        });
        afterEach(function(done) {
            iotAgentLib.clearRegistry(done);
        });
        it('should return all the matching devices', function(done) {
            iotAgentLib.getDevicesByAttribute('type', 'Light0', undefined, 'gardens',
                function(error, devices) {
                    should.not.exist(error);
                    should.exist(devices);
                    devices.length.should.equal(5);
                    done();
                });
        });
    });

    describe('When a the registry is queried for devices in a particular service', function() {
        beforeEach(function(done) {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post('/v1/updateContext')
                .times(10)
                .reply(200,
                    utils.readExampleFile(
                        './test/unit/examples/contextResponses/createProvisionedDeviceSuccess.json'));

            var devices = [];

            for (var i = 0; i < 10; i++) {
                devices.push({
                    id: 'id' + i,
                    type: 'Light',
                    internalId: 'internal' + i,
                    service: 'smartGondor' + i % 3,
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

            async.map(devices, iotAgentLib.register, function(error, results) {
                done();
            });
        });
        afterEach(function(done) {
            iotAgentLib.clearRegistry(done);
        });
        it('should return all the matching devices in  that service', function(done) {
            iotAgentLib.getDevicesByAttribute('type', 'Light', 'smartGondor0', 'gardens',
                function(error, devices) {
                    should.not.exist(error);
                    should.exist(devices);
                    devices.length.should.equal(4);
                    done();
                });
        });
    });
});
