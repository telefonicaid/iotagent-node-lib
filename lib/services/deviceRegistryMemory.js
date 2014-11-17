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

var registeredDevices = {},
    logger = require('fiware-node-logger');

/**
 * Create a new register for a device. The device object should contain the id, type and registrationId
 *
 * @param {Object} newDevice           Device object to be stored
 */
function storeDevice(newDevice, callback) {
    registeredDevices[newDevice.id] = newDevice;
    registeredDevices[newDevice.id].creationData =  Date.now;

    logger.debug('Storing device with id [%s] and type [%s]', newDevice.id, newDevice.type);
    callback(null);
}

/**
 * Remove the device identified by its id and type.
 *
 * @param {String} id           Device ID of the device to register.
 */
function removeDevice(id, callback) {
    delete registeredDevices[id];

    logger.debug('Removing device with id [%s].', id);

    callback(null);
}

/**
 * Return the list of currently registered devices (via callback).
 */
function listDevices(callback) {
    callback(null, registeredDevices);
}

function getDevice(id, callback) {
    callback(null, registeredDevices[id]);
}

function init(newConfig, callback) {

    callback(null);
}

exports.store = storeDevice;
exports.remove = removeDevice;
exports.list = listDevices;
exports.get = getDevice;
exports.init = init;
