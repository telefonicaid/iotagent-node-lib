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

var async = require('async'),
    _ = require('underscore'),
    apply = async.apply,
    logger = require('logops'),
    config = require('../../commonConfig'),
    dbService = require('../../model/dbConn'),
    globalStats = {},
    currentStats = {},
    timerActions = [],
    timerHandler,
    statsContext = {
        op: 'IoTAgentNGSI.TimedStats'
    };

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

    for (var i in values) {
        if (values.hasOwnProperty(i)) {
            currentStats[i] = 0;
        }
    }

    callback(null);
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

/**
 * Executes all the stored timer actions when a timer click is received.
 */
function tickHandler() {
    process.nextTick(apply(async.series, timerActions));
}

/**
 * Adds a new timer action to the timerActions Array, activating the timer if it was not previously activated.
 *
 * @param {Function} handler        Action to be executed. Should take two statistics objects and a callback.
 */
function addTimerAction(handler, callback) {
    if (!timerHandler && config.getConfig().stats.interval) {
        timerHandler = setInterval(tickHandler, config.getConfig().stats.interval);
    }

    timerActions.push(apply(handler, currentStats, globalStats));
    callback();
}

/**
 * Clear the actions array and stop the timers.
 */
function clearTimers(callback) {
    if (timerHandler) {
        clearInterval(timerHandler);
        timerHandler = undefined;
    }

    timerActions = [];
    callback();
}

/**
 * Predefined stats action that logs the stats to the standard log.
 *
 * @param {Object} currentValues        Current stat values.
 * @param {Object} globalValues         Global stat values.
 */
function logStats(currentValues, globalValues, callback) {
    logger.info(statsContext, 'Global stat values:\n%s\n', JSON.stringify(globalValues, null, 4));
    logger.info(statsContext, 'Current stat values:\n%s\n', JSON.stringify(currentValues, null, 4));

    resetCurrent(callback);
}

/**
 * Predefined action that persists the current value of the stats in the MongoDb instance.
 *
 * @param {Object} currentValues        Current stat values.
 * @param {Object} globalValues         Global stat values.
 */
function mongodbPersistence(currentValues, globalValues, callback) {
    var statStamp = _.clone(globalValues);

    statStamp.timestamp = new Date().toISOString();
    dbService.db.collection('kpis').insert(statStamp, callback);
}

exports.add = add;
exports.getCurrent = getCurrent;
exports.getGlobal = getGlobal;
exports.getAllGlobal = getAllGlobal;
exports.getAllCurrent = getAllCurrent;
exports.globalLoad = globalLoad;
exports.resetCurrent = resetCurrent;
exports.clearTimers = clearTimers;
exports.addTimerAction = addTimerAction;
exports.logStats = logStats;
exports.mongodbPersistence = mongodbPersistence;
