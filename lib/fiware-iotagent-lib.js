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
    registeredDevices = {},
    registrationId,
    config;

function registerIoTAgent(newConfig, callback) {
    var options = {
        url: 'http://' + newConfig.contextBroker.host + ':' + newConfig.contextBroker.port + '/NGSI9/registerContext',
        method: 'POST',
        json: {
            contextRegistrations: [
                {
                    entities: [],
                    attributes: [],
                    providingApplication: newConfig.providerUrl
                }
            ],
            duration: newConfig.deviceRegistrationDuration
        },
        headers: {
            'fiware-service': newConfig.service,
            'fiware-servicepath': newConfig.subservice
        }
    };

    registeredDevices = {};

    request(options, function(error, response, body) {
        if (error) {
            callback(error);
        } else if (response && body && response.statusCode === 200) {
            config = newConfig;
            registrationId = body.registrationId;
            callback(null);
        } else {
            callback('Unknown error');
        }
    });
}

function activate(newConfig, callback) {
    config = newConfig;

    async.series([
        async.apply(registerIoTAgent, newConfig),
        async.apply(contextServer.start, newConfig.server)
    ], callback)
}

function deactivate(callback) {
    contextServer.stop(callback);
}

function storeDevice(id, type, attributes, callback) {
    registeredDevices[id] = {
        id: id,
        type: type,
        attributes: attributes
    };

    callback(null);
}

function removeDevice(id, type, callback) {
    delete registeredDevices[id];

    callback(null);
}

function sendRegistrations(callback) {
    var options = {
            url: 'http://' + config.contextBroker.host + ':' + config.contextBroker.port + '/NGSI9/registerContext',
            method: 'POST',
            json: {
                contextRegistrations: [],
                duration: config.deviceRegistrationDuration,
                registrationId: registrationId
            },
            headers: {
                'fiware-service': config.service,
                'fiware-servicepath': config.subservice
            }
        },
        deviceKeys = Object.keys(registeredDevices);

    for (var i = 0; i < deviceKeys.length; i++) {
        var key = deviceKeys[i],
            device = {
                entities: [
                        {
                        type: registeredDevices[key].type,
                        isPattern: 'false',
                        id: registeredDevices[key].id
                        }
                    ],
                    attributes: [],
                    providingApplication: config.providerUrl
            };

        options.json.contextRegistrations.push(device);

        for (var j = 0; j < registeredDevices[key].attributes.length; j++) {
            options.json.contextRegistrations[i].attributes.push({
                name: registeredDevices[key].attributes[j].name,
                type: registeredDevices[key].attributes[j].type,
                isDomain: 'false'
            });
        }
    }

    request(options, function(error, response, body) {
        if (error) {
            callback(error);
        } else if (response && body && response.statusCode === 200) {
            callback(null, body);
        } else {
            callback('Unknown error');
        }
    });
}

function registerDevice(id, type, attributes, callback) {
    async.series([
        async.apply(storeDevice, id, type, attributes),
        sendRegistrations
    ], function(error) {
        callback(error);
    });
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

    request(options, function(error, response, body) {
        if (error) {
            callback(error);
        } else if (response && body && response.statusCode === 200) {
            callback(null, body);
        } else {
            callback('Unknown error');
        }
    });
}

function unregisterDevice(id, type, callback) {
    async.series([
        async.apply(removeDevice, id, type),
        sendRegistrations
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

function getRegistrationId() {
    return registrationId;
}

exports.activate = activate;
exports.deactivate = deactivate;
exports.update = updateValue;
exports.register = registerDevice;
exports.unregister = unregisterDevice;
exports.setDataUpdateHandler = setDataUpdateHandler;
exports.setDataQueryHandler = setDataQueryHandler;
exports.getRegistrationId = getRegistrationId;
