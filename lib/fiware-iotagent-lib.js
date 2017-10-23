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
    ngsi = require('./services/ngsi/ngsiService'),
    ngsi2 = require('./services/ngsi2/ngsiService'),
    intoTrans = require('./services/common/domain').intoTrans,
    middlewares = require('./services/common/genericMiddleware'),
    db = require('./model/dbConn'),
    subscriptions = require('./services/ngsi/subscriptionService'),
    subscriptionsNgsi2 = require('./services/ngsi2/subscriptionService'),
    statsRegistry = require('./services/stats/statsRegistry'),
    domainUtils = require('./services/common/domain'),
    deviceService = require('./services/devices/deviceService'),
    deviceServiceNgsi2 = require('./services/devices/deviceServiceNgsi2'),
    groupConfig = require('./services/groups/groupService'),
    commands = require('./services/commands/commandService'),
    commandsNgsi2 = require('./services/commands/commandServiceNgsi2'),
    iotManager = require('./services/common/iotManagerService'),
    contextServer = require('./services/northBound/northboundServer'),
    errors = require('./errors'),
    constants = require('./constants'),
    logger = require('logops'),
    config = require('./commonConfig'),
    context = {
        op: 'IoTAgentNGSI.Global'
    };

function checkNgsi2(newConfig) {
    if (newConfig.contextBroker &&
        newConfig.contextBroker.ngsiVersion &&
        newConfig.contextBroker.ngsiVersion === 'v2') {
        return true;
    }

    return false;
}

function activateStatLogs(newConfig, callback) {
    if (newConfig.stats && newConfig.stats.interval) {
        async.series([
            apply(statsRegistry.globalLoad, {
                deviceCreationRequests: 0,
                deviceRemovalRequests: 0,
                measureRequests: 0
            }),
            apply(statsRegistry.addTimerAction, statsRegistry.logStats)
        ], callback);
    } else {
        callback();
    }
}

/**
 * Handler for uncaught global errors.
 *
 * @param {Object} err          Global error to be process.
 */
function globalErrorHandler(err) {
    logger.fatal(context, 'An unexpected exception has been raised. Ignoring: %s', err);
}

/**
 * Activates the IoT Agent to start listening for NGSI Calls (to act as a Context Provider). It also creates the
 * device registry for the IoT Agent (based on the deviceRegistry.type configuration option).
 *
 * @param {Object} newConfig            Configuration of the Context Server
 */
function doActivate(newConfig, callback) {
    var registry,
        groupRegistry,
        commandRegistry;

    logger.format = logger.formatters.pipe;

    config.setConfig(newConfig);

    logger.getContext = function domainContext() {
        var domainObj = require('domain').active || {};

        return {
            corr: domainObj.corr,
            trans: domainObj.trans,
            op: domainObj.op,
            srv: domainObj.service,
            subsrv: domainObj.subservice,
            msg: domainObj.msg,
            comp: config.componentName || 'IoTAgent'
        };
    };

    logger.info(context, 'Activating IOT Agent NGSI Library.');

    if (newConfig.deviceRegistry &&
        newConfig.deviceRegistry.type &&
        newConfig.deviceRegistry.type === 'mongodb') {
        logger.info(context, 'MongoDB Device registry selected for NGSI Library');

        registry = require('./services/devices/deviceRegistryMongoDB');
        groupRegistry = require('./services/groups/groupRegistryMongoDB');
        commandRegistry = require('./services/commands/commandRegistryMongoDB');
    } else {
        logger.info(context, 'Falling back to Transient Memory registry for NGSI Library');

        registry = require('./services/devices/deviceRegistryMemory');
        groupRegistry = require('./services/groups/groupRegistryMemory');
        commandRegistry = require('./services/commands/commandRegistryMemory');
    }

    if (checkNgsi2(newConfig)) {
        logger.info(context, 'Using NGSIv2');
        ngsi = ngsi2;
        deviceService = deviceServiceNgsi2;
        commands = commandsNgsi2;
        subscriptions = subscriptionsNgsi2;
    }

    exports.clearAll = function(callback) {
        async.series([
            registry.clear,
            groupRegistry.clear,
            commandRegistry.clear,
            ngsi.resetMiddlewares,
            contextServer.clear
        ], callback);
    };

    if (!config.getConfig().dieOnUnexpectedError) {
        process.on('uncaughtException', globalErrorHandler);
    }

    config.setRegistry(registry);
    config.setGroupRegistry(groupRegistry);
    config.setCommandRegistry(commandRegistry);

    commands.start();

    async.series([
        db.configureDb,
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
        iotManager.register
    ], callback);
}

/**
 * Stops the HTTP server.
 */
function deactivate(callback) {
    process.removeListener('uncaughtException', globalErrorHandler);
    commands.stop();
    contextServer.stop(callback);
}

function update(entityName, attributes, typeInformation, token, callback) {
    ngsi.update(entityName, attributes, typeInformation, token, callback);
}

function query(entityName, attributes, typeInformation, token, callback) {
    ngsi.query(entityName, attributes, typeInformation, token, callback);

}

function setCommandResult(entityName, resource, apikey, commandName,
                          commandResult, status, deviceInformation, callback) {
    ngsi.setCommandResult(entityName, resource, apikey, commandName,
                          commandResult, status, deviceInformation, callback);

}

function addUpdateMiddleware(middleware) {
    ngsi.addUpdateMiddleware(middleware);

}

function addQueryMiddleware(middleware) {
    ngsi.addQueryMiddleware(middleware);

}

