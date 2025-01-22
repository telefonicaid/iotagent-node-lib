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
 */

const async = require('async');
const apply = async.apply;
const statsRegistry = require('../stats/statsRegistry');
const deviceService = require('../devices/deviceService');
const intoTrans = require('../common/domain').intoTrans;
const fillService = require('./../common/domain').fillService;
const errors = require('../../errors');
const config = require('../../commonConfig');
const constants = require('../../constants');
const logger = require('logops');
const ngsiUtils = require('./ngsiUtils');
const _ = require('underscore');
const context = {
    op: 'IoTAgentNGSI.NGSIService'
};

const attributeList = ['trust', 'cbHost', 'ngsiVersion'];
let entityHandler;

/**
 * Loads the correct ngsiService handler based on the current config.
 */
function init() {
    switch (config.ngsiVersion()) {
        case 'ld':
            entityHandler = require('./entities-NGSI-LD');
            break;
        case 'mixed':
            entityHandler = require('./entities-NGSI-mixed');
            break;
        default:
            entityHandler = require('./entities-NGSI-v2');
    }
}

/**
 * Makes an update in the Device's entity in the context broker, with the values given in the 'attributes' array. This
 * array should comply to the NGSI's attribute format.
 *
 * @param {String} entityName       Name of the entity to register.
 * @param {Array} attributes        Attribute array containing the values to update.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
function sendUpdateValue(entityName, attributes, typeInformation, token, callback) {
    // check config about store last measure
    const newCallback = statsRegistry.withStats('updateEntityRequestsOk', 'updateEntityRequestsError', callback);
    if (typeInformation.storeLastMeasure) {
        logger.debug(context, 'StoreLastMeasure for %j', typeInformation);
        deviceService.storeLastMeasure(attributes, typeInformation, function () {
            return entityHandler.sendUpdateValue(entityName, attributes, typeInformation, token, newCallback);
        });
    } else {
        entityHandler.sendUpdateValue(entityName, attributes, typeInformation, token, newCallback);
    }
}

/**
 * Makes a query to the Device's entity in the context broker, with the list of attributes given by the 'attributes'
 * array.
 *
 * @param {String} entityName       Name of the entity to query.
 * @param {Array} attributes        Attribute array containing the names of the attributes to query.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
function sendQueryValue(entityName, attributes, typeInformation, token, callback) {
    entityHandler.sendQueryValue(entityName, attributes, typeInformation, token, callback);
}

/**
 * Update the trust for a device or a deviceGroup depending on the source of the trust token.
 * Currently is a placeholder, but it is needed in case of Auth services which tokens have
 * expiration.
 *
 * @param {Object} deviceGroup        The deviceGroup where the trust token was stored. Null if stored in actual device.
 * @param {Object} deviceInformation  The device where the trust token was stored. Null if stored in deviceGroup.
 * @param {String} trust              The current trust token.
 * @param {Object} response           The response where the new token is stored.
 * @param {Function} callback         The callback function.
 */

function updateTrust(deviceGroup, deviceInformation, trust, response, callback) {
    if (deviceGroup && response && response.body && !config.getConfig().authentication.permanentToken) {
        const body = JSON.parse(response.body);
        if (body && body.refresh_token) {
            deviceGroup.trust = body.refresh_token;
            /* eslint-disable-next-line no-unused-vars */
            config.getGroupRegistry().update(deviceGroup._id, deviceGroup, function (error, cb) {
                callback(null, response);
            });
        } else {
            callback(null, response);
        }
    } else {
        callback(null, response);
    }
}

/**
 * Launches an operation against the Context Broker, getting the security token in case the authorization sequence is
 * enabled. This method can be invoked with an externally added deviceInformation object to overwrite the information
 * on the configuration (for preregistered devices).
 *
 * @param {Function} operationFunction  Function to execute once the credentials and device information were retrieved.
 * @return {Function}                   The function that gets all the information wrapping the given operation.
 */
