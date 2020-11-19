/*
 * Copyright 2020 Telefonica Investigación y Desarrollo, S.A.U
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
 * Modified by: Jason Fox - FIWARE Foundation
 */

/* eslint-disable no-unused-vars */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const should = require('should');
const logger = require('logops');
const nock = require('nock');
const mongoUtils = require('../../mongodb/mongoDBUtils');
const request = require('request');
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
        port: 4041
    },
    types: {
        Light: {
            // commands are not defined
            active: [
                {
                    name: 'pressure',
                    type: 'Hgmm'
                }
            ]
        }
    },
    service: 'smartGondor',
    subservice: 'gardens',
    providerUrl: 'http://smartGondor.com'
};
const device = {
    id: 'somelight',
    type: 'Light',
    service: 'smartGondor',
    subservice: 'gardens'
};

describe('NGSI-LD - Update attribute functionalities', function () {
    beforeEach(function (done) {
        logger.setLevel('FATAL');

        nock.cleanAll();

        contextBrokerMock = nock('http://192.168.1.1:1026')
            .matchHeader('fiware-service', 'smartGondor')
            .post('/ngsi-ld/v1/csourceRegistrations/')
            .reply(201, null, { Location: '/ngsi-ld/v1/csourceRegistrations/6319a7f5254b05844116584d' });

        contextBrokerMock
            .matchHeader('fiware-service', 'smartGondor')
            .post('/ngsi-ld/v1/entityOperations/upsert/')
            .reply(204);

        iotAgentLib.activate(iotAgentConfig, done);
    });

    afterEach(function (done) {
        iotAgentLib.clearAll(function () {
            iotAgentLib.deactivate(function () {
                mongoUtils.cleanDbs(function () {
                    nock.cleanAll();
                    iotAgentLib.setDataUpdateHandler();
                    iotAgentLib.setCommandHandler();
                    done();
                });
            });
        });
    });

    describe('When a attribute update arrives to the IoT Agent as Context Provider', function () {
        const options = {
            url:
                'http://localhost:' +
                iotAgentConfig.server.port +
                '/ngsi-ld/v1/entities/urn:ngsi-ld:Light:somelight/attrs/pressure',
            method: 'PATCH',
            json: {
                type: 'Hgmm',
                value: 200
            },
            headers: {
                'fiware-service': 'smartGondor',
                'content-type': 'application/ld+json'
            }
        };

        beforeEach(function (done) {
            iotAgentLib.register(device, function (error) {
                if (error) {
                    done('Device registration failed');
                }
                done();
            });
        });

        it('should call the client handler with correct values, even if commands are not defined', function (done) {
            let handlerCalled = false;

            iotAgentLib.setDataUpdateHandler(function (id, type, service, subservice, attributes, callback) {
                id.should.equal('urn:ngsi-ld:Light:somelight');
                type.should.equal('Light');
                should.exist(attributes);
                attributes.length.should.equal(1);
                attributes[0].name.should.equal('pressure');
                attributes[0].value.should.equal(200);
                handlerCalled = true;

                callback(null, {
                    id,
                    type,
                    attributes
                });
            });

            request(options, function (error, response, body) {
                should.not.exist(error);
                handlerCalled.should.equal(true);
                done();
            });
        });
    });
});
