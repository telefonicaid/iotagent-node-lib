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
 */
'use strict';

var statsService = require('../../../lib/services/stats/statsRegistry'),
    should = require('should'),
    commonConfig = require('../../../lib/commonConfig'),
    iotAgentConfig = {
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
            interval: 100
        },
        types: {},
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    },
    oldConfig;

describe('Statistics service', function() {
    beforeEach(function(done) {
        oldConfig = commonConfig.getConfig();
        commonConfig.setConfig(iotAgentConfig);

        statsService.globalLoad({}, function() {
            statsService.clearTimers(done);
        });
    });

    afterEach(function(done) {
        commonConfig.setConfig(oldConfig);
        statsService.globalLoad({}, done);
    });

    describe('When a new statistic is updated with add()', function() {
        var statName = 'fakeStat',
            statValue = 2;

        beforeEach(function(done) {
            statsService.globalLoad({
                fakeStat: 30
            }, done);
        });

        it('should appear the modified value in the getCurrent() statistics', function(done) {
            statsService.add(statName, statValue, function() {
                statsService.getCurrent(statName, function(error, value) {
                    should.not.exist(error);
                    should.exist(value);
                    value.should.equal(statValue);
                    done();
                });
            });
        });
        it('should add the value to the global values', function(done) {
            statsService.add(statName, statValue, function() {
                statsService.getGlobal(statName, function(error, value) {
                    should.not.exist(error);
                    should.exist(value);
                    value.should.equal(30 + statValue);
                    done();
                });
            });
        });
    });
    describe('When the global statistics are requested', function() {
        beforeEach(function(done) {
            statsService.globalLoad({
                stat1: 82,
                stat2: 38789
            }, done);
        });

        it('should return all the statistics that were created', function(done) {
            statsService.getAllGlobal(function(error, stats) {
                should.not.exist(error);
                should.exist(stats);
                should.exist(stats.stat1);
                should.exist(stats.stat2);
                stats.stat1.should.equal(82);
                stats.stat2.should.equal(38789);

                done();
            });
        });
    });
    describe('When the current statistics are reset', function() {
        beforeEach(function(done) {
            statsService.add('statA', 42, function() {
                statsService.add('statB', 52, done);
            });
        });

        it('should return a value of zero for any of the individual statistics', function(done) {
            statsService.resetCurrent(function(error) {
                should.not.exist(error);

                statsService.getAllCurrent(function(error, data) {
                    should.exist(data);
                    should.exist(data.statA);
                    should.exist(data.statB);
                    data.statA.should.equal(0);
                    data.statB.should.equal(0);
                    done();
                });
            });
        });
    });
    describe('When a new periodic stats action is set', function() {
        var valueCurrent = 0,
            valueGlobal = 0,
            times = 0;

        beforeEach(function(done) {
            statsService.globalLoad({
                stat1: 10
            }, function() {
                statsService.add('stat1', 5, done);
            });
        });

        function mockedAction(current, global, callback) {
            valueCurrent = current.stat1;
            valueGlobal = global.stat1;
            times++;
            callback();
        }

        it('should be triggered with the periodicity stated in the config.stats.interval parameter', function(done) {
            statsService.addTimerAction(mockedAction, function() {
                setTimeout(function() {
                    statsService.clearTimers(function() {
                        valueCurrent.should.equal(5);
                        valueGlobal.should.equal(15);
                        times.should.equal(4);
                        done();
                    });
                }, 480);
            });
        });
    });
});
