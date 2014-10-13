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
    registrationId,
    config;

function activate(newConfig, callback) {
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

function registerDevice(id, type, attributes, callback) {
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
            duration: config.deviceRegistrationDuration,
            registrationId: registrationId
        },
        headers: {
            'fiware-service': config.service,
            'fiware-servicepath': config.subservice
        }
    };

    for (var i = 0; i < attributes.length; i++) {
        options.json.contextRegistrations[0].attributes.push({
            name: attributes[i].name,
            type: attributes[i].type,
            isDomain: 'false'
        });
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

function updateValue(deviceId, deviceType, attributes, callback) {
    callback(null);
}

function unregisterDevice(id, type, callback) {
    callback(null);
}

function setDataUpdateHandler(dataHandler) {
}

function setDataQueryHandler(dataHandler) {
}

function getRegistrationId() {
    return registrationId;
}

exports.activate = activate;
exports.update = updateValue;
exports.register = registerDevice;
exports.unregister = unregisterDevice;
exports.setDataUpdateHandler = setDataUpdateHandler;
exports.setDataQueryHandler = setDataQueryHandler;
exports.getRegistrationId = getRegistrationId;
