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
 *
 * Modified by: Federico M. Facca - Martel Innovate
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 * Modified by: Fernando López - FIWARE Foundation
 */

'use strict';

var config = {},
    logger = require('logops'),
    registry,
    groupRegistry,
    commandRegistry,
    securityService,
    context = {
        op: 'IoTAgentNGSI.CommonConfig'
    };

function anyIsSet(variableSet) {
    for (var i = 0; i < variableSet.length; i++) {
        if (process.env[variableSet[i]]) {
            return true;
        }
    }

    return false;
}

/**
 * Looks for environment variables that could override configuration values.
 */
function processEnvironmentVariables() {
    var environmentVariables = [
             'IOTA_CB_URL',
             'IOTA_CB_HOST',
             'IOTA_CB_PORT',
             'IOTA_CB_NGSI_VERSION',
             'IOTA_NORTH_HOST',
             'IOTA_NORTH_PORT',
             'IOTA_PROVIDER_URL',
             'IOTA_AUTH_ENABLED',
             'IOTA_AUTH_TYPE',
             'IOTA_AUTH_HEADER',
             'IOTA_AUTH_URL',
             'IOTA_AUTH_HOST',
             'IOTA_AUTH_PORT',
             'IOTA_AUTH_USER',
             'IOTA_AUTH_PASSWORD',
             'IOTA_AUTH_CLIENT_ID',
             'IOTA_AUTH_CLIENT_SECRET',
             'IOTA_AUTH_TOKEN_PATH',
             'IOTA_AUTH_PERMANENT_TOKEN',
             'IOTA_REGISTRY_TYPE',
             'IOTA_LOG_LEVEL',
             'IOTA_TIMESTAMP',
             'IOTA_IOTAM_HOST',
             'IOTA_IOTAM_PORT',
             'IOTA_IOTAM_PATH',
             'IOTA_IOTAM_PROTOCOL',
             'IOTA_IOTAM_DESCRIPTION',
             'IOTA_DEFAULT_RESOURCE',
             'IOTA_MONGO_HOST',
             'IOTA_MONGO_PORT',
             'IOTA_MONGO_DB',
             'IOTA_MONGO_REPLICASET',
             'IOTA_AUTOCAST',
             'IOTA_MONGO_RETRIES',
             'IOTA_MONGO_RETRY_TIME',
             'IOTA_SINGLE_MODE',
             'IOTA_APPEND_MODE',
             'IOTA_POLLING_EXPIRATION',
             'IOTA_POLLING_DAEMON_FREQ',
             'IOTA_MULTI_CORE'
        ],
        iotamVariables = [
            'IOTA_IOTAM_URL',
            'IOTA_IOTAM_HOST',
            'IOTA_IOTAM_PORT',
            'IOTA_IOTAM_PATH',
            'IOTA_IOTAM_PROTOCOL',
            'IOTA_IOTAM_DESCRIPTION',
            'IOTA_IOTAM_AGENTPATH'
        ],
        mongoVariables = [
            'IOTA_MONGO_HOST',
            'IOTA_MONGO_PORT',
            'IOTA_MONGO_DB',
            'IOTA_MONGO_REPLICASET',
            'IOTA_MONGO_RETRIES',
            'IOTA_MONGO_RETRY_TIME'
        ];

    for (var i = 0; i < environmentVariables.length; i++) {
        if (process.env[environmentVariables[i]]) {
            logger.info(context, 'Setting %s to environment value: %s',
                environmentVariables[i], process.env[environmentVariables[i]]);
        }
    }

    // Context Broker Configuration (ensuring the configuration sub-object exists before start using it)
    if (config.contextBroker === undefined) {
        config.contextBroker = {};
    }
    
    if (process.env.IOTA_CB_URL) {
        config.contextBroker.url = process.env.IOTA_CB_URL;
        // Not sure if config.contextBroker.host and config.contextBroker.port are used
        // in this case, but better to have them initialized
        if (process.env.IOTA_CB_HOST) {
            config.contextBroker.host = process.env.IOTA_CB_HOST;
        }
        if (process.env.IOTA_CB_PORT) {
            config.contextBroker.port = process.env.IOTA_CB_PORT;
        }
    } else if (process.env.IOTA_CB_HOST) {
        config.contextBroker.host = process.env.IOTA_CB_HOST;
        config.contextBroker.url = 'http://' + process.env.IOTA_CB_HOST;
        if (process.env.IOTA_CB_PORT) {
            config.contextBroker.url += ':' + process.env.IOTA_CB_PORT;
        } else {
            config.contextBroker.url += ':' + config.contextBroker.port;
        }
    }
    
    if (process.env.IOTA_CB_NGSI_VERSION) {
        config.contextBroker.ngsiVersion = process.env.IOTA_CB_NGSI_VERSION;
    }

    // North Port Configuration
    if (process.env.IOTA_NORTH_HOST) {
        config.server.host = process.env.IOTA_NORTH_HOST;
    }
    if (process.env.IOTA_NORTH_PORT) {
        config.server.port = process.env.IOTA_NORTH_PORT;
    }

    if (process.env.IOTA_PROVIDER_URL) {
        config.providerUrl = process.env.IOTA_PROVIDER_URL;
    }

    // Authentication Parameters - General
    if (process.env.IOTA_AUTH_ENABLED) {
        config.authentication = {};
        config.authentication.enabled = process.env.IOTA_AUTH_ENABLED === 'true';
    }
    if (process.env.IOTA_AUTH_TYPE) {
        config.authentication.type = process.env.IOTA_AUTH_TYPE;
    }
    if (process.env.IOTA_AUTH_HEADER) {
        config.authentication.header = process.env.IOTA_AUTH_HEADER;
    }
    if (process.env.IOTA_AUTH_URL) {
        config.authentication.url = process.env.IOTA_AUTH_URL;
    } else if (process.env.IOTA_AUTH_HOST) {
        config.authentication.host = process.env.IOTA_AUTH_HOST;
        config.authentication.url = 'http://' + process.env.IOTA_AUTH_HOST;
        if (process.env.IOTA_AUTH_PORT) {
            config.authentication.url += ':' + process.env.IOTA_AUTH_PORT;
        } else {
            config.authentication.url += ':' + config.authentication.port;
        }
    }
    if (process.env.IOTA_AUTH_HOST) {
        config.authentication.host = process.env.IOTA_AUTH_HOST;
    }
    if (process.env.IOTA_AUTH_PORT) {
        config.authentication.port = process.env.IOTA_AUTH_PORT;
    }
    // Authentication Parameters - Oauth + Keyrock
    if (process.env.IOTA_AUTH_CLIENT_ID) {
        config.authentication.clientId = process.env.IOTA_AUTH_CLIENT_ID;
    }
    if (process.env.IOTA_AUTH_CLIENT_SECRET) {
        config.authentication.clientSecret = process.env.IOTA_AUTH_CLIENT_SECRET;
    }
    if (process.env.IOTA_AUTH_TOKEN_PATH) {
        config.authentication.tokenPath = process.env.IOTA_AUTH_TOKEN_PATH;
    }
    // Authentication Parameters - Keyrock only
    if (process.env.IOTA_AUTH_PERMANENT_TOKEN) {
        config.authentication.permanentToken = process.env.IOTA_AUTH_PERMANENT_TOKEN;
    }
    // Authentication Parameters - Keystone only
    if (process.env.IOTA_AUTH_USER) {
        config.authentication.user = process.env.IOTA_AUTH_USER;
    }
    if (process.env.IOTA_AUTH_PASSWORD) {
        config.authentication.password = process.env.IOTA_AUTH_PASSWORD;
    }

    // Registry configuration (memory or database)
    if (process.env.IOTA_REGISTRY_TYPE) {
        config.deviceRegistry = {};
        config.deviceRegistry.type = process.env.IOTA_REGISTRY_TYPE;
    }

    // Log Level configuration
    if (process.env.IOTA_LOG_LEVEL) {
        config.logLevel = process.env.IOTA_LOG_LEVEL;
        logger.setLevel(process.env.IOTA_LOG_LEVEL);
    }

    // Whether to include timestamps
    if (process.env.IOTA_TIMESTAMP) {
        config.timestamp = process.env.IOTA_TIMESTAMP === 'true';
    }

    // Default resource
    if (process.env.IOTA_DEFAULT_RESOURCE !== undefined) {
        config.defaultResource = process.env.IOTA_DEFAULT_RESOURCE;
    }

    // IoT Manager Configuration
    if (anyIsSet(iotamVariables)) {
        config.iotManager = {};
    }

    if (process.env.IOTA_IOTAM_URL) {
        config.iotManager.url = process.env.IOTA_IOTAM_URL;
    } else if (process.env.IOTA_IOTAM_HOST) {
        config.iotManager.url = 'http://' + process.env.IOTA_IOTAM_HOST;
        if (process.env.IOTA_IOTAM_PORT) {
            config.iotManager.url += ':' + process.env.IOTA_IOTAM_PORT;
        } else {
            config.iotManager.url += ':' + config.iotManager.port;
        }
    }

    if (process.env.IOTA_IOTAM_PATH) {
        config.iotManager.path = process.env.IOTA_IOTAM_PATH;
    }

    if (process.env.IOTA_IOTAM_PROTOCOL) {
        config.iotManager.protocol = process.env.IOTA_IOTAM_PROTOCOL;
    }

    if (process.env.IOTA_IOTAM_DESCRIPTION) {
        config.iotManager.description = process.env.IOTA_IOTAM_DESCRIPTION;
    }

    if (process.env.IOTA_IOTAM_AGENTPATH) {
        config.iotManager.agentPath = process.env.IOTA_IOTAM_AGENTPATH;
    }

    // Mongo DB configuration
    if (anyIsSet(mongoVariables)) {
        config.mongodb = {};
    }

    if (process.env.IOTA_MONGO_HOST) {
        config.mongodb.host = process.env.IOTA_MONGO_HOST;
    }

    if (process.env.IOTA_MONGO_PORT) {
        config.mongodb.port = process.env.IOTA_MONGO_PORT;
    }

    if (process.env.IOTA_MONGO_DB) {
        config.mongodb.db = process.env.IOTA_MONGO_DB;
    }

    if (process.env.IOTA_MONGO_REPLICASET) {
        config.mongodb.replicaSet = process.env.IOTA_MONGO_REPLICASET;
    }

    if (process.env.IOTA_MONGO_RETRIES) {
        config.mongodb.retries = process.env.IOTA_MONGO_RETRIES;
    }

    if (process.env.IOTA_MONGO_RETRY_TIME) {
        config.mongodb.retryTime = process.env.IOTA_MONGO_RETRY_TIME;
    }

    // Other configuration properties
    if (process.env.IOTA_SINGLE_MODE) {
        config.singleConfigurationMode = process.env.IOTA_SINGLE_MODE === 'true';
    }

    if (process.env.IOTA_APPEND_MODE) {
        config.appendMode = process.env.IOTA_APPEND_MODE === 'true';
    }

    if (process.env.IOTA_POLLING_EXPIRATION) {
        config.pollingExpiration = process.env.IOTA_POLLING_EXPIRATION;
    }

    if (process.env.IOTA_POLLING_DAEMON_FREQ) {
        config.pollingDaemonFrequency = process.env.IOTA_POLLING_DAEMON_FREQ;
    }

    if (process.env.IOTA_AUTOCAST) {
        config.autocast = process.env.IOTA_AUTOCAST === 'true';
    }

    if (process.env.IOTA_MULTI_CORE) {
        config.multiCore = process.env.IOTA_MULTI_CORE === 'true';
    } else {
        config.multiCore = config.multiCore === true;
    }
}