function resetMiddlewares(middleware) {
    ngsi.resetMiddlewares(middleware);

}

function register(deviceObj, callback) {
    deviceService.register(deviceObj, callback);
}

function updateRegister(deviceObj, callback) {
    deviceService.updateRegister(deviceObj, callback);
}

function unregister(id, service, subservice, callback) {
    deviceService.unregister(id, service, subservice, callback);
}

function listDevices(service, subservice, limit, offset, callback) {
    deviceService.listDevices(service, subservice, limit, offset, callback);
}

function getDevice(deviceId, service, subservice, callback) {
    deviceService.getDevice(deviceId, service, subservice, callback);
}

function getDeviceByName(deviceName, service, subservice, callback) {
    deviceService.getDeviceByName(deviceName, service, subservice, callback);
}

function getDevicesByAttribute(attributeName, attributeValue, service, subservice, callback) {
    deviceService.getDevicesByAttribute(attributeName, attributeValue, service, subservice, callback);
}

function mergeDeviceWithConfiguration(fields, defaults, deviceData, configuration, callback) {
    deviceService.mergeDeviceWithConfiguration(fields, defaults, deviceData, configuration, callback);
}

function retrieveDevice(deviceId, apiKey, callback) {
    deviceService.retrieveDevice(deviceId, apiKey, callback);
}

function clearRegistry(callback) {
    deviceService.clearRegistry(callback);
}

function commandQueue(service, subservice, deviceId, callback) {
    commands.list(service, subservice, deviceId, callback);
}

function addCommand(service, subservice, deviceId, command, callback) {
    commands.add(service, subservice, deviceId, command, callback);
}

function updateCommand(service, subservice, deviceId, name, value, callback) {
    commands.update(service, subservice, deviceId, name, value, callback);
}

function removeCommand(service, subservice, deviceId, name, callback) {
    commands.remove(service, subservice, deviceId, name, callback);
}

function subscribe(device, triggers, content, callback) {
    subscriptions.subscribe(device, triggers, content, callback);
}

function unsubscribe(device, id, callback) {
    subscriptions.unsubscribe(device, id, callback);
}

exports.activate = intoTrans(context, activate);
exports.deactivate = intoTrans(context, deactivate);
exports.register = register;
exports.updateRegister = updateRegister;
exports.unregister = unregister;
exports.query = query;
exports.update = update;
exports.setCommandResult = setCommandResult;
exports.listDevices = listDevices;
exports.getDevice = getDevice;
exports.getDeviceByName = getDeviceByName;
exports.getDevicesByAttribute = getDevicesByAttribute;
exports.mergeDeviceWithConfiguration = mergeDeviceWithConfiguration;
exports.retrieveDevice = retrieveDevice;
exports.getConfiguration = groupConfig.get;
exports.findConfiguration = groupConfig.find;
exports.setDataUpdateHandler = contextServer.setUpdateHandler;
exports.setCommandHandler = contextServer.setCommandHandler;
exports.setDataQueryHandler = contextServer.setQueryHandler;
exports.setConfigurationHandler = contextServer.setConfigurationHandler;
exports.setProvisioningHandler = contextServer.setProvisioningHandler;
exports.setNotificationHandler = contextServer.setNotificationHandler;
exports.addUpdateMiddleware = addUpdateMiddleware;
exports.addQueryMiddleware = addQueryMiddleware;
exports.addDeviceProvisionMiddleware = contextServer.addDeviceProvisionMiddleware;
exports.addNotificationMiddleware = contextServer.addNotificationMiddleware;
exports.addConfigurationProvisionMiddleware = contextServer.addConfigurationProvisionMiddleware;
exports.resetMiddlewares = resetMiddlewares;
exports.statsRegistry = statsRegistry;
exports.clearRegistry = clearRegistry;
exports.subscribe = subscribe;
exports.unsubscribe = unsubscribe;
exports.getEffectiveApiKey = groupConfig.getEffectiveApiKey;
exports.intoTrans = intoTrans;

exports.commandQueue = commandQueue;
exports.addCommand = addCommand;
exports.updateCommand = updateCommand;
exports.removeCommand = removeCommand;

exports.ensureSouthboundDomain = domainUtils.ensureSouthboundDomain;
exports.finishSouthBoundTransaction = domainUtils.finishSouthBoundTransaction;
exports.requestDomain = domainUtils.requestDomain;

exports.middlewares = middlewares;

exports.commandLine = require('./command/commandLine');

exports.dataPlugins = {
    compressTimestamp: require('./plugins/compressTimestamp'),
    attributeAlias: require('./plugins/attributeAlias'),
    addEvents: require('./plugins/addEvent'),
    timestampProcess: require('./plugins/timestampProcessPlugin'),
    expressionTransformation: require('./plugins/expressionPlugin'),
    multiEntity: require('./plugins/multiEntity'),
    bidirectionalData: require('./plugins/bidirectionalData')
};

exports.dataPluginsNgsi2 = {
    attributeAlias: require('./pluginsNgsi2/attributeAlias'),
    expressionTransformation: require('./pluginsNgsi2/expressionPlugin'),
    bidirectionalData: require('./pluginsNgsi2/bidirectionalData'),
    compressTimestamp: require('./pluginsNgsi2/compressTimestamp'),
    addEvents: require('./pluginsNgsi2/addEvent'),
    timestampProcess: require('./pluginsNgsi2/timestampProcessPlugin')
};

exports.alarms = require('./services/common/alarmManagement');
exports.errors = errors;
exports.constants = constants;

exports.logModule = logger;
