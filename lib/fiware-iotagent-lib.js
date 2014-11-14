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

function activate(newConfig, callback) {
    config = newConfig;

    async.series([
        async.apply(contextServer.start, newConfig)
    ], callback);
}

function deactivate(callback) {
    contextServer.stop(callback);
}

function storeDevice(id, type, callback) {
    registeredDevices[id] = {
        id: id,
        type: type
    };

    logger.debug('Storing device with id [%s] and type [%s]', id, type);
    callback(null);
}

function removeDevice(id, type, callback) {
    delete registeredDevices[id];

    logger.debug('Removing device with id [%s] and type [%s]', id, type);

    callback(null);
}

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

function updateContextProviderId(id, body, callback) {
    registeredDevices[id].registrationId = body.registrationId;

    callback(null);
}

function registerDevice(id, type, callback) {
    async.waterfall([
        async.apply(storeDevice, id, type),
        async.apply(sendRegistrations, id, type, true),
        async.apply(updateContextProviderId, id)
    ], callback);
}

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

function unregisterDevice(id, type, callback) {
    async.series([
        async.apply(sendRegistrations, id, type, false),
        async.apply(removeDevice, id, type)
    ], function(error) {
        callback(error);
    });
}

function setDataUpdateHandler(dataHandler) {
    contextServer.setUpdateHandler(dataHandler);
}

function setDataQueryHandler(dataHandler) {
    contextServer.setQueryHandler(dataHandler);
}

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
