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

var logger = require('logops'),
    dbService = require('../../model/dbConn'),
    errors = require('../../errors'),
    Device = require('../../model/Device'),
    async = require('async'),
    context = {
        op: 'IoTAgentNGSI.MongoDBDeviceRegister'
    };

/**
 * Generates a handler for the save device operations. The handler will take the customary error and the saved device
 * as the parameters (and pass the serialized DAO as the callback value).
 *
 * @return {Function}       The generated handler.
 */
function saveDeviceHandler(callback) {
    return function saveHandler(error, deviceDAO) {
        if (error) {
            logger.debug(context, 'Error storing device information: %s', error);

            callback(new errors.InternalDbError(error));
        } else {
            callback(null, deviceDAO.toObject());
        }
    };
}

/**
 * Create a new register for a device. The device object should contain the id, type and registrationId
 *
 * @param {Object} newDevice           Device object to be stored
 */
function storeDevice(newDevice, callback) {
    var deviceObj = new Device.model(),
        attributeList = ['id', 'type', 'name', 'service', 'subservice', 'lazy', 'commands', 'staticAttributes',
            'active', 'registrationId', 'internalId', 'internalAttributes', 'resource', 'apikey', 'protocol'];

    for (var i = 0; i < attributeList.length; i++) {
        deviceObj[attributeList[i]] = newDevice[attributeList[i]];
    }

    logger.debug(context, 'Storing device with id [%s] and type [%s]', newDevice.id, newDevice.type);

    deviceObj.save(function saveHandler(error, deviceDAO) {
        if (error) {
            if (error.code === 11000) {
                logger.debug(context, 'Tried to insert a device with duplicate ID in the database: %s', error);

                callback(new errors.DuplicateDeviceId(newDevice.id));
            } else {
                logger.debug(context, 'Error storing device information: %s', error);

                callback(new errors.InternalDbError(error));
            }
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
    logger.debug(context, 'Removing device with id [%s]', id);

    Device.model.remove({ id: id }, function(error) {
        if (error) {
            logger.debug(context, 'Internal MongoDB Error getting device: %s', error);

            callback(new errors.InternalDbError(error));
        } else {
            logger.debug(context, 'Entity [%s] successfully removed.', id);

            callback(null);
        }
    });
}

/**
 * Return the list of currently registered devices (via callback).
 *
 * @param {String} service      Service for which the devices are requested.
 * @param {String} subservice   Subservice inside the service for which the devices are requested.
 * @param {Number} limit        Maximum number of entries to return.
 * @param {Number} offset       Number of entries to skip for pagination.
 */
function listDevices(service, subservice, limit, offset, callback) {
    var condition = {},
        query;

    if (service) {
        condition.service = service;
    }

    if (subservice) {
        condition.subservice = subservice;
    }

    query = Device.model.find(condition).sort();

    if (limit) {
        query.limit(parseInt(limit, 10));
    }

    if (offset) {
        query.skip(parseInt(offset, 10));
    }

    async.series([
        query.exec.bind(query),
        Device.model.count.bind(Device.model, condition)
    ], function(error, results) {
        callback(error, {
            count: results[1],
            devices: results[0]
        });
    });
}

/**
 * Internal function used to find a device in the DB.
 *
 * @param {String} id       ID of the Device to find.
 */
function getDeviceById(id, callback) {
    var query;

    logger.debug(context, 'Looking for entity with id [%s].', id);

    query = Device.model.findOne({id: id});
    query.select({__v: 0});

    query.exec(function handleGet(error, data) {
        if (error) {
            logger.debug(context, 'Internal MongoDB Error getting device: %s', error);

            callback(new errors.InternalDbError(error));
        } else if (data) {
            callback(null, data);
        } else {
            logger.debug(context, 'Entity [%s] not found.', id);

            callback(new errors.DeviceNotFound(id));
        }
    });
}

/**
 * Retrieves a device using it ID, converting it to a plain Object before calling the callback.
 *
 * @param {String} id           ID of the Device to find.
 */
function getDevice(id, callback) {
    getDeviceById(id, function(error, data) {
        if (error) {
            callback(error);
        } else {
            callback(null, data.toObject());
        }
    });
}

function getByName(name, callback) {
    var query;

    logger.debug(context, 'Looking for entity with name [%s].', name);

    query = Device.model.findOne({name: name});
    query.select({__v: 0});

    query.exec(function handleGet(error, data) {
        if (error) {
            logger.debug(context, 'Internal MongoDB Error getting device: %s', error);

            callback(new errors.InternalDbError(error));
        } else if (data) {
            callback(null, data.toObject());
        } else {
            logger.debug(context, 'Entity [%s] not found.', name);

            callback(new errors.EntityNotFound(name));
        }
    });
}

/**
 * Updates the given device into the database. Only the following attributes: lazy, active and internalId will be
 * updated.
 *
 * @param {Object} device       Device object with the new values to write.
 */
function update(device, callback) {
    getDeviceById(device.id, function(error, data) {
        if (error) {
            callback(error);
        } else {
            data.lazy = device.lazy;
            data.active = device.active;
            data.internalId = device.internalId;

            data.save(saveDeviceHandler(callback));
        }
    });
}

/**
 * Cleans all the information in the database, leaving it in a clean state.
 */
function clear(callback) {
    dbService.db.db.dropDatabase(callback);
}

function itemToObject(i) {
    if (i.toObject) {
        return i.toObject();
    } else {
        return i;
    }
}

function getDevicesByAttribute(name, value, callback) {
    var query,
        filter = {};

    filter[name] = value;

    logger.debug(context, 'Looking for entity with filter [%j].', filter);

    query = Device.model.find(filter);
    query.select({__v: 0});

    query.exec(function handleGet(error, devices) {
        if (error) {
            logger.debug(context, 'Internal MongoDB Error getting device: %s', error);

            callback(new errors.InternalDbError(error));
        } else if (devices) {
            callback(null, devices.map(itemToObject));
        } else {
            logger.debug(context, 'Entity [%s] not found.', name);

            callback(new errors.EntityNotFound(name));
        }
    });
}

exports.store = storeDevice;
exports.update = update;
exports.remove = removeDevice;
exports.list = listDevices;
exports.get = getDevice;
exports.getByName = getByName;
exports.clear = clear;
exports.getDevicesByAttribute = getDevicesByAttribute;
