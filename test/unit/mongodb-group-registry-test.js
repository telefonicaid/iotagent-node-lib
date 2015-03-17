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
    _ = require('underscore'),
    async = require('async'),
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
        deviceRegistry: {
            type: 'mongodb',
            host: 'localhost',
            port: '27017',
            db: 'iotagent'
        },
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    },
    mongo = require('mongodb').MongoClient,
    mongoUtils = require('./mongoDBUtils'),
    optionsCreation = {
        url: 'http://localhost:4041/iot/agents/testAgent/services',
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
        url: 'http://localhost:4041/iot/agents/testAgent/services',
        method: 'DELETE',
        json: {},
        headers: {
            'fiware-service': 'TestService',
            'fiware-servicepath': '/testingPath'
        }
    },
    optionsUpdate = {
        url: 'http://localhost:4041/iot/agents/testAgent/services',
        method: 'PUT',
        json: {
            trust: '8970A9078A803H3BL98PINEQRW8342HBAMS',
            cbHost: 'http://anotherUnexistentHost:1026',
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
        },
        headers: {
            'fiware-service': 'TestService',
            'fiware-servicepath': '/testingPath'
        }
    },
    optionsList = {
        url: 'http://localhost:4041/iot/agents/testAgent/services',
        method: 'GET',
        json: {},
        headers: {
            'fiware-service': 'TestService',
            'fiware-servicepath': '/*'
        }
    },
    optionsGet = {
        url: 'http://localhost:4041/iot/agents/testAgent/services',
        method: 'GET',
        json: {},
        headers: {
            'fiware-service': 'TestService',
            'fiware-servicepath': '/testingPath'
        }
    },
    iotAgentDb;

describe('MongoDB Group Registry test', function() {

    beforeEach(function(done) {
        iotAgentLib.activate(iotAgentConfig, function() {
            mongo.connect('mongodb://localhost:27017/iotagent', function(err, db) {
                iotAgentDb = db;
                done();
            });
        });
    });

    afterEach(function(done) {
        iotAgentLib.deactivate(function() {
            iotAgentDb.close(function(error) {
                mongoUtils.cleanDbs(done);
            });
        });
    });
    describe('When a new device group creation request arrives', function() {
        it('should store it in the DB', function(done) {
            request(optionsCreation, function(error, response, body) {
                iotAgentDb.collection('groups').find({}).toArray(function(err, docs) {
                    should.not.exist(err);
                    should.exist(docs);
                    should.exist(docs.length);
                    docs.length.should.equal(1);
                    should.exist(docs[0].type);
                    should.exist(docs[0].apikey);
                    docs[0].type.should.equal('Light');
                    docs[0].apikey.should.equal('801230BJKL23Y9090DSFL123HJK09H324HV8732');
                    done();
                });
            });
        });
        it('should store the service information from the headers into the DB', function(done) {
            request(optionsCreation, function(error, response, body) {
                iotAgentDb.collection('groups').find({}).toArray(function(err, docs) {
                    should.not.exist(err);
                    should.exist(docs[0].service);
                    should.exist(docs[0].subservice);
                    docs[0].service.should.equal('TestService');
                    docs[0].subservice.should.equal('/testingPath');
                    done();
                });
            });
        });
    });

    describe('When a new device group creation request arrives with an existant (apikey, resource) pair', function() {
        it('should return a DUPLICATE_GROUP error', function(done) {
            request(optionsCreation, function(error, response, body) {
                request(optionsCreation, function(error, response, body) {
                    response.statusCode.should.equal(400);
                    body.name.should.equal('DUPLICATE_GROUP');
                    done();
                });
            });
        });
    });

    describe('When a device group removal request arrives', function() {
        beforeEach(function(done) {
            request(optionsCreation, done);
        });

        it('should remove it from the database', function(done) {
            request(optionsDelete, function(error, response, body) {
                iotAgentDb.collection('groups').find({}).toArray(function(err, docs) {
                    should.not.exist(err);
                    should.exist(docs);
                    should.exist(docs.length);
                    docs.length.should.equal(0);
                    done();
                });
            });
        });
    });

    describe('When a device group update request arrives', function() {
        beforeEach(function(done) {
            request(optionsCreation, done);
        });

        it('should update the values in the database', function(done) {
            request(optionsUpdate, function(error, response, body) {
                iotAgentDb.collection('groups').find({}).toArray(function(err, docs) {
                    should.not.exist(err);
                    should.exist(docs);
                    should.exist(docs[0].cbHost);
                    docs[0].cbHost.should.equal('http://anotherUnexistentHost:1026');
                    done();
                });
            });
        });
    });

    describe('When a device group listing request arrives', function() {
        beforeEach(function(done) {
            var optionsCreation1 = _.clone(optionsCreation),
                optionsCreation2 = _.clone(optionsCreation),
                optionsCreation3 = _.clone(optionsCreation);


            optionsCreation2.json = { services: [] };
            optionsCreation3.json = { services: [] };

            optionsCreation2.json.services[0] = _.clone(optionsCreation.json.services[0]);
            optionsCreation3.json.services[0] = _.clone(optionsCreation.json.services[0]);

            optionsCreation2.json.services[0].apikey = 'qwertyuiop';
            optionsCreation3.json.services[0].apikey = 'lkjhgfds';

            async.series([
                async.apply(request, optionsCreation1),
                async.apply(request, optionsCreation2),
                async.apply(request, optionsCreation3)
            ], function (error, results) {
                done();
            });
        });

        it('should return all the configured device groups from the database', function(done) {
            request(optionsList, function(error, response, body) {
                body.count.should.equal(3);
                done();
            });
        });
    });

    describe('When a device info request arrives', function() {
        beforeEach(function(done) {
            async.series([
                async.apply(request, optionsCreation)
            ], done);
        });

        it('should return all the configured device groups from the database', function(done) {
            request(optionsGet, function(error, response, body) {
                body.service.should.equal('TestService');
                done();
            });
        });
    });
});
