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
 * please contact with::daniel.moranjimenez@telefonica.com
 */
'use strict';

var config,
    globalStats = {},
    currentStats = {};

/**
 * Add a new stat value to the specified key of the stats registry. The stat is added
 * both to the global and current stats.
 *
 * @param {String} key          Name of the stat that is going to be written.
 * @param {Number} value        Value to be added to the total.
 */
function add(key, value, callback) {
    if (currentStats[key]) {
        currentStats[key] += value;
    } else {
        currentStats[key] = value;
    }

    if (globalStats[key]) {
        globalStats[key] += value;
    } else {
        globalStats[key] = value;
    }

    callback(null);
}

/**
 * Get the current value of a particular stat.
 *
 * @param {String} key          Name of the stat to retrive.
 */
function getCurrent(key, callback) {
    callback(null, currentStats[key]);
}

/**
 * Get the global value of the selected attribute.
 *
 * @param {String} key          Name of the stat to retrive.
 */
function getGlobal(key, callback) {
    callback(null, globalStats[key]);
}

/**
 * Get all the global stats currently stored in the repository.
 */
function getAllGlobal(callback) {
    callback(null, globalStats);
}

/**
 * Get all the current stats currently stored in the repository.
 */
function getAllCurrent(callback) {
    callback(null, currentStats);
}

/**
 * Loads the values passed as parameters into the global statistics repository.
 *
 * @param {Object} values       Key-value map with the values to be load.
 */
function globalLoad(values, callback) {
    globalStats = values;
    currentStats = {};

    callback(null);
}

/**
 * Changes the configuration of the Stats Registry service.
 *
 * @param {Object} newConfig        New configuration of the registry.
 */
function init(newConfig) {
    config = newConfig;
}

/**
 * Reset each of the current stats to value zero.
 */
function resetCurrent(callback) {
    for (var i in currentStats) {
        if (currentStats.hasOwnProperty(i)) {
            currentStats[i] = 0;
        }
    }

    callback();
}

exports.init = init;
exports.add = add;
exports.getCurrent = getCurrent;
exports.getGlobal = getGlobal;
exports.getAllGlobal = getAllGlobal;
exports.getAllCurrent = getAllCurrent;
exports.globalLoad = globalLoad;
exports.resetCurrent = resetCurrent;
