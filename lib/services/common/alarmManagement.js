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

var alarmRepository = {},
    logger = require('logops'),
    context = {
        op: 'IoTAgentNGSI.Alarms'
    };

/**
 * Raises a new alarm with the provided data, if the alarm was not already risen.
 *
 * @param {String} alarmName            Name of the alarm to rise
 * @param {String} description          Description of the cause of the alarm
 */
function raise(alarmName, description) {
    if (!alarmRepository[alarmName]) {
        alarmRepository[alarmName] = {
            name: alarmName,
            description: description
        };

        logger.error(context, 'Raising [%s]: %s', alarmName, description);
    }
}

/**
 * Release the alarm with the name passed as a parameter.
 *
 * @param {String} alarmName            Name of the alarm to release.
 */
function release(alarmName) {
    if (alarmRepository[alarmName]) {
        delete alarmRepository[alarmName];
        logger.error(context, 'Releasing [%s]', alarmName);
    }
}

/**
 * Returns the actual contents of the alarm repository.
 *
 * @return {Object}    The alarm repository.
 */
function list() {
    return alarmRepository;
}

/**
 * Clean all the registered alarms. If a callback is passed, it is invoked, once the alarms have been removed.
 */
function clean(callback) {
    alarmRepository = {};

    if (callback) {
        callback();
    }
}

/**
 * Returns a new function that intercepts calls to the targetFn, raising the alarm given as a parameter if the
 * function returns an error (through the callback mechanism), or releasing the alarm if there was an active alarm
 * with that name.
 *
 * This function assumes the last parameter of the target function is a callback, whose first parameter is
 * an error.
 *
 * @param {String} alarmName        Name fo the alarm to manage.
 * @param {Function} targetFn       Function to intercept.
 *
 * @return {Function}               Instrumented function.
 */
function intercept(alarmName, targetFn) {
    function interceptCallback(callback) {
        return function() {
            var originalArguments = Array.prototype.slice.call(arguments),
                error = originalArguments.slice(0, 1);

            if (error && error.length !== 0 && error[0]) {
                raise(alarmName);
            } else {
                release(alarmName);
            }

            return callback.apply(callback, originalArguments);
        };
    }

    return function() {
        var originalArguments = Array.prototype.slice.call(arguments),
            callback = originalArguments.splice(-1);

        originalArguments.push(interceptCallback(callback[0]));

        return targetFn.apply(targetFn, originalArguments);
    };
}

exports.raise = raise;
exports.release = release;
exports.list = list;
exports.clean = clean;
exports.intercept = intercept;
