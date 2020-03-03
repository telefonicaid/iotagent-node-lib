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
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 */

let registeredDevices = {};
const logger = require('logops');
const errors = require('../../errors');
const _ = require('underscore');
const context = {
    op: 'IoTAgentNGSI.InMemoryDeviceRegister'
};

function deepClone(device) {
    const initialClone = _.clone(device);

    for (const i in device) {
        if (device.hasOwnProperty(i) && Array.isArray(device[i])) {
            initialClone[i] = device[i].map(_.clone);
        }
    }

    return initialClone;
}

/**
 * Create a new register for a device. The device object should contain the id, type and registrationId
 *
 * @param {Object} newDevice           Device object to be stored
 */
function storeDevice(newDevice, callback) {
    if (!registeredDevices[newDevice.service]) {
        registeredDevices[newDevice.service] = {};
    }

    if (registeredDevices[newDevice.service][newDevice.id]) {
        callback(new errors.DuplicateDeviceId(newDevice.id));
    } else {
        registeredDevices[newDevice.service][newDevice.id] = deepClone(newDevice);
        registeredDevices[newDevice.service][newDevice.id].creationDate = Date.now();

        logger.debug(context, 'Storing device with id [%s] and type [%s]', newDevice.id, newDevice.type);
        callback(null, newDevice);
    }
}

/**
 * Remove the device identified by its id and service.
 *
 * @param {String} id           Device ID of the device to remove.
 * @param {String} service      Service of the device to remove.
 * @param {String} subservice   Subservice inside the service for the removed device.
 */
function removeDevice(id, service, subservice, callback) {
    const services = Object.keys(registeredDevices);

    for (let i = 0; i < services.length; i++) {
        if (registeredDevices[services[i]][id]) {
            logger.debug(context, 'Removing device with id [%s] from service [%s].', id, services[i]);
            delete registeredDevices[services[i]][id];
        }
    }

    callback(null);
}

/**
 * Function to filter all the devices belonging to a service and subservice.
 *
 * @param {String} service      Service name to use in the filtering.
 * @param {String} subservice   Subservice name to use in the filtering.
 * @return {Function}           List of all the devices belonging to the given service and subservice.
 */
function getDevicesByService(service, subservice) {
    if (registeredDevices[service]) {
        return Object.keys(registeredDevices[service]).filter(function filterByService(item) {
            if (subservice) {
                return registeredDevices[service][item].subservice === subservice;
            }
            return true;
        });
    }
    return [];
}

/**
 * Return the list of currently registered devices (via callback).
 *
 * @param {String} service      Service for which the entries will be returned.
 * @param {String} subservice   Subservice for which the entries will be listed.
 * @param {Number} limit        Maximum number of entries to return.
 * @param {Number} offset       Number of entries to skip for pagination.
 */
function listDevices(type, service, subservice, limit, offset, callback) {
    const result = [];
    let skipped = 0;
    const deviceList = getDevicesByService(service, subservice);

    let countNumber = deviceList.length;
    for (const i in deviceList) {
        if (registeredDevices[service].hasOwnProperty(deviceList[i])) {
            if (offset && skipped < parseInt(offset, 10)) {
                skipped++;
            } else if (type && registeredDevices[service][deviceList[i]].type === type) {
                result.push(registeredDevices[service][deviceList[i]]);
            } else if (type) {
                countNumber--;
            } else {
                result.push(registeredDevices[service][deviceList[i]]);
            }

            if (limit && result.length === parseInt(limit, 10)) {
                break;
            }
        }
    }

    callback(null, {
        count: countNumber,
        devices: result
    });
}

function getDevice(id, service, subservice, callback) {
    if (registeredDevices[service] && registeredDevices[service][id]) {
        callback(null, registeredDevices[service][id]);
    } else {
        callback(new errors.DeviceNotFound(id));
    }
}

function getByName(name, service, subservice, callback) {
    const devices = _.values(registeredDevices[service]);
    let device;

    for (let i = 0; i < devices.length; i++) {
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
    registeredDevices[device.service][device.id] = deepClone(device);
    callback(null, device);
}

function clear(callback) {
    registeredDevices = {};

    callback();
}

function getDevicesByAttribute(name, value, service, subservice, callback) {
    let devices;
    const resultDevices = [];

    if (service) {
        devices = _.values(registeredDevices[service]);
    } else {
        devices = _.flatten(_.values(registeredDevices).map(_.values));
    }

    for (let i = 0; i < devices.length; i++) {
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
