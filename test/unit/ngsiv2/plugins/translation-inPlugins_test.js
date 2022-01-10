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

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const utils = require('../../../tools/utils');
const request = utils.request;
const should = require('should');
const logger = require('logops');
const nock = require('nock');
let contextBrokerMock;
const iotAgentConfig = {
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        nsgiVersion: 'v2'
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
                    name: 'temperature',
                    type: 'centigrades'
                }
            ],
            active: [
                {
                    name: 'pressure',
                    type: 'Hgmm'
                }
            ]
        },
        BrokenLight: {
            commands: [],
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
            ]
        },
        Termometer: {
            type: 'Termometer',
            commands: [],
            lazy: [
                {
                    name: 'temp',
                    type: 'kelvin'
                }
            ],
            active: []
        },
        Humidity: {
            type: 'Humidity',
            cbHost: 'http://192.168.1.1:3024',
            commands: [],
            lazy: [],
            active: [
                {
                    name: 'humidity',
                    type: 'percentage'
                }
            ]
        },
        Motion: {
            type: 'Motion',
            commands: [],
            lazy: [],
            staticAttributes: [
                {
                    name: 'location',
                    type: 'Vector',
                    value: '(123,523)'
                }
            ],
            active: [
                {
                    name: 'humidity',
                    type: 'percentage'
                }
            ]
        }
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M'
};

describe('NGSI-v2 - Data Mapping Plugins: translation', function () {
    beforeEach(function (done) {
        logger.setLevel('FATAL');

        iotAgentLib.activate(iotAgentConfig, function () {
            iotAgentLib.clearAll(done);
        });
    });

    afterEach(function (done) {
        iotAgentLib.clearAll(function () {
            iotAgentLib.deactivate(done);
        });
    });

    describe('When a new update translation middleware is added to the IoT Agent', function () {
        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .patch(
                    '/v2/entities/light1/attrs?type=Light',
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextRequests/updateContextMiddleware1.json')
                )
                .reply(204);
        });

        it('should execute the translation middlewares', function (done) {
            const values = [
                {
                    name: 'state',
                    type: 'Boolean',
                    value: 'true'
                },
                {
                    name: 'dimming',
                    type: 'Percentage',
                    value: '87'
                }
            ];

            let executed = false;

            function testMiddleware(entity, typeInformation, callback) {
                entity.dimming.value = entity.dimming.value + '%';
                executed = true;
                callback(null, entity, typeInformation);
            }

            iotAgentLib.addUpdateMiddleware(testMiddleware);

            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                executed.should.equal(true);
                done();
            });
        });

        it('should translate the appropriate attributes', function (done) {
            const values = [
                {
                    name: 'state',
                    type: 'Boolean',
                    value: 'true'
                },
                {
                    name: 'dimming',
                    type: 'Percentage',
                    value: '87'
                }
            ];

            function testMiddleware(entity, typeInformation, callback) {
                entity.dimming.value = entity.dimming.value + '%';
                callback(null, entity, typeInformation);
            }

            iotAgentLib.addUpdateMiddleware(testMiddleware);

            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When a new query translation middleware is added to the IoT Agent', function () {
        const attributes = ['state', 'dimming'];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .get('/v2/entities/light1/attrs?attrs=state,dimming&type=Light')

                .reply(
                    200,
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextRequests/updateContextMiddleware2.json')
                );
        });

        it('should call the middleware', function (done) {
            let called = false;

            function testMiddleware(entity, typeInformation, callback) {
                entity.dimming.value = entity.dimming.value + '%';

                called = true;

                callback(null, entity, typeInformation);
            }

            iotAgentLib.addQueryMiddleware(testMiddleware);

            iotAgentLib.query('light1', 'Light', '', attributes, function (error, result) {
                should.not.exist(error);
                called.should.equal(true);
                done();
            });
        });
        it('should call the middleware', function (done) {
            function testMiddleware(entity, typeInformation, callback) {
                entity.dimming.value = entity.dimming.value + '%';
                callback(null, entity, typeInformation);
            }

            iotAgentLib.addQueryMiddleware(testMiddleware);

            iotAgentLib.query('light1', 'Light', '', attributes, function (error, result) {
                should.not.exist(error);
                result.dimming.value.should.equal('23%');
                done();
            });
        });
    });
});
