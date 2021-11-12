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

const statsService = require('../../../lib/services/stats/statsRegistry');
const commonConfig = require('../../../lib/commonConfig');
const iotAgentLib = require('../../../lib/fiware-iotagent-lib');
const should = require('should');
const async = require('async');
const mongoUtils = require('../../tools/mongoDBUtils');
const iotAgentConfig = {
    logLevel: 'FATAL',
    contextBroker: {
        host: '192.168.1.1',
        port: '1026'
    },
    server: {
        port: 4041,
        baseRoot: '/'
    },
    stats: {
        interval: 50,
        persistence: true
    },
    mongodb: {
        host: 'localhost',
        port: '27017',
        db: 'iotagent'
    },
    types: {},
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M'
};
let iotAgentDb;
let oldConfig;

describe('Statistics persistence service', function () {
    function insertDummy(n, callback) {
        iotAgentDb.collection('tests').insertOne({ test: 'test' }, function () {
            callback();
        });
    }

    beforeEach(function (done) {
        oldConfig = commonConfig.getConfig();

        iotAgentLib.activate(iotAgentConfig, function (error) {
            statsService.globalLoad({}, function () {
                iotAgentDb = require('../../../lib/model/dbConn').db;

                async.times(10, insertDummy, function () {
                    done();
                });
            });
        });
    });

    afterEach(function (done) {
        iotAgentLib.deactivate(function (error) {
            commonConfig.setConfig(oldConfig);
            statsService.globalLoad({}, function () {
                mongoUtils.cleanDbs(done);
            });
        });
    });

    describe('When a periodic persitence action is set', function () {
        beforeEach(function (done) {
            statsService.globalLoad(
                {
                    stat1: 10
                },
                function () {
                    statsService.add('stat1', 5, done);
                }
            );
        });

        it('should store all the records in the database', function (done) {
            statsService.addTimerAction(statsService.mongodbPersistence, function () {
                setTimeout(function () {
                    statsService.clearTimers(function () {
                        iotAgentDb
                            .collection('kpis')
                            .find({})
                            .toArray(function (err, docs) {
                                should.not.exist(err);
                                should.exist(docs);
                                docs.length.should.be.above(2);
                                done();
                            });
                    });
                }, 200);
            });
        });
    });
});
