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

var iotagentLib = require('../../../lib/fiware-iotagent-lib'),
    alarmManagement = iotagentLib.alarms,
    logger = require('logops'),
    should = require('should');

describe('Alarm management system', function() {
    /* jshint sub:true */

    beforeEach(function() {
        logger.setLevel('FATAL');

        alarmManagement.clean();
    });

    afterEach(function() {
        alarmManagement.clean();
    });

    describe('When a new alarm is raised', function() {
        it('should add it to the list of risen alarms', function() {
            var alarmList;

            alarmManagement.raise('TEST_ALARM', 'Test description');
            alarmList = alarmManagement.list();

            should.exist(alarmList['TEST_ALARM']);
            alarmList['TEST_ALARM'].name.should.equal('TEST_ALARM');
            alarmList['TEST_ALARM'].description.should.equal('Test description');
        });
    });

    describe('When a new alarm is raised multiple times', function() {
        it('should only add it once to the risen alarms list', function() {
            var alarmList;

            alarmManagement.raise('TEST_ALARM', 'Test description');
            alarmManagement.raise('TEST_ALARM', 'Test description');
            alarmManagement.raise('TEST_ALARM', 'Test description');
            alarmManagement.raise('TEST_ALARM', 'Test description');
            alarmManagement.raise('TEST_ALARM', 'Test description');
            alarmList = alarmManagement.list();

            Object.keys(alarmList).length.should.equal(1);
        });
    });

    describe('When an alarm is released', function() {
        beforeEach(function() {
            alarmManagement.raise('TEST_ALARM1', 'Test description');
            alarmManagement.raise('TEST_ALARM2', 'Test description');
            alarmManagement.raise('TEST_ALARM3', 'Test description');
            alarmManagement.raise('TEST_ALARM4', 'Test description');

            alarmManagement.release('TEST_ALARM3');
        });

        it('should disappear from the alarms list', function() {
            var alarmList = alarmManagement.list();

            should.not.exist(alarmList['TEST_ALARM3']);
        });

        it('should not affect other alarms', function() {
            var alarmList = alarmManagement.list();

            should.exist(alarmList['TEST_ALARM1']);
            should.exist(alarmList['TEST_ALARM2']);
            should.exist(alarmList['TEST_ALARM4']);
        });
    });

    describe('When the alarm instrumentation function is used on a function', function() {
        var interceptedFn;

        function mockFunction(raiseError, callback) {
            if (raiseError) {
                callback('Error raised in the function');
            } else {
                callback();
            }
        }

        beforeEach(function() {
            interceptedFn = alarmManagement.intercept('TEST_INTERCEPT', mockFunction);
        });

        it('should release the alarm if the function returns a non-error result', function(done) {
            alarmManagement.raise('TEST_INTERCEPT', 'Test description');

            interceptedFn(false, function() {
                var alarmList = alarmManagement.list();

                should.not.exist(alarmList['TEST_INTERCEPT']);

                done();
            });
        });
        it('should raise the alarm if the funciton returns an error result', function(done) {
            interceptedFn(true, function() {
                var alarmList = alarmManagement.list();

                should.exist(alarmList['TEST_INTERCEPT']);

                done();
            });
        });
    });

    describe('When an instrumented function calls the callback with a null value', function() {
        var interceptedFn;

        function mockFunction(raiseError, callback) {
            if (raiseError) {
                callback('Error raised in the function');
            } else {
                callback(null);
            }
        }

        beforeEach(function() {
            interceptedFn = alarmManagement.intercept('TEST_INTERCEPT', mockFunction);
        });

        it('should not raise the alarm', function(done) {
            interceptedFn(false, function() {
                var alarmList = alarmManagement.list();

                should.not.exist(alarmList['TEST_INTERCEPT']);

                done();
            });
        });
    });
});