function setConfig(newConfig) {
    config = newConfig;

    if (config.logLevel) {
        logger.setLevel(config.logLevel);
    }

    processEnvironmentVariables();
}

function getConfig() {
    return config;
}

function setRegistry(newRegistry) {
    registry = newRegistry;
}

function getRegistry() {
    return registry;
}

function setGroupRegistry(newGroupRegistry) {
    groupRegistry = newGroupRegistry;
}

function getGroupRegistry() {
    return groupRegistry;
}

function setCommandRegistry(newCommandRegistry) {
    commandRegistry = newCommandRegistry;
}

function getCommandRegistry() {
    return commandRegistry;
}

/**
 * It checks if the configuration file states the use of NGSIv2
 *
 * @return     {boolean}  Result of the checking
 */
function checkNgsi2() {
    if (config.contextBroker &&
        config.contextBroker.ngsiVersion &&
        config.contextBroker.ngsiVersion === 'v2') {
        return true;
    }

    return false;
}

function setSecurityService(newSecurityService) {
    securityService = newSecurityService;
}

function getSecurityService() {
    return securityService;
}

exports.setConfig = setConfig;
exports.getConfig = getConfig;
exports.setRegistry = setRegistry;
exports.getRegistry = getRegistry;
exports.setGroupRegistry = setGroupRegistry;
exports.getGroupRegistry = getGroupRegistry;
exports.setCommandRegistry = setCommandRegistry;
exports.getCommandRegistry = getCommandRegistry;
exports.checkNgsi2 = checkNgsi2;
exports.setSecurityService = setSecurityService;
exports.getSecurityService = getSecurityService;
