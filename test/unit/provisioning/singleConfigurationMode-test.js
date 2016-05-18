/*
 * Copyright 2016 Telefonica Investigación y Desarrollo, S.A.U
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
    utils = require('../../tools/utils'),

    should = require('should'),
    nock = require('nock'),
    request = require('request'),
    iotAgentConfig = {
        logLevel: 'FATAL',
        contextBroker: {
            host: '192.168.1.1',
            port: '1026'
        },
        server: {
            port: 4041,
            baseRoot: '/'
        },
        types: {},
        service: 'smartGondor',
        singleConfigurationMode: true,
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    },
    groupCreation = {
        url: 'http://localhost:4041/iot/services',
        method: 'POST',
        json: utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/provisionFullGroup.json'),
        headers: {
            'fiware-service': 'TestService',
            'fiware-servicepath': '/testingPath'
        }
    };

describe('Provisioning API: Single service mode', function() {
    beforeEach(function(done) {
        nock.cleanAll();

        iotAgentLib.activate(iotAgentConfig, function() {
            iotAgentLib.clearAll(done);
        });
    });

    afterEach(function(done) {
        nock.cleanAll();
        iotAgentLib.setProvisioningHandler();
        iotAgentLib.deactivate(done);
    });

    describe('When a new configuration arrives to an already configured subservice', function() {
        var groupCreationDuplicated = {
            url: 'http://localhost:4041/iot/services',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/provisionDuplicateGroup.json'),
            headers: {
                'fiware-service': 'TestService',
                'fiware-servicepath': '/testingPath'
            }
        };

        beforeEach(function(done) {
            request(groupCreation, done);
        });

        it('should raise a DUPLICATE_GROUP error', function(done) {
            request(groupCreationDuplicated, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(409);
                should.exist(body.name);
                body.name.should.equal('DUPLICATE_GROUP');
                done();
            });
        });
    });
    describe('When a device is provisioned with an ID that already exists in the configuration', function() {
        it('should raise a DUPLICATE_DEVICE_ID error');
    });
    describe('When a device is provisioned with an ID that exists globally but not in the configuration', function() {
        it('should return a 200 OK');
    });
    describe('When a device is provisioned for a configuration without a type', function() {
        it('should be provisioned with the default type');
    });
    describe('When a device is provisioned for a configuration', function() {
        it('should add the default attributes from the configuration to the device');
    });
});
