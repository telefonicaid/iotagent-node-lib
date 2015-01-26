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

var request = require('request'),
    async = require('async'),
    apply = async.apply,
    errors = require('../errors'),
    logger = require('fiware-node-logger'),
    security = require('./securityService'),
    _ = require('underscore'),
    context = {
        op: 'IoTAgentNGSI.NGSIService'
    },
    registry,
    config;

/**
 * Sends a Context Provider registration or unregistration request to the Context Broker. As registrations cannot be
 * removed, an unregistration consists of an update of the existent registration to make reduce its duration to
 * 1 second.
 *
 * The entity type, entity name and lazy attributes list are needed in order to send the registration:
 *
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 */
function sendRegistrations(deviceData, callback) {
    var options = {
        url: 'http://' + config.contextBroker.host + ':' + config.contextBroker.port + '/NGSI9/registerContext',
        method: 'POST',
        json: {
            contextRegistrations: [
                {
                    entities: [
                        {
                            type: deviceData.type,
                            isPattern: 'false',
                            id: String(deviceData.name)
                        }
                    ],
                    attributes: [],
                    providingApplication: config.providerUrl
                }
            ],
            duration: (deviceData.registrationId) ? 'PT1S' : config.deviceRegistrationDuration
        },
        headers: {
            'fiware-service': deviceData.service,
            'fiware-servicepath': deviceData.subservice
        }
    };

    if (deviceData.registrationId) {
        options.json.registrationId = deviceData.registrationId;
    }

    for (var i = 0; i < deviceData.lazy.length; i++) {
        options.json.contextRegistrations[0].attributes.push({
            name: deviceData.lazy[i].name,
            type: deviceData.lazy[i].type,
            isDomain: 'false'
        });
    }

    logger.debug(context, 'Sending device registrations to Context Broker at [%s]', options.url);
    logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));

    request(options, function(error, response, body) {
        if (error) {
            logger.error(context, 'Connection error sending registrations to the Context Broker: %s', error);
            callback(error);
        } else if (response && body && response.statusCode === 200) {
            var errorField = body.errorCode || body.orionError;

            if (errorField) {
                logger.error(context, 'Registration error connecting to the Context Broker: %j', errorField);
                callback(new errors.BadRequest(JSON.stringify(errorField)));
            } else {
                logger.debug(context, 'Registration success.');
                callback(null, body);
            }
        } else {
            var errorObj;

            logger.error(context, 'Protocol error connecting to the Context Broker: %j', errorObj);

            if (deviceData.registrationId) {
                errorObj = new errors.UnregistrationError(deviceData.id, deviceData.type);
            } else {
                errorObj = new errors.RegistrationError(deviceData.id, deviceData.type);
            }

            callback(errorObj);
        }
    });
}

/**
 * Process the response from a Register Context request for a device, extracting the 'registrationId' and creating the
 * device object that will be stored in the registry.
 *
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 *
 */
function processContextRegistration(deviceData, body, callback) {
    var newDevice = _.clone(deviceData);

    newDevice.registrationId = body.registrationId;

    callback(null, newDevice);
}

/**
 * Register a new device identified by the Id and Type in the Context Broker, and the internal registry.
 *
 * The device id and type are required fields for any registration. The rest of the parameters are optional, but, if
 * they are not present in the function call arguments, the type must be registered in the configuration, so the
 * service can infer their default values from the configured type. If an optional attribute is not given in the
 * parameter list and there isn't a default configuration for the given type, a TypeNotFound error is raised.
 *
 * When an optional parameter is not included in the call, a null value must be given in its place.
 *
 * @param {String} deviceObj                    Device ID of the device to register (mandatory).
 */
function registerDevice(deviceObj, callback) {
    var deviceData = _.clone(deviceObj);

    logger.debug(context, 'Registering device into NGSI Service:\n%s', JSON.stringify(deviceData, null, 4));

    if (!deviceData.name) {
        logger.debug(context, 'Device name not found, falling back to device id [%s]', deviceData.id);
        deviceData.name = deviceData.id;
    }

    if (!deviceObj.service || !deviceObj.subservice || !deviceObj.lazy) {
        if (config.types[deviceObj.type]) {
            logger.debug(context, 'Device type [%s] found', deviceObj.type);
            deviceData.service =
                (deviceObj.service) ? deviceData.service : config.types[deviceObj.type].service;
            deviceData.subservice =
                (deviceObj.subservice) ? deviceData.subservice : config.types[deviceObj.type].subservice;
            deviceData.lazy =
                (deviceObj.lazy) ? deviceData.lazy : config.types[deviceObj.type].lazy;
        } else {
            logger.debug(context, 'Device type not found [%s] for device [%s]', deviceObj.type, deviceData.name);
            callback(new errors.TypeNotFound(deviceObj.id, deviceObj.type));
            return;
        }
    }

    async.waterfall([
        async.apply(sendRegistrations, deviceData),
        async.apply(processContextRegistration, deviceData),
        registry.store
    ], callback);
}

