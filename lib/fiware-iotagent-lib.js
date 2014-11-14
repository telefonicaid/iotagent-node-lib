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
    contextServer = require('./services/contextServer'),
    logger = require('fiware-node-logger'),
    registeredDevices = {},
    config;

function generateGenericHandler(callback) {
    return function(error, response, body) {
        if (error) {
            callback(error);
        } else if (response && body && response.statusCode === 200) {
            callback(null, body);
        } else {
            callback('Unknown error');
        }
    };
}

/**
 * Activates the IoT Agent to start listening for NGSI Calls (to act as a Context Provider).
 *
 * @param {Object} newConfig            Configuration of the Context Server
 */
function activate(newConfig, callback) {
    config = newConfig;

    async.series([
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
 * Create a new register for a device with the given ID and Type.
 *
 * @param {String} id           Device ID of the device to register.
 * @param {String} type         Type of device to register.
 */
function storeDevice(id, type, callback) {
    registeredDevices[id] = {
        id: id,
        type: type
    };

    logger.debug('Storing device with id [%s] and type [%s]', id, type);
    callback(null);
}

/**
 * Remove the device identified by its id and type.
 *
 * @param {String} id           Device ID of the device to register.
 * @param {String} type         Type of device to register.
 */
function removeDevice(id, type, callback) {
    delete registeredDevices[id];

    logger.debug('Removing device with id [%s] and type [%s]', id, type);

    callback(null);
}

/**
 * Sends a Context Provider registration request to the Context Broker.
 *
 * @param {String} id           Device ID of the device to register.
 * @param {String} type         Type of device to register.
 * @param {Boolean} register    'True' for registrations; 'false' for unregistrations.
 */
function sendRegistrations(id, type, register, callback) {
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
                duration: (register) ? config.deviceRegistrationDuration : 'PT1S'
            },
            headers: {
                'fiware-service': config.service,
                'fiware-servicepath': config.subservice
            }
        };

    if (!register) {
        options.json.registrationId = registeredDevices[id].registrationId;
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

        request(options, generateGenericHandler(callback));
    } else {
        callback(null);
    }
}

/**
 * Process the response from a Register Context request for a device, extracting the 'registrationId' and writing it
 * in the device's register.
 *
 * @param {String} id           Device ID of the device to register.
 * @param {Object} body         Response from the Register Context request.
 */
function updateContextProviderId(id, body, callback) {
    registeredDevices[id].registrationId = body.registrationId;

    callback(null);
}

/**
 * Register a new device identified by the Id and Type in the Context Broker, and the internal registry.
 *
 * @param {String} id           Device ID of the device to register.
 * @param {String} type         Type of device to register.
 */
function registerDevice(id, type, callback) {
    async.waterfall([
        async.apply(storeDevice, id, type),
        async.apply(sendRegistrations, id, type, true),
        async.apply(updateContextProviderId, id)
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

    request(options, generateGenericHandler(callback));
}

/**
 * Unregister a device from the Context broker and the internal registry.
 *
 * @param {String} id           Device ID of the device to register.
 * @param {String} type         Type of device to register.
 */
function unregisterDevice(id, type, callback) {
    async.series([
        async.apply(sendRegistrations, id, type, false),
        async.apply(removeDevice, id, type)
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

/**
 * Return the list of currently registered devices.
 *
 * @return {Object}     List of the registered devices.
 */
function listDevices() {
    return registeredDevices;
}

exports.activate = activate;
exports.deactivate = deactivate;
exports.register = registerDevice;
exports.unregister = unregisterDevice;
exports.update = updateValue;
exports.listDevices = listDevices;
exports.setDataUpdateHandler = setDataUpdateHandler;
exports.setDataQueryHandler = setDataQueryHandler;
