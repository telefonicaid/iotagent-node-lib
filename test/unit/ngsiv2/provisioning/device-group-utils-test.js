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
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 */

/* eslint-disable no-unused-vars */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const utils = require('../../../tools/utils');
const request = utils.request;
const should = require('should');
const async = require('async');
const groupRegistryMemory = require('../../../../lib/services/groups/groupRegistryMemory');

const groupCreation = {
    url: 'http://localhost:4041/iot/services',
    method: 'POST',
    json: utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/provisionFullGroup.json'),
    headers: {
        'fiware-service': 'testservice',
        'fiware-servicepath': '/testingPath'
    }
};
const alternateGroupCreation = {
    url: 'http://localhost:4041/iot/services',
    method: 'POST',
    json: utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/provisionFullGroupAlternate.json'),
    headers: {
        'fiware-service': 'testservice',
        'fiware-servicepath': '/testingPath'
    }
};
const iotAgentConfig = {
    logLevel: 'FATAL',
    contextBroker: {
        host: '192.168.1.1',
        port: '1026'
    },
    server: {
        port: 4041,
        host: 'localhost',
        baseRoot: '/'
    },
    types: {
        Termometer: {
            commands: [],
            lazy: [
                {
                    name: 'temp',
                    type: 'kelvin'
                }
            ],
            active: [],
            apikey: '1234567890asdfghjkl',
            service: 'testservice',
            subservice: '/testingPath'
        }
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M',
    defaultKey: 'default1234'
};

describe('Device Group utils', function () {
    afterEach(function (done) {
        iotAgentLib.deactivate(function () {
            groupRegistryMemory.clear(done);
        });
    });

    describe('When an API Key is requested for a device in a group', function () {
        beforeEach(function (done) {
            async.series(
                [
                    async.apply(iotAgentLib.activate, iotAgentConfig),
                    async.apply(request, alternateGroupCreation),
                    async.apply(request, groupCreation)
                ],
                done
            );
        });
        it('should return the API Key of the group', function (done) {
            iotAgentLib.getEffectiveApiKey('testservice', '/testingPath', 'AnotherMachine', function (error, apiKey) {
                should.not.exist(error);
                apiKey.should.equal('754KL23Y9090DSFL123HSFL12380KL23Y2');
                done();
            });
        });
    });
    describe('When an API Key is requested without a provisioned group but with a configured type', function () {
        beforeEach(function (done) {
            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should return the API Key of the related type', function (done) {
            iotAgentLib.getEffectiveApiKey('testservice', '/testingPath', 'Termometer', function (error, apiKey) {
                should.not.exist(error);
                apiKey.should.equal('1234567890asdfghjkl');
                done();
            });
        });
    });
    describe('When an API Key is requested and there is no group or type configured', function () {
        beforeEach(function (done) {
            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should return the default API Key', function (done) {
            iotAgentLib.getEffectiveApiKey('testservice', '/testingPath', 'WeatherMachine', function (error, apiKey) {
                should.not.exist(error);
                apiKey.should.equal('default1234');
                done();
            });
        });
    });
    describe('When an API Key is requested and there is no group, type or default value', function () {
        beforeEach(function (done) {
            delete iotAgentConfig.defaultKey;
            iotAgentLib.activate(iotAgentConfig, done);
        });

        afterEach(function () {
            iotAgentConfig.defaultKey = 'default1234';
        });

        it('should raise an error', function (done) {
            iotAgentLib.getEffectiveApiKey('testservice', '/testingPath', 'WeatherMachine', function (error, apiKey) {
                should.exist(error);
                error.name.should.equal('GROUP_NOT_FOUND');
                done();
            });
        });
    });
});
