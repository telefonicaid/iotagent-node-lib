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

var registeredDevices = {},
    logger = require('logops'),
    errors = require('../../errors'),
    _ = require('underscore'),
    context = {
        op: 'IoTAgentNGSI.InMemoryDeviceRegister'
    };

/**
 * Create a new register for a device. The device object should contain the id, type and registrationId
 *
 * @param {Object} newDevice           Device object to be stored
 */
function storeDevice(newDevice, callback) {
    if (registeredDevices[newDevice.id]) {
        callback(new errors.DuplicateDeviceId(newDevice.id));
    } else {
        registeredDevices[newDevice.id] = newDevice;
        registeredDevices[newDevice.id].creationDate = Date.now();

        logger.debug(context, 'Storing device with id [%s] and type [%s]', newDevice.id, newDevice.type);
        callback(null, newDevice);
    }
}

/**
 * Remove the device identified by its id and type.
 *
 * @param {String} id           Device ID of the device to register.
 */
function removeDevice(id, callback) {
    delete registeredDevices[id];

    logger.debug(context, 'Removing device with id [%s].', id);

    callback(null);
}

/**
 * Return the list of currently registered devices (via callback).
 *
 * @param {String} service      Service for which the entries will be returned.
 * @param {String} subservice   Subservice for which the entries will be listed.
 * @param {Number} limit        Maximum number of entries to return.
 * @param {Number} offset       Number of entries to skip for pagination.
 */
function listDevices(service, subservice, limit, offset, callback) {
    var result = [],
        skipped = 0;

    for (var i in registeredDevices) {
        if (registeredDevices.hasOwnProperty(i) &&
            ((!service && !subservice) ||
             (registeredDevices[i].service === service && registeredDevices[i].subservice === subservice))) {

            if (offset && skipped < parseInt(offset, 10)) {
                skipped++;
            } else {
                result.push(registeredDevices[i]);
            }

            if (limit && result.length === parseInt(limit, 10)) {
                break;
            }
        }
    }
    callback(null, result);
}

function getDevice(id, callback) {
    if (registeredDevices[id]) {
        callback(null, registeredDevices[id]);
    } else {
        callback(new errors.DeviceNotFound(id));
    }
}

function getByName(name, callback) {
    var devices = _.values(registeredDevices),
        device;

    for (var i = 0; i < devices.length; i++) {
        if (devices[i].name === name) {
            device = devices[i];
        }
    }

    if (device) {
        callback(null, device);
    } else {
        callback(new errors.DeviceNotFound(name));
    }
}

function update(device, callback) {
    registeredDevices[device.id] = device;
    callback(null, device);
}

function init(newConfig, callback) {
    callback(null);
}

function clear(callback) {
    registeredDevices = {};

    callback();
}

exports.store = storeDevice;
exports.update = update;
exports.remove = removeDevice;
exports.list = listDevices;
exports.get = getDevice;
exports.getByName = getByName;
exports.init = init;
exports.clear = clear;
