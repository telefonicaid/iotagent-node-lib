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
    groupRegistry;

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
            'CB_HOST',
             'CB_PORT',
             'NORTH_HOST',
             'NORTH_PORT',
             'PROVIDER_URL',
             'REGISTRY_TYPE',
             'LOG_LEVEL',
             'TIMESTAMP',
             'IOTAM_HOST',
             'IOTAM_PORT',
             'IOTAM_PATH',
             'IOTAM_PROTOCOL',
             'IOTAM_DESCRIPTION',
             'MONGO_HOST',
             'MONGO_PORT',
             'MONGO_DB'
        ],
        iotamVariables = [
            'IOTAM_HOST',
            'IOTAM_PORT',
            'IOTAM_PATH',
            'IOTAM_PROTOCOL',
            'IOTAM_DESCRIPTION'
        ],
        mongoVariables = [
            'MONGO_HOST',
            'MONGO_PORT',
            'MONGO_DB'
        ];

    for (var i = 0; i < environmentVariables.length; i++) {
        if (process.env[environmentVariables[i]]) {
            logger.info('Setting %s to environment value: %s',
                environmentVariables[i], process.env[environmentVariables[i]]);
        }
    }

    if (process.env.CB_HOST) {
        config.contextBroker.host = process.env.CB_HOST;
    }

    if (process.env.CB_PORT) {
        config.contextBroker.port = process.env.CB_PORT;
    }

    if (process.env.NORTH_HOST) {
        config.server.host = process.env.NORTH_HOST;
    }

    if (process.env.NORTH_PORT) {
        config.server.port = process.env.NORTH_PORT;
    }

    if (process.env.PROVIDER_URL) {
        config.providerUrl = process.env.PROVIDER_URL;
    }

    if (process.env.REGISTRY_TYPE) {
        config.deviceRegistry = {};
        config.deviceRegistry.type = process.env.REGISTRY_TYPE;
    }

    if (process.env.LOG_LEVEL) {
        config.logLevel = process.env.LOG_LEVEL;
    }

    if (process.env.TIMESTAMP) {
        config.timestamp = process.env.TIMESTAMP === 'true';
    }

    if (anyIsSet(iotamVariables)) {
        config.iotManager = {};
    }

    if (process.env.IOTAM_HOST) {
        config.iotManager.host = process.env.IOTAM_HOST;
    }

    if (process.env.IOTAM_PORT) {
        config.iotManager.port = process.env.IOTAM_PORT;
    }

    if (process.env.IOTAM_PATH) {
        config.iotManager.path = process.env.IOTAM_PATH;
    }

    if (process.env.IOTAM_PROTOCOL) {
        config.iotManager.protocol = process.env.IOTAM_PROTOCOL;
    }

    if (process.env.IOTAM_DESCRIPTION) {
        config.iotManager.description = process.env.IOTAM_DESCRIPTION;
    }

    if (anyIsSet(mongoVariables)) {
        config.mongodb = {};
    }

    if (process.env.MONGO_HOST) {
        config.mongodb.host = process.env.MONGO_HOST;
    }

    if (process.env.MONGO_PORT) {
        config.mongodb.port = process.env.MONGO_PORT;
    }

    if (process.env.MONGO_DB) {
        config.mongodb.db = process.env.MONGO_DB;
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

exports.setConfig = setConfig;
exports.getConfig = getConfig;
exports.setRegistry = setRegistry;
exports.getRegistry = getRegistry;
exports.setGroupRegistry = setGroupRegistry;
exports.getGroupRegistry = getGroupRegistry;
