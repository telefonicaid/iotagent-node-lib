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
 * please contact with::[iot_support@tid.es]
 */

/* eslint-disable no-unused-vars */

const iotAgentLib = require('../../../lib/fiware-iotagent-lib');
const should = require('should');
const logger = require('logops');
const utils = require('../../tools/utils');
const request = utils.request;
const iotAgentConfig = {
    contextBroker: {
        host: '192.168.1.1',
        port: '1026'
    },
    server: {
        port: 4041
    },
    types: {
        Light: {
            commands: [],
            type: 'Light',
            lazy: [
                {
                    object_id: 't',
                    name: 'temperature',
                    type: 'centigrades'
                }
            ],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Hgmm'
                },
                {
                    object_id: 'l',
                    name: 'luminance',
                    type: 'lumens'
                }
            ]
        }
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M'
};

describe('Log level API', function () {
    beforeEach(function (done) {
        logger.setLevel('FATAL');

        iotAgentLib.activate(iotAgentConfig, function () {
            iotAgentLib.clearAll(function () {
                done();
            });
        });
    });

    afterEach(function (done) {
        iotAgentLib.clearAll(function () {
            iotAgentLib.deactivate(done);
        });
    });

    describe('When a new valid log level request comes to the API', function () {
        const options = {
            uri: 'http://localhost:' + iotAgentConfig.server.port + '/admin/log',
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            qs: {
                level: 'ERROR'
            }
        };

        it('the real log level should be changed', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);

                done();
            });
        });
    });

    describe('When the current log level is requested', function () {
        const options = {
            uri: 'http://localhost:' + iotAgentConfig.server.port + '/admin/log',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        };

        it('should return a 200 OK', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);

                done();
            });
        });

        it('should return the current log level', function (done) {
            request(options, function (error, response, body) {
                should.exist(body.level);
                body.level.should.equal('FATAL');

                done();
            });
        });
    });

    describe('When a new log level request comes to the API with an invalid level', function () {
        const options = {
            uri: 'http://localhost:' + iotAgentConfig.server.port + '/admin/log',
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            qs: {
                level: 'ALLRIGHT'
            }
        };

        it('should return a 400 error indicating the log level is not valid', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                should.exist(body);

                body.error.should.equal('invalid log level');

                done();
            });
        });
    });

    describe('When a new log level request comes to the API without a log level', function () {
        const options = {
            uri: 'http://localhost:' + iotAgentConfig.server.port + '/admin/log',
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            }
        };

        it('should return a 400 error indicating the log level is missing', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                should.exist(body);

                body.error.should.equal('log level missing');

                done();
            });
        });
    });
});
