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
    apply = async.apply,
    ngsi = require('./services/ngsiService'),
    statsRegistry = require('./services/statsRegistry'),
    deviceService = require('./services/deviceService'),
    groupConfig = require('./services/groupService'),
    security = require('./services/securityService'),
    iotManager = require('./services/iotManagerService'),
    contextServer = require('./services/northboundServer'),
    errors = require('./errors'),
    logger = require('logops'),
    context = {
        op: 'IoTAgentNGSI.Global'
    },
    config;

function activateStatLogs(newConfig, callback) {
    if (newConfig.stats && newConfig.stats.interval) {
        statsRegistry.addTimerAction(statsRegistry.logStats, callback);
    }

    statsRegistry.globalLoad({
        deviceCreationRequests: 0,
        deviceRemovalRequests: 0,
        measureRequests: 0
    }, callback);
}

/**
 * Activates the IoT Agent to start listening for NGSI Calls (to act as a Context Provider). It also creates the
 * device registry for the IoT Agent (based on the deviceRegistry.type configuration option).
 *
 * @param {Object} newConfig            Configuration of the Context Server
 */
function doActivate(newConfig, callback) {
    var registry,
        groupRegistry;

    config = newConfig;

    if (config.logLevel) {
        logger.setLevel(config.logLevel);
    }

    logger.info(context, 'Activating IOT Agent NGSI Library.');

    if (newConfig.deviceRegistry &&
        newConfig.deviceRegistry.type &&
        newConfig.deviceRegistry.type === 'mongodb') {
        logger.info(context, 'MongoDB Device registry selected for NGSI Library');

        registry = require('./services/deviceRegistryMongoDB');
        groupRegistry = require('./services/groupRegistryMongoDB');
    } else {
        logger.info(context, 'Falling back to Transient Memory registry for NGSI Library');

        registry = require('./services/deviceRegistryMemory');
        groupRegistry = require('./services/groupRegistryMemory');
    }

    exports.clearAll = registry.clear;

    async.series([
        apply(registry.init, newConfig),
        apply(statsRegistry.init, newConfig),
        apply(ngsi.init, registry, groupRegistry, newConfig),
        apply(iotManager.init, groupRegistry),
        apply(deviceService.init, registry, groupRegistry, newConfig),
        apply(groupConfig.init, groupRegistry, newConfig),
        apply(security.init, newConfig),
        apply(contextServer.start, newConfig),
        apply(activateStatLogs, newConfig)
    ], callback);
}

function checkConfig(newConfig, callback) {
    var mandatory = ['providerUrl', 'types'],
        missing = [];

    for (var i in mandatory) {
        if (!newConfig[mandatory[i]]) {
            missing.push(mandatory[i]);
        }
    }

    if (missing.length === 0) {
        callback();
    } else {
        callback(new errors.MissingConfigParams(missing));
    }
}

function activate(newConfig, callback) {
    async.series([
        apply(checkConfig, newConfig),
        apply(doActivate, newConfig),
        apply(iotManager.register, newConfig)
    ], callback);
}

/**
 * Stops the HTTP server.
 */
function deactivate(callback) {
    contextServer.stop(callback);
}

exports.activate = activate;
exports.deactivate = deactivate;
exports.register = deviceService.register;
exports.updateRegister = deviceService.updateRegister;
exports.unregister = deviceService.unregister;
exports.query = ngsi.query;
exports.update = ngsi.update;
exports.setCommandResult = ngsi.setCommandResult;
exports.listDevices = deviceService.listDevices;
exports.getDevice = deviceService.getDevice;
exports.getDeviceByName = deviceService.getDeviceByName;
exports.getConfiguration = groupConfig.get;
exports.setDataUpdateHandler = contextServer.setUpdateHandler;
exports.setCommandHandler = contextServer.setCommandHandler;
exports.setDataQueryHandler = contextServer.setQueryHandler;
exports.setConfigurationHandler = contextServer.setConfigurationHandler;
exports.setProvisioningHandler = contextServer.setProvisioningHandler;
