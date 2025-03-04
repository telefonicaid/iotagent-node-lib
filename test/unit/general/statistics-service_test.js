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

const statsService = require('../../../lib/services/stats/statsRegistry');
const should = require('should');
const commonConfig = require('../../../lib/commonConfig');
const iotAgentConfig = {
    logLevel: 'FATAL',
    contextBroker: {
        host: '192.168.1.1',
        port: '1026'
    },
    server: {
        port: 4041,
        host: 'localhost',
        baseRoot: '/'
    },
    types: {},
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M'
};
let oldConfig;

describe('Statistics service', function () {
    beforeEach(function (done) {
        oldConfig = commonConfig.getConfig();
        commonConfig.setConfig(iotAgentConfig);

        statsService.globalLoad({}, done);
    });

    afterEach(function (done) {
        commonConfig.setConfig(oldConfig);
        statsService.globalLoad({}, done);
    });

    describe('When a new statistic is updated with add()', function () {
        const statName = 'fakeStat';
        const statValue = 2;

        beforeEach(function (done) {
            statsService.globalLoad(
                {
                    fakeStat: 30
                },
                done
            );
        });

        it('should add the value to the global values', function (done) {
            statsService.add(statName, statValue, function () {
                statsService.getGlobal(statName, function (error, value) {
                    should.not.exist(error);
                    should.exist(value);
                    value.should.equal(30 + statValue);
                    done();
                });
            });
        });
    });
    describe('When the global statistics are requested', function () {
        beforeEach(function (done) {
            statsService.globalLoad(
                {
                    stat1: 82,
                    stat2: 38789
                },
                done
            );
        });

        it('should return all the statistics that were created', function (done) {
            statsService.getAllGlobal(function (error, stats) {
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
});
