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
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 */
'use strict';

/* jshint camelcase: false */

var migration = require('../../../lib/command/migration'),
    mongo = require('mongodb').MongoClient,
    mongoUtils = require('../mongodb/mongoDBUtils'),
    utils = require('../../tools/utils'),
    logger = require('logops'),
    async = require('async'),
    apply = async.apply,
    should = require('should'),
    deviceCollection = utils.readExampleFile('./test/unit/examples/mongoCollections/devices.json'),
    configurationCollection = utils.readExampleFile('./test/unit/examples/mongoCollections/configurations.json'),
    originDb,
    targetDb;

describe('MongoDB migration', function() {
    beforeEach(function(done) {
        logger.setLevel('FATAL');

        mongo.connect('mongodb://localhost:27017/iotOrigin', function(err, db) {
            originDb = db;
            mongo.connect('mongodb://localhost:27017/iotTarget', function(err, db) {
                targetDb = db;
                async.series([
                    apply(mongoUtils.populate, 'localhost', 'iotOrigin', deviceCollection, 'DEVICE'),
                    apply(mongoUtils.populate, 'localhost', 'iotOrigin', configurationCollection, 'SERVICE')
                ], done);
            });
        });
    });

    afterEach(function(done) {
        mongoUtils.cleanDb('localhost', 'iotTarget', function(error) {
            mongoUtils.cleanDb('localhost', 'iotOrigin', function(error) {
                originDb.close(function(error) {
                    targetDb.close(function(error) {
                        done();
                    });
                });
            });
        });
    });

    describe('When the full migration command is executed for two databases', function() {
        var config = {
            host: 'localhost',
            port: '27017'
        };

        it('should migrate all the services', function(done) {
            migration.migrate(config, 'iotOrigin', 'iotTarget', null, null, function() {
                targetDb.collection('groups').find({}).toArray(function(err, docs) {
                    should.not.exist(err);
                    docs.length.should.equal(3);
                    done();
                });
            });
        });
        it('should migrate all the devices', function(done) {
            migration.migrate(config, 'iotOrigin', 'iotTarget', null, null, function() {
                targetDb.collection('devices').find({}).toArray(function(err, docs) {
                    should.not.exist(err);
                    docs.length.should.equal(4);
                    done();
                });
            });
        });
        it('should migrate all the fields for each device', function(done) {
            migration.migrate(config, 'iotOrigin', 'iotTarget', null, null, function() {
                targetDb.collection('groups').find({
                    service: 'dumb_mordor'
                }).toArray(function(err, docs) {
                    should.not.exist(err);
                    docs.length.should.equal(1);
                    should.exist(docs[0].apikey);
                    should.exist(docs[0].cbHost);
                    should.exist(docs[0].resource);
                    should.exist(docs[0].service);
                    should.exist(docs[0].subservice);
                    should.exist(docs[0].type);
                    should.exist(docs[0].staticAttributes);
                    done();
                });
            });
        });
        it('should migrate all the fields for each service', function(done) {
            migration.migrate(config, 'iotOrigin', 'iotTarget', null, null, function() {
                targetDb.collection('devices').find({
                    id: 'gk20'
                }).toArray(function(err, docs) {
                    should.not.exist(err);
                    docs.length.should.equal(1);
                    should.exist(docs[0].id);
                    should.exist(docs[0].name);
                    should.exist(docs[0].protocol);
                    should.exist(docs[0].service);
                    should.exist(docs[0].subservice);
                    should.exist(docs[0].type);
                    should.exist(docs[0].active);
                    should.exist(docs[0].staticAttributes);
                    docs[0].id = 'gk20';
                    docs[0].name = 'The GK20 Entity';
                    docs[0].protocol = 'PDI-IoTA-UltraLight';
                    docs[0].service = 'smart_gondor';
                    docs[0].subservice = '/gardens';
                    docs[0].type = 'acme.lights.sensor';
                    done();
                });
            });
        });
    });

    describe('When a service migration command is executed', function() {
        var config = {
            host: 'localhost',
            port: '27017'
        };

        it('should migrate just the service\'s  configurations', function(done) {
            migration.migrate(config, 'iotOrigin', 'iotTarget', 'smart_gondor', null, function() {
                targetDb.collection('groups').find({}).toArray(function(err, docs) {
                    should.not.exist(err);
                    docs.length.should.equal(1);
                    done();
                });
            });
        });
        it('should migrate just the service\'s devices', function(done) {
            migration.migrate(config, 'iotOrigin', 'iotTarget', 'smart_gondor', null, function() {
                targetDb.collection('devices').find({}).toArray(function(err, docs) {
                    should.not.exist(err);
                    docs.length.should.equal(3);
                    done();
                });
            });
        });
    });

    describe('When a device has an empty string in its name', function() {
        var config = {
            host: 'localhost',
            port: '27017'
        };

        it('should set the name as undefined', function(done) {
            migration.migrate(config, 'iotOrigin', 'iotTarget', 'dumb_mordor', null, function() {
                targetDb.collection('devices').find({}).toArray(function(err, docs) {
                    docs.length.should.equal(1);
                    should.exist(docs[0].name);
                    docs[0].name.should.equal(docs[0].type + ':' + docs[0].id);
                    done();
                });
            });
        });
    });

    describe('When a subservice migration command is executed', function() {
        var config = {
            host: 'localhost',
            port: '27017'
        };

        it('should migrate just the subservice\'s devices', function(done) {
            migration.migrate(config, 'iotOrigin', 'iotTarget', 'smart_gondor', '/gardens', function() {
                targetDb.collection('devices').find({}).toArray(function(err, docs) {
                    should.not.exist(err);
                    docs.length.should.equal(1);
                    done();
                });
            });
        });
    });

    describe('When a subservice migration configuration has a protocol translation table', function() {
        var config = {
            host: 'localhost',
            port: '27017',
            protocols: {
                'PDI-IoTA-UltraLight': 'NODE-Ultralight'
            }
        };

        it('should change the protocol to the translated one', function(done) {
            migration.migrate(config, 'iotOrigin', 'iotTarget', 'smart_gondor', '/gardens', function() {
                targetDb.collection('devices').find({}).toArray(function(err, docs) {
                    should.not.exist(err);
                    docs.length.should.equal(1);
                    docs[0].protocol.should.equal('NODE-Ultralight');
                    done();
                });
            });
        });
    });
});
