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

var logger = require('fiware-node-logger'),
    dbService = require('../model/dbConn'),
    errors = require('../errors'),
    Device = require('../model/Device');

/**
 * Create a new register for a device. The device object should contain the id, type and registrationId
 *
 * @param {Object} newDevice           Device object to be stored
 */
function storeDevice(newDevice, callback) {
    var deviceObj = new Device.model();

    deviceObj.id = newDevice.id;
    deviceObj.type = newDevice.type;
    deviceObj.name = newDevice.name;
    deviceObj.service = newDevice.service;
    deviceObj.subservice = newDevice.subservice;
    deviceObj.lazy = newDevice.lazy;
    deviceObj.registrationId = newDevice.registrationId;

    logger.debug('Storing device with id [%s] and type [%s]', newDevice.id, newDevice.type);

    deviceObj.save(function saveDeviceHandler(error, deviceDAO, number) {
        if (error) {
            callback(errors.InternalDbError(error));
        } else {
            callback(null, deviceDAO.toObject());
        }
    });
}

/**
 * Remove the device identified by its id and type.
 *
 * @param {String} id           Device ID of the device to register.
 */
function removeDevice(id, callback) {
    Device.model.remove({ id: id }, function(error, number) {
        if (error) {
            callback(errors.InternalDbError(error));
        } else if (number === 1) {
            callback(null);
        } else {
            callback(errors.EntityNotFound(id));
        }
    });
}

/**
 * Return the list of currently registered devices (via callback).
 */
function listDevices(callback) {
    var condition = {},
        query;

    query = Device.model.find(condition).sort();

    query.exec(callback);
}

function getDevice(id, callback) {
    var query;

    query = Device.model.findOne({id: id});
    query.select({__v: 0});

    query.exec(function handleGet(error, data) {
        if (error) {
            callback(errors.InternalDbError(error));
        } else if (data) {
            callback(null, data.toObject());
        } else {
            callback(errors.EntityNotFound(id));
        }
    });}

function init(newConfig, callback) {
    dbService.init(newConfig.deviceRegistry.host, newConfig.deviceRegistry.db, callback);
}

exports.store = storeDevice;
exports.remove = removeDevice;
exports.list = listDevices;
exports.get = getDevice;
exports.init = init;
