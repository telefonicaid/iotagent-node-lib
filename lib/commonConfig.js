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

var config = {},
    logger = require('logops'),
    registry,
    groupRegistry,
    commandRegistry,
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
            'IOTA_CB_HOST',
             'IOTA_CB_PORT',
             'IOTA_NORTH_HOST',
             'IOTA_NORTH_PORT',
             'IOTA_PROVIDER_URL',
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
             'IOTA_MONGO_REPLICASET'
        ],
        iotamVariables = [
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
            'IOTA_MONGO_REPLICASET'
        ];

    for (var i = 0; i < environmentVariables.length; i++) {
        if (process.env[environmentVariables[i]]) {
            logger.info(context, 'Setting %s to environment value: %s',
                environmentVariables[i], process.env[environmentVariables[i]]);
        }
    }

    if (process.env.IOTA_CB_HOST) {
        config.contextBroker.host = process.env.IOTA_CB_HOST;
    }

    if (process.env.IOTA_CB_PORT) {
        config.contextBroker.port = process.env.IOTA_CB_PORT;
    }

    if (process.env.IOTA_NORTH_HOST) {
        config.server.host = process.env.IOTA_NORTH_HOST;
    }

    if (process.env.IOTA_NORTH_PORT) {
        config.server.port = process.env.IOTA_NORTH_PORT;
    }

    if (process.env.IOTA_PROVIDER_URL) {
        config.providerUrl = process.env.IOTA_PROVIDER_URL;
    }

    if (process.env.IOTA_REGISTRY_TYPE) {
        config.deviceRegistry = {};
        config.deviceRegistry.type = process.env.IOTA_REGISTRY_TYPE;
    }

    if (process.env.IOTA_LOG_LEVEL) {
        config.logLevel = process.env.IOTA_LOG_LEVEL;
        logger.setLevel(process.env.IOTA_LOG_LEVEL);
    }

    if (process.env.IOTA_TIMESTAMP) {
        config.timestamp = process.env.IOTA_TIMESTAMP === 'true';
    }

    if (process.env.IOTA_DEFAULT_RESOURCE) {
        config.defaultResource = process.env.IOTA_DEFAULT_RESOURCE;
    }

    if (anyIsSet(iotamVariables)) {
        config.iotManager = {};
    }

    if (process.env.IOTA_IOTAM_HOST) {
        config.iotManager.host = process.env.IOTA_IOTAM_HOST;
    }

    if (process.env.IOTA_IOTAM_PORT) {
        config.iotManager.port = process.env.IOTA_IOTAM_PORT;
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

    if (process.env.IOTA_SINGLE_MODE) {
        config.singleConfigurationMode = process.env.IOTA_SINGLE_MODE;
    }

    if (process.env.IOTA_APPEND_MODE) {
        config.appendMode = process.env.IOTA_APPEND_MODE;
    }

    if (process.env.IOTA_POLLING_EXPIRATION) {
        config.pollingExpiration = process.env.IOTA_POLLING_EXPIRATION;
    }

    if (process.env.IOTA_POLLING_DAEMON_FREQ) {
        config.pollingDaemonFrequency = process.env.IOTA_POLLING_DAEMON_FREQ;
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

exports.setConfig = setConfig;
exports.getConfig = getConfig;
exports.setRegistry = setRegistry;
exports.getRegistry = getRegistry;
exports.setGroupRegistry = setGroupRegistry;
exports.getGroupRegistry = getGroupRegistry;
exports.setCommandRegistry = setCommandRegistry;
exports.getCommandRegistry = getCommandRegistry;
