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

let config = {};
const logger = require('logops');
let registry;
let groupRegistry;
let commandRegistry;
let securityService;

const fs = require('fs');
const path = require('path');
const SECRETS_DIR = process.env.SECRETS_DIR || '/run/secrets';
const secrets = {};

if (fs.existsSync(SECRETS_DIR)) {
    const files = fs.readdirSync(SECRETS_DIR);
    files.forEach(function (file) {
        const fullPath = path.join(SECRETS_DIR, file);
        const key = file;
        try {
            const data = fs.readFileSync(fullPath, 'utf8').toString().trim();
            secrets[key] = data;
        } catch (e) {
            logger.error(e.message);
        }
    });
}

function anyIsSet(variableSet) {
    for (let i = 0; i < variableSet.length; i++) {
        if (process.env[variableSet[i]]) {
            return true;
        }
    }

    return false;
}

/**
 * If an ENV is a protected Docker Secret extract the value of the secret data
 */
function getSecretData(key) {
    const filepath = process.env[key + '_FILE'];
    if (filepath) {
        process.env[key] = secrets[path.parse(filepath).base] || process.env[key];
    }
}

/*
 *  Inform the user if security is correctly enabled.
 */
function logAuthState() {
    const stars = '***********************************************';
    if (config.authentication === undefined) {
        logger.warn(
            stars +
                '\n' +
                'WARNING: authentication for secure connections is not in use,\n' +
                'It is recommended to enable authentication\n' +
                stars
        );
    } else {
        const authKeystone = !!config.authentication.user && !!config.authentication.password;
        const authKeyrock = !!config.authentication.clientSecret && !!config.authentication.clientId;

        if (authKeystone) {
            logger.info('INFO: IoT Agent=>Keystone Auth credentials have been configured');
        } else if (authKeyrock) {
            logger.info('INFO: IoT Agent=>Keyrock Auth credentials have been configured');
        } else {
            logger.warn(
                stars +
                    '\n' +
                    'WARNING: authentication for secure connections is in use,\n' +
                    ' but default Auth credentials have not been overridden\n' +
                    stars
            );
        }
    }
}

/**
 * Looks for environment variables that could override configuration values.
 */
