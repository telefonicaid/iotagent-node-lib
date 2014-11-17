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

var request = require('request'),
    async = require('async'),
    errors = require('./errors'),
    utils = require('./asyncUtils'),
    contextServer = require('./services/contextServer'),
    logger = require('fiware-node-logger'),
    registry,
    config;

/**
 * Activates the IoT Agent to start listening for NGSI Calls (to act as a Context Provider). It also creates the
 * device registry for the IoT Agent (based on the deviceRegistry.type configuration option).
 *
 * @param {Object} newConfig            Configuration of the Context Server
 */
function activate(newConfig, callback) {
    config = newConfig;

    if (newConfig.deviceRegistry &&
        newConfig.deviceRegistry.type &&
        newConfig.deviceRegistry.type === 'mongodb') {
        registry = require('./services/deviceRegistryMongoDB');
    } else {
        registry = require('./services/deviceRegistryMemory');
    }

    async.series([
        async.apply(registry.init, newConfig),
        async.apply(contextServer.start, newConfig)
    ], callback);
}

/**
 * Stops the context server.
 */
function deactivate(callback) {
    contextServer.stop(callback);
}

/**
 * Sends a Context Provider registration or unregistration request to the Context Broker. As registrations cannot be
 * removed, an unregistration consists of an update of the existent registration to make reduce its duration to
 * 1 second.
 *
 * @param {String} id               Device ID of the device to register.
 * @param {String} type             Type of device to register.
 * @param {String} registrationId   ID of the registration to update in the case of unregister operations.
 */
function sendRegistrations(id, type, registrationId, callback) {
    var options = {
            url: 'http://' + config.contextBroker.host + ':' + config.contextBroker.port + '/NGSI9/registerContext',
            method: 'POST',
            json: {
                contextRegistrations: [
                    {
                        entities: [
                            {
                                type: type,
                                isPattern: 'false',
                                id: id
                            }
                        ],
                        attributes: [],
                        providingApplication: config.providerUrl
                    }
                ],
                duration: (registrationId) ? 'PT1S' : config.deviceRegistrationDuration
            },
            headers: {
                'fiware-service': config.service,
                'fiware-servicepath': config.subservice
            }
        };

    if (registrationId) {
        options.json.registrationId = registrationId;
    }

    if (config.types[type]) {
        for (var i = 0; i < config.types[type].lazy.length; i++) {
            options.json.contextRegistrations[0].attributes.push({
                name: config.types[type].lazy[i].name,
                type: config.types[type].lazy[i].type,
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

                if (registrationId) {
                    errorObj = new errors.UnregistrationError(id, type);
                } else {
                    errorObj = new errors.RegistrationError(id, type);
                }

                callback(errorObj);
            }
        });
    } else {
        callback(new errors.TypeNotFound(id, type));
    }
}

/**
 * Process the response from a Register Context request for a device, extracting the 'registrationId' and creating the
 * device object that will be stored in the registry.
 *
 * @param {String} id           Device ID of the device to register.
 * @param {String} type         Device ID of the device to register.
 * @param {Object} body         Response from the Register Context request.
 */
function processContextRegistration(id, type, body, callback) {
    var newDevice = {
        id: id,
        type: type,
        registrationId: body.registrationId
    };

    callback(null, newDevice);
}

/**
 * Register a new device identified by the Id and Type in the Context Broker, and the internal registry.
 *
 * @param {String} id           Device ID of the device to register.
 * @param {String} type         Type of device to register.
 */
function registerDevice(id, type, callback) {
    async.waterfall([
        async.apply(sendRegistrations, id, type, null),
        async.apply(processContextRegistration, id, type),
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
        async.apply(utils.extract, 'registrationId'),
        async.apply(sendRegistrations, id, type),
        processContextUnregister,
        async.apply(registry.remove, id)
    ], function(error) {
        callback(error);
    });
}

/**
 * Sets the handler for update queries received from the Context Broker (redirected to the Agent as Context Provider).
 *
 * @param {Function} dataHandler            User defined handler for the updateContext requests received in the Agent.
 */
function setDataUpdateHandler(dataHandler) {
    contextServer.setUpdateHandler(dataHandler);
}

/**
 * Sets the handler for queries received from the Context Broker (redirected to the Agent as Context Provider).
 *
 * @param {Function} dataHandler            User defined handler for the queryContext requests received in the Agent.
 */
function setDataQueryHandler(dataHandler) {
    contextServer.setQueryHandler(dataHandler);
}

function listDevices(callback) {
    if (registry) {
        registry.list(callback);
    } else {
        logger.error('Tried to list devices before a registry was available');
        callback(new errors.RegistryNotAvailable());
    }
}

exports.activate = activate;
exports.deactivate = deactivate;
exports.register = registerDevice;
exports.unregister = unregisterDevice;
exports.update = updateValue;
exports.listDevices = listDevices;
exports.setDataUpdateHandler = setDataUpdateHandler;
exports.setDataQueryHandler = setDataQueryHandler;
