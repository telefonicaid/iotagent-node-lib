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
        logger.info(context, 'Releasing [%s]', alarmName)
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

exports.raise = raise;
exports.release = release;
exports.list = list;
exports.clean = clean;