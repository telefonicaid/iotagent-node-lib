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

describe('MongoDB command registry', function() {
    beforeEach(function(done) {
        iotAgentLib.activate(iotAgentConfig, done);
    });

    afterEach(function(done) {
        iotAgentLib.deactivate(done);
    });

    describe('When a new command is created in the command registry', function() {
        it('should appear in the listings');
    });

    describe('When a command listing is requested for a device', function() {
        it('should return all the commands for that device');
        it('should return all the fields for each command');
    });

    describe('When a command is removed from the queue', function() {
        it('should not appear in the listings');
    });

    describe('When a command has expired', function() {
        it('should not appear in the listings');
    });

    describe('When a command is updated', function() {
        it('should appear updated in the command list');
    });
});