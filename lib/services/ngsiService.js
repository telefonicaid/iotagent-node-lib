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
    errors = require('../errors'),
    logger = require('fiware-node-logger'),
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
                            id: deviceData.name
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

    logger.debug('Sending device registrations to Context Broker at [%s]', options.url);
    logger.debug('Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));

    request(options, function(error, response, body) {
        if (error) {
            callback(error);
        } else if (response && body && response.statusCode === 200) {
            callback(null, body);
        } else {
            var errorObj;

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
    var newDevice = {
        id: deviceData.id,
        type: deviceData.type,
        name: deviceData.name,
        service: deviceData.service,
        subservice: deviceData.subservice,
        lazy: deviceData.lazy,
        registrationId: body.registrationId
    };

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
 * @param {String} id               Device ID of the device to register (mandatory).
 * @param {String} type             Type of device to register (mandatory).
 * @param {String} name             Name of the entity representing the device (optional).
 * @param {String} service          Service where the device will be added (optional).
 * @param {String} subservice       Subservice where the device will be added (optional).
 * @param {Array} lazyAttributes    List of the lazy attributes of the device with their types (optional).
 * @param {String} registrationId   ID of the device in the underlying platform.
 */
function registerDevice(id, type, name, service, subservice, lazyAttributes, registrationId, callback) {
    var deviceData = {
        id: id,
        type: type,
        name: name,
        service: service,
        subservice: subservice,
        lazy: lazyAttributes,
        registrationId: registrationId
    };

    if (!deviceData.name) {
        deviceData.name = deviceData.id;
    }

    if (!service || !subservice || !lazyAttributes) {
        if (config.types[type]) {
            deviceData.service = (service) ? deviceData.service : config.types[type].service;
            deviceData.subservice = (subservice) ? deviceData.subservice : config.types[type].subservice;
            deviceData.lazy = (lazyAttributes) ? deviceData.lazy : config.types[type].lazy;
        } else {
            callback(new errors.TypeNotFound(id, type));
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
 */
function updateValue(deviceId, deviceType, attributes, callback) {
    var options = {
        url: 'http://' + config.contextBroker.host + ':' + config.contextBroker.port + '/NGSI10/updateContext',
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
        headers: {
            'fiware-service': config.service,
            'fiware-servicepath': config.subservice
        }
    };

    logger.debug('Updating device value in the Context Broker at [%s]', options.url);
    logger.debug('Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));

    request(options, function(error, response, body) {
        if (error) {
            callback(error);
        } else if (body.orionError) {
            callback(new errors.BadRequest(body.orionError.details));
        } else if (response && body && response.statusCode === 200) {
            callback(null, body);
        } else {
            callback(new errors.EntityUpdateError(deviceId, deviceType));
        }
    });
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
        logger.error('Tried to list devices before a registry was available');
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
        logger.error('Tried to list devices before a registry was available');
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
