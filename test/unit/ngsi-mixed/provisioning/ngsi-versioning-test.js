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
 * please contact with::[contacto@tid.es]
 *
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */

/* eslint-disable no-unused-vars */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const utils = require('../../../tools/utils');
const request = utils.request;

const should = require('should');
const iotAgentConfig = {
    logLevel: 'FATAL',
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'mixed'
    },
    server: {
        name: 'testAgent',
        port: 4041,
        host: 'localhost',
        baseRoot: '/'
    },
    types: {},
    deviceRegistry: {
        type: 'mongodb'
    },
    mongodb: {
        host: 'localhost',
        port: '27017',
        db: 'iotagent'
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M',
    useCBflowControl: true
};
const mongo = require('mongodb').MongoClient;
const mongoUtils = require('../../mongodb/mongoDBUtils');
const optionsCreationDefault = {
    url: 'http://localhost:4041/iot/services',
    method: 'POST',
    json: {
        services: [
            {
                apikey: 'default-test',
                entity_type: 'Device',
                resource: '/iot/default',
                useCBflowControl: true,
                attributes: [
                    {
                        object_id: 's',
                        name: 'status',
                        type: 'Property'
                    }
                ]
            }
        ]
    },
    headers: {
        'fiware-service': 'smartgondor',
        'fiware-servicepath': 'gardens'
    }
};
const optionsCreationV2 = {
    url: 'http://localhost:4041/iot/services',
    method: 'POST',
    json: {
        services: [
            {
                apikey: 'v2-test',
                ngsiVersion: 'v2',
                entity_type: 'Device',
                resource: '/iot/v2',
                useCBflowControl: true,
                attributes: [
                    {
                        object_id: 's',
                        name: 'status',
                        type: 'Property'
                    }
                ]
            }
        ]
    },
    headers: {
        'fiware-service': 'smartgondor',
        'fiware-servicepath': 'gardens'
    }
};

const optionsCreationLD = {
    url: 'http://localhost:4041/iot/services',
    method: 'POST',
    json: {
        services: [
            {
                apikey: 'ld-test',
                entity_type: 'Device',
                ngsiVersion: 'ld',
                resource: '/iot/ld',
                attributes: [
                    {
                        object_id: 's',
                        name: 'status',
                        type: 'Property'
                    }
                ]
            }
        ]
    },
    headers: {
        'fiware-service': 'smartgondor',
        'fiware-servicepath': 'gardens'
    }
};

const deviceCreationV2 = {
    url: 'http://localhost:4041/iot/devices',
    method: 'POST',
    json: {
        devices: [
            {
                device_id: 'light2',
                entity_name: 'light2',
                entity_type: 'Device',
                ngsiVersion: 'v2'
            }
        ]
    },
    headers: {
        'fiware-service': 'smartgondor',
        'fiware-servicepath': 'gardens'
    }
};
let iotAgentDb;
const nock = require('nock');
let contextBrokerMock;

describe('Mixed Mode: ngsiVersion test', function () {
    const values = [
        {
            name: 's',
            type: 'Property',
            value: true
        }
    ];

    beforeEach(function (done) {
        mongoUtils.cleanDbs(function () {
            iotAgentLib.activate(iotAgentConfig, function () {
                mongo.connect('mongodb://localhost:27017/iotagent', function (err, db) {
                    iotAgentDb = db;
                    done();
                });
            });
        });
    });

    afterEach(function (done) {
        iotAgentLib.deactivate(function () {
            iotAgentDb.close(function (error) {
                mongoUtils.cleanDbs(done);
            });
        });
    });
    describe('When a new default device group is provisioned', function () {
        beforeEach(function (done) {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(204);

            request(optionsCreationDefault, function (error, response, body) {
                done();
            });
        });
        it('should operate using NGSI-v2', function (done) {
            iotAgentLib.update('light1', 'Device', 'default-test', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When a new v2 device group is provisioned', function () {
        beforeEach(function (done) {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(204);

            request(optionsCreationV2, function (error, response, body) {
                done();
            });
        });
        it('should operate using NGSI-v2', function (done) {
            iotAgentLib.update('light1', 'Device', 'v2-test', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When an NGSI-LD device group is provisioned', function () {
        beforeEach(function (done) {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('NGSILD-Tenant', 'smartgondor')
                .post('/ngsi-ld/v1/entityOperations/upsert/?options=update')
                .reply(204);
            request(optionsCreationLD, function (error, response, body) {
                done();
            });
        });
        it('should operate using NGSI-LD', function (done) {
            iotAgentLib.update('light1', 'Device', 'ld-test', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    // FIXME: ngisld may use also upsert when update entities in appendMode true (default behaviour)
    // describe('When a new NGSI-LD device group is provisioned and overridden', function () {
    //     beforeEach(function (done) {
    //         nock.cleanAll();

    //         contextBrokerMock = nock('http://192.168.1.1:1026')
    //             .matchHeader('fiware-service', 'smartgondor')
    //             .matchHeader('fiware-servicepath', 'gardens')
    //             .post('/v2/entities?options=upsert,flowControl')
    //             .reply(204);

    //         contextBrokerMock = nock('http://192.168.1.1:1026').post('/v2/entities?options=upsert,flowControl').reply(204);
    //         request(optionsCreationLD, function (error, response, body) {
    //             request(deviceCreationV2, function (error, response, body) {
    //                 done();
    //             });
    //         });
    //     });
    //     it('should operate using NGSI-v2', function (done) {
    //         iotAgentLib.update(
    //             'light2',
    //             'Device',
    //             'v2-test',
    //             values,
    //             { ngsiVersion: 'v2', type: 'Device' },
    //             function (error) {
    //                 should.not.exist(error);
    //                 contextBrokerMock.done();
    //                 done();
    //             }
    //         );
    //     });
    // });
});
