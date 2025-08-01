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
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 *
 * Developed by: Federico M. Facca - Martel Innovate
 */

/* jshint camelcase: false */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const utils = require('../../../tools/utils');
const should = require('should');
const nock = require('nock');
let contextBrokerMock;
const iotAgentConfig = {
    logLevel: 'FATAL',
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'ld',
        jsonLdContext: 'http://context.json-ld'
    },
    server: {
        port: 4041,
        ldSupport: {
            dataType: 'valueType'
        }
    },
    types: {
        Light: {
            commands: [],
            type: 'Light',
            lazy: [],
            active: [
                {
                    object_id: 'p',
                    name: 'pressure',
                    type: 'Number'
                },
                {
                    object_id: 'e',
                    name: 'consumption',
                    type: 'Number'
                },
                {
                    object_id: 'a',
                    name: 'alive',
                    type: 'Property'
                },
                {
                    object_id: 'u',
                    name: 'updated',
                    type: 'Boolean'
                },
                {
                    object_id: 'm',
                    name: 'manufacturer',
                    type: 'Object'
                },
                {
                    object_id: 'r',
                    name: 'revisions',
                    type: 'Array'
                },
                {
                    object_id: 'd',
                    name: 'date',
                    type: 'Date'
                },
                {
                    object_id: 't',
                    name: 'time',
                    type: 'Time'
                },
                {
                    object_id: 'dt',
                    name: 'datetime',
                    type: 'DateTime'
                }
            ]
        }
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M'
};

describe('NGSI-LD: Value Type', function () {
    // Case: Expression which results is sent as a new attribute
    const values = [
        {
            name: 'e',
            type: 'Number',
            value: 1
        },
        {
            name: 'a',
            type: 'Property',
            value: 'foo'
        },
        {
            name: 'u',
            type: 'Boolean',
            value: false
        },
        {
            name: 'm',
            type: 'Object',
            value: '{"hello": "world"}'
        },
        {
            name: 'r',
            type: 'Array',
            value: '[1,2]'
        },
        {
            name: 'd',
            type: 'Date',
            value: '2025-07-18'
        },
        {
            name: 't',
            type: 'Time',
            value: '14:22:11Z'
        },
        {
            name: 'dt',
            type: 'Datetime',
            value: '2025-07-18T14:22:11Z'
        }
    ];

    describe('When valueType is set to valueType', function () {
        beforeEach(function (done) {
            nock.cleanAll();

            iotAgentConfig.contextBroker.valueType = 'valueType';
            iotAgentLib.activate(iotAgentConfig, function () {
                iotAgentLib.clearAll(function () {
                    done();
                });
            });

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/updateContextValueType1.json')
                )
                .reply(204);
        });

        afterEach(function (done) {
            iotAgentLib.clearAll(function () {
                iotAgentLib.deactivate(done);
            });
        });

        it('should add valueType to the payload', function (done) {
            iotAgentLib.update('ws1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
    describe('When valueType is set to @type', function () {
        beforeEach(function (done) {
            iotAgentConfig.server.ldSupport.dataType = '@type';
            iotAgentLib.activate(iotAgentConfig, function () {
                iotAgentLib.clearAll(function () {
                    done();
                });
            });
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/updateContextValueType2.json')
                )
                .reply(204);
        });

        afterEach(function (done) {
            iotAgentLib.clearAll(function () {
                iotAgentLib.deactivate(done);
            });
        });

        it('should add @type to the payload', function (done) {
            iotAgentLib.update('ws1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});