function executeWithDeviceInformation(operationFunction) {
    return function (entityName, type, apikey, attributes, deviceInformation, callback) {
        fillService(context, deviceInformation);
        logger.debug(
            context,
            'executeWithDeviceInfo entityName %s type %s apikey %s attributes %j deviceInformation %j',
            entityName,
            type,
            apikey,
            attributes,
            deviceInformation
        );
        const currentType = type ? type : deviceInformation.type;
        config.getGroupRegistry().getTypeSilently(currentType, function (error, deviceGroup) {
            let typeInformation;
            const configDeviceInfo = config.getConfig().types[currentType];
            if (error) {
                logger.debug(context, 'error %j in get group device', error);
            }

            // For anonymous devices use the typeInformation from the provisioned group and/or config directly.
            // For preregistered devices, augment the existing deviceInformation with selected attributes.
            if (!callback) {
                callback = deviceInformation;
                typeInformation = deviceGroup || { ...config.getConfigForTypeInformation(), ...configDeviceInfo };
            } else {
                typeInformation = { ...config.getConfigForTypeInformation(), ...deviceInformation };
                attributeList.forEach((key) => {
                    typeInformation[key] =
                        typeInformation[key] || (deviceGroup || {})[key] || (configDeviceInfo || {})[key];
                });
            }

            if (config.getConfig().authentication && config.getConfig().authentication.enabled) {
                const security = config.getSecurityService();
                if (typeInformation && typeInformation.trust) {
                    async.waterfall(
                        [
                            apply(security.auth, typeInformation.trust),
                            apply(updateTrust, deviceGroup, deviceInformation, typeInformation.trust),
                            apply(security.getToken, typeInformation.trust),
                            apply(operationFunction, entityName, attributes, typeInformation)
                        ],
                        callback
                    );
                } else {
                    callback(new errors.SecurityInformationMissing(typeInformation.type));
                }
            } else {
                operationFunction(entityName, attributes, typeInformation, null, callback);
            }
        });
    };
}

/**
 * Update the result of a command in the Context Broker. The result of the command has two components: the result
 * of the command itself will be represented with the sufix '_info' in the entity while the status is updated in the
 * attribute with the '_status' sufix.
 *
 * @param {String} entityName           Name of the entity holding the command.
 * @param {String} resource             Resource name of the endpoint the device is calling.
 * @param {String} apikey               Apikey the device is using to send the values.
 * @param {String} commandName          Name of the command whose result is being updated.
 * @param {String} commandResult        Result of the command in string format.
 * @param {Object} deviceInformation    Device information, including security and service information. (optional).
 */
function setCommandResult(
    entityName,
    resource,
    apikey,
    commandName,
    commandResult,
    status,
    deviceInformation,
    callback
) {
    config.getGroupRegistry().get(resource, apikey, function (error, deviceGroup) {
        let typeInformation;
        let commandInfo;
        const attributes = [
            {
                name: commandName + constants.COMMAND_STATUS_SUFIX,
                type: constants.COMMAND_STATUS,
                value: status
            },
            {
                name: commandName + constants.COMMAND_RESULT_SUFIX,
                type: constants.COMMAND_RESULT,
                value: commandResult
            }
        ];

        // For anonymous devices use the typeInformation from the provisioned group and/or config directly.
        // For preregistered devices, augment the existing deviceInformation with selected attributes.
        if (!callback) {
            callback = deviceInformation;
            typeInformation = deviceGroup || config.getConfig().types[resource];
        } else {
            typeInformation = deviceInformation;
        }

        // Ensure type, servce and subservice are always set, using fallbacks as necessary.
        typeInformation.type = typeInformation.type || (deviceGroup || {}).type || resource;
        typeInformation.service = typeInformation.service || config.getConfig().service;
        typeInformation.subservice = typeInformation.subservice || config.getConfig().subservice;

        commandInfo = _.where(typeInformation.commands, { name: commandName });

        if (deviceGroup && commandInfo.length !== 1) {
            commandInfo = _.where(deviceGroup.commands, { name: commandName });
        }

        if (commandInfo.length === 1) {
            exports.update(entityName, typeInformation.type, apikey, attributes, typeInformation, callback);
        } else {
            callback(new errors.CommandNotFound(commandName, typeInformation));
        }
    });
}

function addUpdateMiddleware(middleware) {
    ngsiUtils.updateMiddleware.push(middleware);
}

function addQueryMiddleware(middleware) {
    ngsiUtils.queryMiddleware.push(middleware);
}

function resetMiddlewares(callback) {
    ngsiUtils.updateMiddleware = [];
    ngsiUtils.queryMiddleware = [];

    callback();
}

exports.update = intoTrans(context, executeWithDeviceInformation)(sendUpdateValue);
exports.query = intoTrans(context, executeWithDeviceInformation)(sendQueryValue);
exports.addUpdateMiddleware = intoTrans(context, addUpdateMiddleware);
exports.addQueryMiddleware = intoTrans(context, addQueryMiddleware);
exports.resetMiddlewares = intoTrans(context, resetMiddlewares);
exports.setCommandResult = intoTrans(context, setCommandResult);
exports.updateTrust = updateTrust;
exports.init = init;
