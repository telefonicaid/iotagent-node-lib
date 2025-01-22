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
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 *
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const should = require('should');
const logger = require('logops');
const nock = require('nock');
let contextBrokerMock;
const iotAgentConfig = {
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'v2'
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
        }
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    useCBflowControl: true
};

describe('NGSI-v2 - Custom plugin', function () {
    let updateInvoked = false;
    let queryInvoked = false;

    function updatePlugin(entity, typeInformation, callback) {
        updateInvoked = true;
        return callback(null, entity, typeInformation);
    }
    function queryPlugin(entity, typeInformation, callback) {
        queryInvoked = true;
        return callback(null, entity, typeInformation);
    }
    beforeEach(function (done) {
        logger.setLevel('FATAL');

        iotAgentLib.activate(iotAgentConfig, function () {
            iotAgentLib.clearAll(function () {
                iotAgentLib.addUpdateMiddleware(updatePlugin);
                iotAgentLib.addQueryMiddleware(queryPlugin);
                done();
            });
        });
    });

    afterEach(function (done) {
        iotAgentLib.clearAll(function () {
            iotAgentLib.deactivate(done);
            updateInvoked = false;
            queryInvoked = false;
        });
    });
    describe('When an update occurs', function () {
        const values = [
            {
                name: 'state',
                type: 'Boolean',
                value: 'true'
            },
            {
                name: 'dimming',
                type: 'Number',
                value: 23
            }
        ];

        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(204);
        });

        it('should invoke the plugin', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                updateInvoked.should.equal(true);
                done();
            });
        });
    });
    describe('When an query occurs', function () {
        beforeEach(function () {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .get('/v2/entities/light1/attrs')
                .query({ type: 'Light', attrs: 'state,dimming' })
                .reply(200, { state: 'good', dimming: '23' });
        });

        it('should invoke the plugin', function (done) {
            const attributes = ['state', 'dimming'];
            iotAgentLib.query('light1', 'Light', '', attributes, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                should.not.exist(error);
                queryInvoked.should.equal(true);
                done();
            });
        });
    });
});
