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
 * Function to filter all the devices belonging to a service and subservice.
 *
 * @param {String} service      Service name to use in the filtering.
 * @param {String} subservice   Subservice name to use in the filtering.
 * @return {Function}          True if the item was an index of a group belonging to the given service.
 */
function getDevicesByService(service, subservice) {
    return Object.keys(registeredDevices).filter(function filterByService(item) {
        if (service && subservice) {
            return registeredDevices[item].service === service &&
                registeredDevices[item].subservice === subservice;
        } else {
            return true;
        }
    });
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
        skipped = 0,
        deviceList = getDevicesByService(service, subservice);

    for (var i in deviceList) {
        if (registeredDevices.hasOwnProperty(deviceList[i])) {
            if (offset && skipped < parseInt(offset, 10)) {
                skipped++;
            } else {
                result.push(registeredDevices[deviceList[i]]);
            }

            if (limit && result.length === parseInt(limit, 10)) {
                break;
            }
        }
    }

    callback(null, {
        count: deviceList.length,
        devices: result
    });
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

function clear(callback) {
    registeredDevices = {};

    callback();
}

function getDevicesByAttribute(name, value, callback) {
    var devices = _.values(registeredDevices),
        resultDevices = [];

    for (var i = 0; i < devices.length; i++) {
        if (devices[i][name] === value) {
            resultDevices.push(devices[i]);
        }
    }

    if (resultDevices.length > 0) {
        callback(null, resultDevices);
    } else {
        callback(new errors.DeviceNotFound(''));
    }
}

exports.getDevicesByAttribute = getDevicesByAttribute;
exports.store = storeDevice;
exports.update = update;
exports.remove = removeDevice;
exports.list = listDevices;
exports.get = getDevice;
exports.getByName = getByName;
exports.clear = clear;
