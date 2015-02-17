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
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 */
'use strict';

var iotAgentLib = require('../../'),
    request = require('request'),
    should = require('should'),
    iotAgentConfig = {
        logLevel: 'FATAL',
        contextBroker: {
            host: '10.11.128.16',
            port: '1026'
        },
        server: {
            name: 'testAgent',
            port: 4041,
            baseRoot: '/'
        },
        types: {},
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    },
    optionsCreation = {
        url: 'http://localhost:4041/iot/agents/testAgent',
        method: 'POST',
        json: {
            services: [
                {
                    resource: '/deviceTest',
                    apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732',
                    type: 'Light',
                    trust: '8970A9078A803H3BL98PINEQRW8342HBAMS',
                    cbHost: 'http://unexistentHost:1026',
                    commands: [
                        {
                            name: 'wheel1',
                            type: 'Wheel'
                        }
                    ],
                    lazy: [
                        {
                            name: 'luminescence',
                            type: 'Lumens'
                        }
                    ],
                    active: [
                        {
                            name: 'status',
                            type: 'Boolean'
                        }
                    ]
                }
            ]
        },
        headers: {
            'fiware-service': 'TestService',
            'fiware-servicepath': '/testingPath'
        }
    },
    optionsDelete = {
        url: 'http://localhost:4041/iot/agents/testAgent',
        method: 'DELETE',
        json: {},
        headers: {
            'fiware-service': 'TestService',
            'fiware-servicepath': '/*'
        }
    },
    optionsUpdate = {
        url: 'http://localhost:4041/iot/agents/testAgent',
        method: 'PUT',
        json: {
            services: [
                {
                    type: 'Light',
                    trust: '8970A9078A803H3BL98PINEQRW8342HBAMS',
                    cbHost: 'http://unexistentHost:1026',
                    commands: [
                        {
                            name: 'wheel1',
                            type: 'Wheel'
                        }
                    ],
                    lazy: [
                        {
                            name: 'luminescence',
                            type: 'Lumens'
                        }
                    ],
                    active: [
                        {
                            name: 'status',
                            type: 'Boolean'
                        }
                    ]
                }
            ]
        },
        headers: {
            'fiware-service': 'TestService',
            'fiware-servicepath': '/testingPath'
        }
    };

describe.only('Device Group Configuration API', function() {

    beforeEach(function(done) {
        iotAgentLib.activate(iotAgentConfig, done);
    });

    afterEach(function(done) {
        iotAgentLib.deactivate(done);
    });
    describe('When a new device group creation request arrives', function() {
        it('should return a 200 OK', function(done) {
            request(optionsCreation, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);
                done();
            });
        });
        it('should store it in the DB');
        it('should store the service information from the headers into the DB');
        it('should add the device group to the statically configured ones');
    });
    describe('When a creation request arrives without the fiware-service header', function() {
        beforeEach(function() {
            delete optionsCreation.headers['fiware-service'];
        });

        afterEach(function() {
            optionsCreation.headers['fiware-service'] = 'TestService';
        });

        it('should fail with a 400 MISSING_HEADERS Error', function(done) {
            request(optionsCreation, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_HEADERS');
                done();
            });
        });
    });
    describe('When a creation request arrives without the fiware-servicepath header', function() {
        beforeEach(function() {
            delete optionsCreation.headers['fiware-servicepath'];
        });

        afterEach(function() {
            optionsCreation.headers['fiware-servicepath'] = '/testingPath';
        });

        it('should fail with a 400 MISSING_HEADERS Error', function(done) {
            request(optionsCreation, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_HEADERS');
                done();
            });
        });
    });
    describe('When a device group with a missing mandatory attribute in the payload arrives', function() {
        beforeEach(function() {
            delete optionsCreation.json.services[0].resource;
        });

        afterEach(function() {
            optionsCreation.json.services[0].resource = '/deviceTest';
        });

        it('should fail with a 400 WRONG_SYNTAX error', function(done) {
            request(optionsCreation, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('WRONG_SYNTAX');
                done();
            });
        });
    });
    describe('When a device group removal request arrives', function() {
        it('should return a 200 OK', function(done) {
            request(optionsDelete, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);
                done();
            });
        });
        it('should remove it from the database');
        it('should remove it from the configuration');
    });

    describe('When a device group removal request arrives without the mandatory headers', function() {
        beforeEach(function() {
            delete optionsDelete.headers['fiware-servicepath'];
        });

        afterEach(function() {
            optionsDelete.headers['fiware-servicepath'] = '/testingPath';
        });

        it('should fail with a 400 MISSING_HEADERS Error', function(done) {
            request(optionsDelete, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_HEADERS');
                done();
            });
        });
    });

    describe('When a device group update request arrives', function() {
        it('should return a 200 OK', function(done) {
            request(optionsUpdate, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);
                done();
            });
        });
        it('should update the values in the database');
        it('should update the values in the configuration');
    });

    describe('When a device group update request arrives without the mandatory headers', function() {
        beforeEach(function() {
            delete optionsUpdate.headers['fiware-servicepath'];
        });

        afterEach(function() {
            optionsUpdate.headers['fiware-servicepath'] = '/testingPath';
        });

        it('should fail with a 400 MISSING_HEADERS Error', function(done) {
            request(optionsUpdate, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_HEADERS');
                done();
            });
        });
    });

    describe('When a device group listing request arrives', function() {
        var options = {
            url: 'http://localhost:4041/iot/agents/testAgent',
            method: 'GET',
            json: {},
            headers: {
                'fiware-service': 'TestService',
                'fiware-servicepath': '/*'
            }
        };

        it('should return a 200 OK', function(done) {
            request(options, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(200);
                done();
            });
        });
        it('should return all the configured device groups from the database');
    });
});