function processEnvironmentVariables() {
    const environmentVariables = [
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
        'IOTA_EXPLICIT_ATTRS',
        'IOTA_MONGO_HOST',
        'IOTA_MONGO_PORT',
        'IOTA_MONGO_DB',
        'IOTA_MONGO_REPLICASET',
        'IOTA_AUTOCAST',
        'IOTA_MONGO_PASSWORD',
        'IOTA_MONGO_AUTH_SOURCE',
        'IOTA_MONGO_RETRIES',
        'IOTA_MONGO_USER',
        'IOTA_MONGO_RETRY_TIME',
        'IOTA_SINGLE_MODE',
        'IOTA_APPEND_MODE',
        'IOTA_POLLING_EXPIRATION',
        'IOTA_POLLING_DAEMON_FREQ',
        'IOTA_MULTI_CORE',
        'IOTA_DEFAULT_EXPRESSION_LANGUAGE',
        'IOTA_RELAX_TEMPLATE_VALIDATION',
        'IOTA_DEFAULT_ENTITY_NAME_CONJUNCTION',
        'IOTA_JSON_LD_CONTEXT',
        'IOTA_FALLBACK_TENANT',
        'IOTA_FALLBACK_PATH'
    ];
    const iotamVariables = [
        'IOTA_IOTAM_URL',
        'IOTA_IOTAM_HOST',
        'IOTA_IOTAM_PORT',
        'IOTA_IOTAM_PATH',
        'IOTA_IOTAM_PROTOCOL',
        'IOTA_IOTAM_DESCRIPTION',
        'IOTA_IOTAM_AGENTPATH'
    ];
    const mongoVariables = [
        'IOTA_MONGO_HOST',
        'IOTA_MONGO_PORT',
        'IOTA_MONGO_DB',
        'IOTA_MONGO_REPLICASET',
        'IOTA_MONGO_USER',
        'IOTA_MONGO_PASSWORD',
        'IOTA_MONGO_AUTH_SOURCE',
        'IOTA_MONGO_RETRIES',
        'IOTA_MONGO_RETRY_TIME',
        'IOTA_MONGO_SSL',
        'IOTA_MONGO_EXTRAARGS'
    ];
    const protectedVariables = [
        'IOTA_AUTH_USER',
        'IOTA_AUTH_PASSWORD',
        'IOTA_AUTH_CLIENT_ID',
        'IOTA_AUTH_CLIENT_SECRET',
        'IOTA_MONGO_USER',
        'IOTA_MONGO_PASSWORD'
    ];

    // Substitute Docker Secret Variables where set.
    protectedVariables.forEach((key) => {
        getSecretData(key);
    });
    environmentVariables.forEach((key) => {
        let value = process.env[key];
        if (value) {
            if (
                key.endsWith('USER') ||
                key.endsWith('PASSWORD') ||
                key.endsWith('CLIENT_ID') ||
                key.endsWith('CLIENT_SECRET')
            ) {
                value = '********';
            }
            logger.info('Setting %s to environment value: %s', key, value);
        }
    });

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

    if (process.env.IOTA_JSON_LD_CONTEXT) {
        config.contextBroker.jsonLdContext = process.env.IOTA_JSON_LD_CONTEXT.split(',').map((ctx) => ctx.trim());
    }

    config.contextBroker.fallbackTenant =
        process.env.IOTA_FALLBACK_TENANT || config.contextBroker.service || 'iotagent';
    config.contextBroker.fallbackPath = process.env.IOTA_FALLBACK_PATH || config.contextBroker.subservice || '/';

    // North Port Configuration (ensuring the configuration sub-object exists before start using it)
    if (config.server === undefined) {
        config.server = {};
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
    config.deviceRegistry = config.deviceRegistry || {};
    if (process.env.IOTA_REGISTRY_TYPE) {
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

    // Default explicitAttrs
    if (process.env.IOTA_EXPLICIT_ATTRS !== undefined) {
        config.explicitAttrs = process.env.IOTA_EXPLICIT_ATTRS;
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

    if (process.env.IOTA_MONGO_USER) {
        config.mongodb.user = process.env.IOTA_MONGO_USER;
    }

    if (process.env.IOTA_MONGO_PASSWORD) {
        config.mongodb.password = process.env.IOTA_MONGO_PASSWORD;
    }

    if (process.env.IOTA_MONGO_AUTH_SOURCE) {
        config.mongodb.authSource = process.env.IOTA_MONGO_AUTH_SOURCE;
    }

    if (process.env.IOTA_MONGO_RETRIES) {
        config.mongodb.retries = process.env.IOTA_MONGO_RETRIES;
    }

    if (process.env.IOTA_MONGO_RETRY_TIME) {
        config.mongodb.retryTime = process.env.IOTA_MONGO_RETRY_TIME;
    }

    if (process.env.IOTA_MONGO_SSL) {
        config.mongodb.ssl = process.env.IOTA_MONGO_SSL.toLowerCase() === 'true';
    }

    if (process.env.IOTA_MONGO_EXTRAARGS) {
        try {
            const ea = JSON.parse(process.env.IOTA_MONGO_EXTRAARGS);
            if (ea !== null && typeof ea === 'object' && ea.constructor === Object) {
                config.mongodb.extraArgs = ea;
            }
        } catch (e) {
            // Do nothing
        }
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

    if (process.env.IOTA_DEFAULT_EXPRESSION_LANGUAGE) {
        config.defaultExpressionLanguage = process.env.IOTA_DEFAULT_EXPRESSION_LANGUAGE;
    }
    if (process.env.IOTA_RELAX_TEMPLATE_VALIDATION) {
        config.relaxTemplateValidation = process.env.IOTA_RELAX_TEMPLATE_VALIDATION === 'true';
    } else {
        config.relaxTemplateValidation = config.relaxTemplateValidation === true;
    }
    if (process.env.IOTA_DEFAULT_ENTITY_NAME_CONJUNCTION) {
        config.defaultEntityNameConjunction = process.env.IOTA_DEFAULT_ENTITY_NAME_CONJUNCTION;
    } else {
        config.defaultEntityNameConjunction = config.defaultEntityNameConjunction ? config.defaultEntityNameConjunction : ':';
    }
}

function setConfig(newConfig) {
    config = newConfig;

    if (config.logLevel) {
        logger.setLevel(config.logLevel);
    }

    processEnvironmentVariables();
    logAuthState();
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
 * Returns the supported NGSI format
 *
 * @return     {string}  the supported NGSI format
 */
function ngsiVersion() {
    if (config && config.contextBroker && config.contextBroker.ngsiVersion) {
        return config.contextBroker.ngsiVersion.toLowerCase();
    }
    return 'unknown';
}

/**
 * It checks if the configuration file states a non-legacy format,
 * either v2, LD or mixed.
 *
 * @return     {boolean}  Result of the checking
 */
function isCurrentNgsi() {
    if (config.contextBroker && config.contextBroker.ngsiVersion) {
        const version = config.contextBroker.ngsiVersion.toLowerCase();
        return version === 'v2' || version === 'ld' || version === 'mixed';
    }
    return false;
}
/**
 * It checks if a combination of typeInformation or common Config is LD
 *
 * @return     {boolean}  Result of the checking
 */
function checkNgsiLD(typeInformation) {
    const format = typeInformation.ngsiVersion || ngsiVersion();
    return format.toLowerCase() === 'ld';
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
exports.ngsiVersion = ngsiVersion;
exports.checkNgsiLD = checkNgsiLD;
exports.isCurrentNgsi = isCurrentNgsi;
exports.setSecurityService = setSecurityService;
exports.getSecurityService = getSecurityService;
exports.getSecretData = getSecretData;
