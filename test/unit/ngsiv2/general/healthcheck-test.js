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
 *
 * Modified by: AVG
 */

/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-expressions */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const should = require('should');
const nock = require('nock');
const utils = require('../../../tools/utils');
const request = utils.request;
const config = require('../../../../lib/commonConfig');
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
    iotManager: {
        host: '192.168.1.1',
        port: 9876,
        path: '/protocols',
        protocol: 'GENERIC_PROTOCOL',
        description: 'A generic protocol',
        agentPath: '/iot'
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M'
};

let contextBrokerMock;
let iotamMock;

describe('About API with check health', function () {
    beforeEach(function (done) {
        nock.cleanAll();

        contextBrokerMock = nock('http://192.168.1.1:1026').get('/version').reply(200, '4.9.0');

        iotamMock = nock('http://192.168.1.1:9876')
            .post('/protocols', utils.readExampleFile('./test/unit/examples/iotamRequests/registrationEmpty.json'))
            .reply(200, utils.readExampleFile('./test/unit/examples/iotamResponses/registrationSuccess.json'));
        iotamMock.get('/iot/protocols').reply(200, 'UP');

        iotAgentLib.activate(iotAgentConfig, function (err) {
            iotAgentLib.clearAll(function (err2) {
                done();
            });
        });
    });

    afterEach(function (done) {
        nock.cleanAll();
        iotAgentLib.clearAll(function () {
            iotAgentLib.deactivate(done);
        });
    });

    describe('When the IoT Agent is started with health check', function () {
        it('should respond health check state in about API', function (done) {
            const options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/about',
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                }
            };
            /* eslint-disable-next-line consistent-return */
            request(options, function (error, response, body) {
                if (error) { 
                    return done(error);
                }
                response.statusCode.should.equal(200);
                body.connections.contextBroker.ok.should.equal(true);
                body.connections.iotagentManager.ok.should.equal(true);

                contextBrokerMock.done();
                iotamMock.done();
                done();
            });
        });
    });
});