/**
 * Makes an update in the Device's entity in the context broker, with the values given in the 'attributes' array. This
 * array should comply to the NGSI's attribute format.
 *
 * @param {String} deviceId     Device ID of the device to register.
 * @param {String} deviceType   Type of device to register.
 * @param {Array} attributes    Attribute array containing the values to update.
 * @param {String} token        User token to identify against the PEP Proxies (optional).
 */
function sendUpdateValue(deviceId, deviceType, attributes, token, callback) {
    var brokerHost = config.contextBroker.host,
        brokerPort = config.contextBroker.port,
        options,
        headers = {
            'fiware-service': config.service,
            'fiware-servicepath': config.subservice,
            'X-Auth-Token': token
        };

    if (config.types[deviceType]) {
        if (config.types[deviceType].service) {
            headers['fiware-service'] = config.types[deviceType].service;
        }

        if (config.types[deviceType].subservice) {
            headers['fiware-servicepath'] = config.types[deviceType].subservice;
        }

        if (config.types[deviceType].contextBroker) {
            brokerHost = config.types[deviceType].contextBroker.host;
            brokerPort = config.types[deviceType].contextBroker.port;
        }
    }

    options = {
        url: 'http://' + brokerHost + ':' + brokerPort + '/v1/updateContext',
        method: 'POST',
        json: {
            contextElements: [
                {
                    type: deviceType,
                    isPattern: 'false',
                    id: deviceId,
                    attributes: attributes
                }
            ],
            updateAction: 'APPEND'
        },
        headers: headers
    };

    logger.debug(context, 'Updating device value in the Context Broker at [%s]', options.url);
    logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));

    request(options, function(error, response, body) {
        if (error) {
            logger.debug(context, 'Error found updating value in Context Broker: %s', error);
            callback(error);
        } else if (body.orionError) {
            logger.debug(context, 'Orion error found updating value in Context Broker: %j', body.orionError);
            callback(new errors.BadRequest(body.orionError.details));
        } else if (response && body && response.statusCode === 200) {
            logger.debug(context, 'Value updated successfully');
            callback(null, body);
        } else if (response && response.statusCode === 403) {
            logger.debug(context, 'Access forbidden updating value');
            callback(new errors.AccessForbidden(
                token,
                options.headers['fiware-service'],
                options.headers['fiware-servicepath']));
        } else {
            logger.debug(context, 'Unknown error updating value');
            callback(new errors.EntityUpdateError(deviceId, deviceType));
        }
    });
}

/**
 * Launches the updating process, getting the security token in case the authorization sequence is enabled.
 *
 * @param {String} deviceId     Device ID of the device to register.
 * @param {String} deviceType   Type of device to register.
 * @param {Array} attributes    Attribute array containing the values to update.
 */
function updateValue(deviceId, deviceType, attributes, callback) {
    if (config.authentication && config.authentication.enabled) {
        if (config.types[deviceType] && config.types[deviceType].trust) {
            async.waterfall([
                apply(security.getToken, config.types[deviceType].trust),
                apply(sendUpdateValue, deviceId, deviceType, attributes)
            ], callback);
        } else {
            callback(new errors.SecurityInformationMissing(deviceType));
        }
    } else {
        sendUpdateValue(deviceId, deviceType, attributes, null, callback);
    }
}

/**
 * Unregister a device from the Context broker and the internal registry.
 *
 * @param {String} id           Device ID of the device to register.
 * @param {String} type         Type of device to register.
 */
function unregisterDevice(id, type, callback) {
    function processContextUnregister(body, innerCallback) {
        innerCallback(null);
    }

    logger.debug(context, 'Unregistering device from NGSI Service');

    async.waterfall([
        async.apply(registry.get, id),
        sendRegistrations,
        processContextUnregister,
        async.apply(registry.remove, id)
    ], function(error) {
        callback(error);
    });
}

/**
 * Return a list of all the devices registered in the system.
 */
function listDevices(callback) {
    if (registry) {
        registry.list(callback);
    } else {
        logger.error(context, 'Tried to list devices before a registry was available');
        callback(new errors.RegistryNotAvailable());
    }
}

/**
 * Retrieve a device from the device registry.
 *
 * @param {String} deviceId         ID of the device to be found.
 */
function getDevice(deviceId, callback) {
    if (registry) {
        registry.get(deviceId, callback);
    } else {
        logger.error(context, 'Tried to list devices before a registry was available');
        callback(new errors.RegistryNotAvailable());
    }
}

/**
 * Initializes the NGSI service. The initialization requires a configuration object and a reference to a device
 * registry.
 *
 * @param {Object} newRegistry      Reference to a device registry, where the devices information will be stored.
 * @param {Object} newConfig        Configuration object.
 */
function init(newRegistry, newConfig, callback) {
    registry = newRegistry;
    config = newConfig;

    callback(null);
}

exports.init = init;
exports.register = registerDevice;
exports.unregister = unregisterDevice;
exports.update = updateValue;
exports.listDevices = listDevices;
exports.getDevice = getDevice;
