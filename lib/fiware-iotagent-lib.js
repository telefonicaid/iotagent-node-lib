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

var async = require('async'),
    ngsi = require('./services/ngsiService'),
    contextServer = require('./services/northboundServer'),
    logger = require('fiware-node-logger'),
    config;

/**
 * Activates the IoT Agent to start listening for NGSI Calls (to act as a Context Provider). It also creates the
 * device registry for the IoT Agent (based on the deviceRegistry.type configuration option).
 *
 * @param {Object} newConfig            Configuration of the Context Server
 */
function activate(newConfig, callback) {
    var registry;

    config = newConfig;

    if (config.logLevel) {
        logger.setLevel(config.logLevel);
    }

    if (newConfig.deviceRegistry &&
        newConfig.deviceRegistry.type &&
        newConfig.deviceRegistry.type === 'mongodb') {
        registry = require('./services/deviceRegistryMongoDB');
    } else {
        registry = require('./services/deviceRegistryMemory');
    }

    async.series([
        async.apply(registry.init, newConfig),
        async.apply(ngsi.init, registry, newConfig),
        async.apply(contextServer.start, newConfig)
    ], callback);
}

/**
 * Stops the context server.
 */
function deactivate(callback) {
    contextServer.stop(callback);
}

exports.activate = activate;
exports.deactivate = deactivate;
exports.register = ngsi.register;
exports.unregister = ngsi.unregister;
exports.update = ngsi.update;
exports.listDevices = ngsi.listDevices;
exports.setDataUpdateHandler = contextServer.setUpdateHandler;
exports.setDataQueryHandler = contextServer.setQueryHandler;
