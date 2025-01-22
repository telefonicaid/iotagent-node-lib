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
 *
 *  Modified by: Fernando López - FIWARE Foundation, e.V.
 *
 */

/* eslint-disable no-unused-vars */

const config = require('../../../../lib/commonConfig');
const iotAgentConfig = {
    logLevel: 'FATAL',
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'ld',
        // or ['http://context1.json-ld','http://context2.json-ld'] if you need more than one
        jsonLdContext: 'http://context.json-ld'
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
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M'
};

describe('NGSI-LD - JSON-LD @context parsing from environment variable', function () {
    describe('When the context is provided as a semicolon separated list of contexts', function () {
        beforeEach(function () {
            process.env.IOTA_JSON_LD_CONTEXT = 'http://context1.json-ld,http://context2.json-ld';
            iotAgentConfig.contextBroker.jsonLdContext = 'http://whateverContext.json-ld';
        });

        afterEach(function () {
            delete process.env.IOTA_JSON_LD_CONTEXT;
        });

        it('should load the configuration as a list of contexts', function (done) {
            config.setConfig(iotAgentConfig);
            config
                .getConfig()
                .contextBroker.jsonLdContext.should.containDeep(['http://context1.json-ld', 'http://context2.json-ld']);
            done();
        });
    });

    describe('When the context is provided as a semicolon separated list of contexts with extra whitespace', function () {
        beforeEach(function () {
            process.env.IOTA_JSON_LD_CONTEXT =
                'http://context1.json-ld , http://context2.json-ld,   http://context3.json-ld';
            iotAgentConfig.contextBroker.jsonLdContext = 'http://whateverContext.json-ld';
        });

        afterEach(function () {
            delete process.env.IOTA_JSON_LD_CONTEXT;
        });

        it('should load the configuration as a list of contexts and remove the extra whitespace', function (done) {
            config.setConfig(iotAgentConfig);
            config
                .getConfig()
                .contextBroker.jsonLdContext.should.containDeep([
                    'http://context1.json-ld',
                    'http://context2.json-ld',
                    'http://context3.json-ld'
                ]);
            done();
        });
    });

    describe('When the context is provided as a string value', function () {
        beforeEach(function () {
            process.env.IOTA_JSON_LD_CONTEXT = 'http://context1.json-ld';
            iotAgentConfig.contextBroker.jsonLdContext = 'http://whateverContext.json-ld';
        });

        afterEach(function () {
            delete process.env.IOTA_JSON_LD_CONTEXT;
        });

        it('should load the configuration as a single entry list', function (done) {
            config.setConfig(iotAgentConfig);
            config.getConfig().contextBroker.jsonLdContext.should.equal('http://context1.json-ld');
            done();
        });
    });
});

describe('NGSI-LD - JSON-LD @context parsing from global configuration', function () {
    describe('When the context is provided as a list of contexts', function () {
        beforeEach(function () {
            iotAgentConfig.contextBroker.jsonLdContext = ['http://context1.json-ld', 'http://context2.json-ld'];
        });

        it('should load the configuration as a list of contexts', function (done) {
            config.setConfig(iotAgentConfig);
            config
                .getConfig()
                .contextBroker.jsonLdContext.should.containDeep(['http://context1.json-ld', 'http://context2.json-ld']);
            done();
        });
    });

    describe('When the context is provided as a string value', function () {
        beforeEach(function () {
            iotAgentConfig.contextBroker.jsonLdContext = 'http://context1.json-ld';
        });

        it('should load the configuration as a string', function (done) {
            config.setConfig(iotAgentConfig);
            config.getConfig().contextBroker.jsonLdContext.should.equal('http://context1.json-ld');
            done();
        });
    });
});
