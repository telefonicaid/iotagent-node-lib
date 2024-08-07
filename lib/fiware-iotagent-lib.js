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
 * please contact with::daniel.moranjimenez@telefonica.com
 */

const async = require('async');
const apply = async.apply;
const ngsi = require('./services/ngsi/ngsiService');
const intoTrans = require('./services/common/domain').intoTrans;
const middlewares = require('./services/common/genericMiddleware');
const db = require('./model/dbConn');
const subscriptions = require('./services/ngsi/subscriptionService');
const statsRegistry = require('./services/stats/statsRegistry');
const domainUtils = require('./services/common/domain');
const deviceService = require('./services/devices/deviceService');
const groupConfig = require('./services/groups/groupService');
const commands = require('./services/commands/commandService');
const iotManager = require('./services/common/iotManagerService');
const contextServer = require('./services/northBound/northboundServer');
const errors = require('./errors');
const constants = require('./constants');
const request = require('./request-shim');
const logger = require('logops');
const config = require('./commonConfig');
const cluster = require('cluster');
const context = {
    op: 'IoTAgentNGSI.Global'
};

/* eslint-disable-next-line  no-unused-vars */
function activateStatLogs(newConfig, callback) {
    async.series([
        apply(statsRegistry.globalLoad, {
            deviceCreationRequests: 0,
            deviceRemovalRequests: 0,
            measureRequests: 0,
            raiseAlarm: 0,
            releaseAlarm: 0,
            updateEntityRequestsOk: 0,
            updateEntityRequestsError: 0
        })
    ], callback);
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
 * device registry for the IoT Agent (based on the deviceRegistry.type configuration option). Note that this
 * function is called after startServer() so the logger getContext() function has been properly initialized.
 *
 * @param {Object} newConfig            Configuration of the Context Server
 * @param {Function} callback           The callback function.
 */
function doActivate(newConfig, callback) {
    let registry;
    let groupRegistry;
    let commandRegistry;
    let securityService;

    logger.format = logger.formatters.pipe;

    config.setConfig(newConfig); //moving up here because otherwise env variable are not considered by the code below

    if (!config.getConfig().dieOnUnexpectedError) {
        process.on('uncaughtException', globalErrorHandler);
    }

    newConfig = config.getConfig();

    if (newConfig.contextBroker) {
        if (!newConfig.contextBroker.url && newConfig.contextBroker.host && newConfig.contextBroker.port) {
            newConfig.contextBroker.url = 'http://' + newConfig.contextBroker.host + ':' + newConfig.contextBroker.port;
        } else if (!newConfig.contextBroker.url && newConfig.contextBroker.host && !newConfig.contextBroker.port) {
            newConfig.contextBroker.url = 'http://' + newConfig.contextBroker.host;
        }
    }

    if (newConfig.iotManager) {
        if (!newConfig.iotManager.url && newConfig.iotManager.host && newConfig.iotManager.port) {
            newConfig.iotManager.url = 'http://' + newConfig.iotManager.host + ':' + newConfig.iotManager.port;
        } else if (!newConfig.iotManager.url && newConfig.iotManager.host && !newConfig.iotManager.port) {
            newConfig.iotManager.url = 'http://' + newConfig.iotManager.host;
        }
    }

    if (newConfig.authentication && newConfig.authentication.enabled) {
        if (!newConfig.authentication.header) {
            newConfig.authentication.header = constants.AUTH_HEADER;
        }

        if (!newConfig.authentication.url && newConfig.authentication.host && newConfig.authentication.port) {
            newConfig.authentication.url =
                'http://' + newConfig.authentication.host + ':' + newConfig.authentication.port;
        } else if (!newConfig.authentication.url && newConfig.authentication.host && !newConfig.authentication.port) {
            newConfig.authentication.url = 'http://' + newConfig.authentication.host;
        }
    }

    config.setConfig(newConfig); //after chaging some configuration, we re apply the configuration

    logger.info(context, 'Activating IOT Agent NGSI Library.');

    if (newConfig.authentication && newConfig.authentication.enabled) {
        if (newConfig.authentication.type && newConfig.authentication.type === 'oauth2') {
            logger.info(context, 'Using OAuth2 as authentication service');

            securityService = require('./services/common/securityServiceOAuth2');
        } else {
            logger.info(context, 'Using Keystone as authentication service');

            securityService = require('./services/common/securityServiceKeystone');
        }
    }

    if (newConfig.deviceRegistry && newConfig.deviceRegistry.type && newConfig.deviceRegistry.type === 'mongodb') {
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

    exports.clearAll = function (callback) {
        async.series(
            [registry.clear, groupRegistry.clear, commandRegistry.clear, ngsi.resetMiddlewares, contextServer.clear],
            callback
        );
    };

    config.setSecurityService(securityService);
    config.setRegistry(registry);
    config.setGroupRegistry(groupRegistry);
    config.setCommandRegistry(commandRegistry);
    deviceService.init();
    subscriptions.init();
    contextServer.init();
    ngsi.init();

    commands.start();

    async.series([db.configureDb, apply(contextServer.start, newConfig), apply(activateStatLogs, newConfig)], callback);
}

function checkConfig(newConfig, callback) {
    const mandatory = ['providerUrl', 'types'];
    const missing = [];

    for (const i in mandatory) {
        if (!newConfig[mandatory[i]]) {
            missing.push(mandatory[i]);
        }
    }

    if (newConfig.authentication && newConfig.authentication.enabled) {
        if (newConfig.authentication.type && newConfig.authentication.type === 'oauth2') {
            const mandatoryOauth = ['tokenPath', 'clientId', 'clientSecret'];
            for (const j in mandatoryOauth) {
                if (!newConfig.authentication[mandatoryOauth[j]]) {
                    missing.push('authentication.' + mandatoryOauth[j]);
                }
            }
        } else {
            const mandatoryKeystone = ['user', 'password'];
            for (const k in mandatoryKeystone) {
                if (!newConfig.authentication[mandatoryKeystone[k]]) {
                    missing.push('authentication.' + mandatoryKeystone[k]);
                }
            }
        }
    }

    if (missing.length === 0) {
        callback();
    } else {
        callback(new errors.MissingConfigParams(missing));
    }
}

function activate(newConfig, callback) {
    async.series([apply(checkConfig, newConfig), apply(doActivate, newConfig), iotManager.register], callback);
}

/**
 * Stops the HTTP server.
 *
 * @param {Function} callback           The callback function.
 */
function deactivate(callback) {
    process.removeListener('uncaughtException', globalErrorHandler);
    commands.stop();
    contextServer.stop(callback);
}

/**
 * Start the HTTP server either in single-thread or multi-thread (multi-core).
 *
 * @param {Object} newConfig            Configuration of the IoT Agent.
 * @param {Object} iotAgent             The IoT Agent Objects.
 * @param {Function} callback           The callback function.
 */
function startServer(newConfig, iotAgent, callback) {
    config.setConfig(newConfig);

    // fix the proper logger format
    logger.format = logger.formatters.pipe;

    // get the proper context of the logger
    logger.getContext = function domainContext() {
        const domainObj = require('domain').active || {};

        return {
            corr: domainObj.corr,
            trans: domainObj.trans,
            op: domainObj.op,
            from: domainObj.from,
            srv: domainObj.service,
            subsrv: domainObj.subservice,
            msg: domainObj.msg,
            comp: config.componentName || 'IoTAgent'
        };
    };

    // If if was configured multi-core and the value is true
    if (config.getConfig().multiCore === true) {
        if (cluster.isMaster) {
            // Code to run if we're in a master node process
            // Count the machine's CPUs
            const cpuCount = require('os').cpus().length;
            logger.info(context, 'Master cluster setting up ' + cpuCount + ' workers...');

            // Create a worker for each CPU in the machine
            for (let i = 0; i < cpuCount; i += 1) {
                cluster.fork();
            }

            // Log information about the creation of the workers
            cluster.on('online', function (worker) {
                logger.info(context, 'Worker ' + worker.process.pid + ' is online');
            });

            // If a worker died, automatically we create a new worker to replace it
            cluster.on('exit', function (worker, code, signal) {
                const message = 'Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal;
                logger.warn(context, message);
                logger.warn(context, 'Starting a new worker...');
                cluster.fork();
            });
        } else {
            // We are in the worker, and they can share any TCP connection
            logger.info(context, 'Starting a new worker...');
            iotAgent.start(newConfig, callback);
        }
    } else {
        // The process is executed in a single thread
        logger.info(context, 'Starting an IoT Agent...');
        iotAgent.start(newConfig, callback);
    }
}

exports.activate = intoTrans(context, activate);
exports.deactivate = intoTrans(context, deactivate);
exports.register = deviceService.register;
exports.updateRegister = deviceService.updateRegister;
exports.unregister = deviceService.unregister;
exports.query = ngsi.query;
exports.update = ngsi.update;
exports.setCommandResult = ngsi.setCommandResult;
exports.listDevices = deviceService.listDevices;
exports.getDevice = deviceService.getDevice;
exports.updateDevice = deviceService.updateDevice;
exports.getDeviceSilently = deviceService.getDeviceSilently;
exports.getDeviceByName = deviceService.getDeviceByName;
exports.getDeviceByNameAndType = deviceService.getDeviceByNameAndType;
exports.getDevicesByAttribute = deviceService.getDevicesByAttribute;
exports.mergeDeviceWithConfiguration = deviceService.mergeDeviceWithConfiguration;
exports.findOrCreate = deviceService.findOrCreate;
exports.retrieveDevice = deviceService.retrieveDevice;
exports.getConfiguration = groupConfig.get;
exports.getConfigurationSilently = groupConfig.getSilently;
exports.findConfiguration = groupConfig.find;
exports.setDataUpdateHandler = contextServer.setUpdateHandler;
exports.setCommandHandler = contextServer.setCommandHandler;
exports.setMergePatchHandler = contextServer.setMergePatchHandler;
exports.setDataQueryHandler = contextServer.setQueryHandler;
exports.setConfigurationHandler = contextServer.setConfigurationHandler;
exports.setRemoveConfigurationHandler = contextServer.setRemoveConfigurationHandler;
exports.setProvisioningHandler = contextServer.setProvisioningHandler;
exports.setUpdatingHandler = contextServer.setUpdatingHandler;
exports.setRemoveDeviceHandler = contextServer.setRemoveDeviceHandler;
exports.setNotificationHandler = contextServer.setNotificationHandler;
exports.addUpdateMiddleware = ngsi.addUpdateMiddleware;
exports.addQueryMiddleware = ngsi.addQueryMiddleware;
exports.addDeviceProvisionMiddleware = contextServer.addDeviceProvisionMiddleware;
exports.addNotificationMiddleware = contextServer.addNotificationMiddleware;
exports.addConfigurationProvisionMiddleware = contextServer.addConfigurationProvisionMiddleware;
exports.resetMiddlewares = ngsi.resetMiddlewares;
exports.statsRegistry = statsRegistry;
exports.clearRegistry = deviceService.clearRegistry;
exports.subscribe = subscriptions.subscribe;
exports.unsubscribe = subscriptions.unsubscribe;
exports.getEffectiveApiKey = groupConfig.getEffectiveApiKey;
exports.intoTrans = intoTrans;

exports.commandQueue = commands.list;
exports.addCommand = commands.add;
exports.updateCommand = commands.update;
exports.removeCommand = commands.remove;

exports.ensureSouthboundDomain = domainUtils.ensureSouthboundDomain;
exports.finishSouthBoundTransaction = domainUtils.finishSouthBoundTransaction;
exports.requestDomain = domainUtils.requestDomain;
exports.regenerateTransid = domainUtils.regenerateTransid;
exports.fillService = domainUtils.fillService;

exports.middlewares = middlewares;

exports.dataPlugins = {
    expressionTransformation: require('./plugins/expressionPlugin'),
    utils: require('./plugins/pluginUtils')
};

exports.alarms = require('./services/common/alarmManagement');
exports.errors = errors;
exports.constants = constants;

exports.logModule = logger;
exports.configModule = config;
exports.startServer = startServer;
exports.request = request;
