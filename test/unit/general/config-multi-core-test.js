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

const config = require('../../../lib/commonConfig');
const iotAgentConfig = {
    logLevel: 'FATAL',
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

describe('Startup Multi-Core tests', function () {
    describe('When the IoT Agent is started with Multi-Core environment variable with value=true', function () {
        beforeEach(function () {
            process.env.IOTA_MULTI_CORE = 'true';
            iotAgentConfig.multiCore = false;
        });

        afterEach(function () {
            delete process.env.IOTA_MULTI_CORE;
        });

        it('should load the correct configuration parameter with value=true', function (done) {
            config.setConfig(iotAgentConfig);
            config.getConfig().multiCore.should.equal(true);
            done();
        });
    });

    describe('When the IoT Agent is started with Multi-Core environment variable with value=false', function () {
        beforeEach(function () {
            process.env.IOTA_MULTI_CORE = 'false';
            iotAgentConfig.multiCore = true;
        });

        afterEach(function () {
            delete process.env.IOTA_MULTI_CORE;
        });

        it('should load the correct configuration parameter with value=false', function (done) {
            config.setConfig(iotAgentConfig);
            config.getConfig().multiCore.should.equal(false);
            done();
        });
    });

    describe(
        'When the IoT Agent is started with Multi-Core environment variable with any other value except ' +
            'true or false',
        function () {
            beforeEach(function () {
                process.env.IOTA_MULTI_CORE = 'foo';
                iotAgentConfig.multiCore = true;
            });

            afterEach(function () {
                delete process.env.IOTA_MULTI_CORE;
            });

            it('should load the correct configuration parameter with value=false', function (done) {
                config.setConfig(iotAgentConfig);
                config.getConfig().multiCore.should.equal(false);
                done();
            });
        }
    );

    describe('When the IoT Agent is started with Multi-Core environment variable with a numeric value', function () {
        beforeEach(function () {
            process.env.IOTA_MULTI_CORE = 123;
            iotAgentConfig.multiCore = true;
        });

        afterEach(function () {
            delete process.env.IOTA_MULTI_CORE;
        });

        it('should load the correct configuration parameter with value=false', function (done) {
            config.setConfig(iotAgentConfig);
            config.getConfig().multiCore.should.equal(false);
            done();
        });
    });

    describe('When the IoT Agent is either started with Multi-Core environment variable nor it is configured', function () {
        beforeEach(function () {});

        afterEach(function () {
            delete process.env.IOTA_MULTI_CORE;
        });

        it('should load the correct configuration parameter with value=false', function (done) {
            config.setConfig(iotAgentConfig);
            config.getConfig().multiCore.should.equal(false);
            done();
        });
    });

    describe(
        'When the IoT Agent is not started with Multi-Core environment variable and it is configured with ' +
            'value=true',
        function () {
            beforeEach(function () {
                iotAgentConfig.multiCore = true;
            });

            afterEach(function () {
                delete process.env.IOTA_MULTI_CORE;
            });

            it('should load the correct configuration parameter with value=true', function (done) {
                config.setConfig(iotAgentConfig);
                config.getConfig().multiCore.should.equal(true);
                done();
            });
        }
    );

    describe(
        'When the IoT Agent is not started with Multi-Core environment variable and it is configured with ' +
            'value=false',
        function () {
            beforeEach(function () {
                iotAgentConfig.multiCore = false;
            });

            afterEach(function () {
                delete process.env.IOTA_MULTI_CORE;
            });

            it('should load the correct configuration parameter with value=false', function (done) {
                config.setConfig(iotAgentConfig);
                config.getConfig().multiCore.should.equal(false);
                done();
            });
        }
    );

    describe(
        'When the IoT Agent is not started with Multi-Core environment variable and it is configured with ' +
            'any other value except true or false',
        function () {
            beforeEach(function () {
                iotAgentConfig.multiCore = 'foo';
            });

            afterEach(function () {
                delete process.env.IOTA_MULTI_CORE;
            });

            it('should load the correct configuration parameter with value=false', function (done) {
                config.setConfig(iotAgentConfig);
                config.getConfig().multiCore.should.equal(false);
                done();
            });
        }
    );

    describe(
        'When the IoT Agent is not started with Multi-Core environment variable and it is configured with ' +
            'a numeric value',
        function () {
            beforeEach(function () {
                iotAgentConfig.multiCore = 123;
            });

            afterEach(function () {
                delete process.env.IOTA_MULTI_CORE;
            });
            it('should load the correct configuration parameter with value=false', function (done) {
                config.setConfig(iotAgentConfig);
                config.getConfig().multiCore.should.equal(false);
                done();
            });
        }
    );
});
