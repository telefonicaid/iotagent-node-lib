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

const logger = require('logops');
const mongoose = require('mongoose');
const config = require('../../commonConfig');
const fillService = require('./../common/domain').fillService;
const alarmsInt = require('../common/alarmManagement').intercept;
const errors = require('../../errors');
const constants = require('../../constants');
const Device = require('../../model/Device');
const async = require('async');
let context = {
    op: 'IoTAgentNGSI.MongoDBDeviceRegister'
};

const attributeList = [
    'id',
    'type',
    'name',
    'service',
    'subservice',
    'lazy',
    'commands',
    'staticAttributes',
    'active',
    'registrationId',
    'internalId',
    'internalAttributes',
    'resource',
    'apikey',
    'protocol',
    'endpoint',
    'transport',
    'polling',
    'timestamp',
    'explicitAttrs',
    'ngsiVersion',
    'subscriptions',
    'payloadType',
    'useCBflowControl',
    'storeLastMeasure'
];

/**
 * Create a new register for a device. The device object should contain the id, type and registrationId
 *
 * @param {Object} newDevice           Device object to be stored
 */
function storeDevice(newDevice, callback) {
    /* eslint-disable-next-line  new-cap */
    const deviceObj = new Device.model();
    attributeList.forEach((key) => {
        deviceObj[key] = newDevice[key];
    });

    // Ensure protocol is in newDevice
    if (!newDevice.protocol && config.getConfig().iotManager && config.getConfig().iotManager.protocol) {
        deviceObj.protocol = config.getConfig().iotManager.protocol;
    }

    logger.debug(context, 'Storing device with id [%s] and type [%s]', newDevice.id, newDevice.type);

    deviceObj
        .save({})
        .then((deviceDAO) => {
            callback(null, deviceDAO.toObject());
        })
        .catch((error) => {
            if (error.code === 11000) {
                logger.debug(context, 'Tried to insert a device with duplicate ID in the database: %s', error);

                callback(new errors.DuplicateDeviceId(newDevice));
            } else {
                logger.debug(context, 'Error storing device information: %s', error);

                callback(new errors.InternalDbError(error));
            }
        });
}

/**
 * Remove the device identified by its id and service.
 *
 * @param {String} id           Device ID of the device to remove.
 * @param {String} service      Service of the device to remove.
 * @param {String} subservice   Subservice inside the service for the removed device.
 */
function removeDevice(id, apikey, service, subservice, callback) {
    const condition = {
        id,
        service,
        subservice
    };
    if (apikey) {
        condition.apikey = apikey;
    }
    logger.debug(context, 'Removing device with id [%s]', id);

    const query = Device.model.deleteOne(condition);
    query
        .exec({})
        .then(() => {
            logger.debug(context, 'Device [%s] successfully removed.', id);
            callback(null);
        })
        .catch((error) => {
            logger.debug(context, 'Internal MongoDB Error getting device: %s', error);
            callback(new errors.InternalDbError(error));
        });
}

/**
 * Return the list of currently registered devices (via callback).
 *
 * @param {String} tyoe         Type for which the devices are requested.
 * @param {String} service      Service for which the devices are requested.
 * @param {String} subservice   Subservice inside the service for which the devices are requested.
 * @param {Number} limit        Maximum number of entries to return.
 * @param {Number} offset       Number of entries to skip for pagination.
 */
function listDevices(type, service, subservice, limit, offset, callback) {
    const condition = {};

    if (type) {
        condition.type = type;
    }

    if (service) {
        condition.service = service;
    }

    if (subservice) {
        condition.subservice = subservice;
    }

    const query = Device.model.find(condition).sort();
    const queryCount = Device.model.countDocuments(condition);
    if (limit) {
        query.limit(parseInt(limit, 10));
    }

    if (offset) {
        query.skip(parseInt(offset, 10));
    }

    function funcQuery(cb) {
        query
            .exec({})
            .then((res) => {
                cb(null, res);
            })
            .catch((error) => {
                cb(error);
            });
    }
    function funcQueryCount(cb) {
        queryCount
            .exec({})
            .then((res) => {
                cb(null, res);
            })
            .catch((error) => {
                cb(error);
            });
    }
    async.series([funcQuery, funcQueryCount], function (error, results) {
        callback(error, {
            count: results[1],
            devices: results[0]
        });
    });
}

function findOneInMongoDB(queryParams, id, callback) {
    const query = Device.model.findOne(queryParams);
    query.select({ __v: 0 });
    query.lean();

    query
        .exec({})
        .then((data) => {
            if (data) {
                context = fillService(context, data);
                logger.debug(context, 'Device data found: %j', data);
                callback(null, data);
            } else {
                logger.debug(context, 'Device [%s] not found.', id);
                callback(new errors.DeviceNotFound(id, queryParams));
            }
        })
        .catch((error) => {
            logger.debug(context, 'Internal MongoDB Error getting device: %s', error);
            callback(new errors.InternalDbError(error));
        });
}

/**
 * Internal function used to find a device in the DB.
 *
 * @param {String} id           ID of the Device to find.
 * @param {String} Apikey       Apikey of the Device to find.
 * @param {String} service      Service the device belongs to (optional).
 * @param {String} subservice   Division inside the service (optional).
 */
function getDeviceById(id, apikey, service, subservice, callback) {
    const queryParams = {
        id,
        service,
        subservice
    };
    if (apikey) {
        queryParams.apikey = apikey;
    }
    context = fillService(context, queryParams);
    logger.debug(context, 'Looking for device with id [%s] and queryParams [%j].', id, queryParams);
    findOneInMongoDB(queryParams, id, callback);
}

/**
 * Retrieves a device using it ID, converting it to a plain Object before calling the callback.
 *
 * @param {String} id           ID of the Device to find.
 * @param {String} service      Service the device belongs to.
 * @param {String} subservice   Division inside the service.
 */
function getDevice(id, apikey, service, subservice, callback) {
    getDeviceById(id, apikey, service, subservice, function (error, data) {
        if (error) {
            callback(error);
        } else {
            callback(null, data);
        }
    });
}

function getByNameAndType(name, type, service, servicepath, callback) {
    context = fillService(context, { service, subservice: servicepath });
    const optionsQuery = {
        name,
        service,
        subservice: servicepath
    };
    if (type) {
        optionsQuery.type = type;
    }
    logger.debug(context, 'Looking for device with [%j].', optionsQuery);
    const query = Device.model.findOne(optionsQuery);

    query.select({ __v: 0 });
    query.lean();
    query
        .exec({})
        .then((data) => {
            if (data) {
                context = fillService(context, data);
                logger.debug(context, 'Device data found: %j', data);
                callback(null, data);
            } else {
                logger.debug(context, 'Device [%s] not found.', name);
                callback(new errors.DeviceNotFound(name, optionsQuery));
            }
        })
        .catch((error) => {
            logger.debug(context, 'Internal MongoDB Error getting device: %s', error);
            callback(new errors.InternalDbError(error));
        });
}

function getByName(name, service, servicepath, callback) {
    getByNameAndType(name, null, service, servicepath, callback);
}

/**
 * Updates the given device into the database.
 * updated.
 *
 * @param {Object} device       Device object with the new values to write.
 */
function update(previousDevice, device, callback) {
    logger.debug(context, 'Storing updated values for device [%s]:\n%s', device.id, JSON.stringify(device, null, 4));
    getDevice(device.id, previousDevice.apikey, device.service, device.subservice, function (error, data) {
        if (error) {
            callback(error);
        } else {
            data.lazy = device.lazy;
            data.active = device.active;
            data.internalId = device.internalId;
            data.staticAttributes = device.staticAttributes;
            data.internalAttributes = device.internalAttributes;
            data.commands = device.commands;
            data.endpoint = device.endpoint;
            data.transport = device.transport;
            data.polling = device.polling;
            data.name = device.name;
            data.type = device.type;
            data.apikey = device.apikey;
            data.registrationId = device.registrationId;
            data.explicitAttrs = device.explicitAttrs;
            data.ngsiVersion = device.ngsiVersion;
            data.timestamp = device.timestamp;
            data.subscriptions = device.subscriptions;
            data.payloadType = device.payloadType;
            data.useCBflowControl = device.useCBflowControl;
            data.storeLastMeasure = device.storeLastMeasure;
            data.lastMeasure = device.lastMeasure;

            /* eslint-disable-next-line  new-cap */
            const deviceObj = new Device.model(data);
            deviceObj.isNew = false;
            deviceObj
                .save({})
                .then((deviceDAO) => {
                    callback(null, deviceDAO.toObject());
                })
                .catch((error) => {
                    logger.debug(fillService(context, device), 'Error storing device information: %s', error);
                    callback(new errors.InternalDbError(error));
                });
        }
    });
}

/**
 * Cleans all the information in the database, leaving it in a clean state.
 */
function clear(callback) {
    mongoose.connection
        .dropDatabase()
        .then(() => {
            callback(null);
        })
        .catch((error) => {
            callback(error);
        });
}

function itemToObject(i) {
    if (i.toObject) {
        return i.toObject();
    } else {
        return i;
    }
}

function getDevicesByAttribute(name, value, service, subservice, callback) {
    const filter = {};

    if (service) {
        filter.service = service;
    }

    if (subservice) {
        filter.subservice = subservice;
    }

    filter[name] = value;
    context = fillService(context, filter);
    logger.debug(context, 'Looking for device with filter [%j].', filter);

    const query = Device.model.find(filter);
    query.select({ __v: 0 });
    query.lean();
    query
        .exec({})
        .then((devices) => {
            if (devices) {
                callback(null, devices.map(itemToObject));
            } else {
                logger.debug(context, 'Device [%s] not found.', name);
                callback(new errors.DeviceNotFound(name, filter));
            }
        })
        .catch((error) => {
            logger.debug(context, 'Internal MongoDB Error getting device: %s', error);
            callback(new errors.InternalDbError(error));
        });
}

function storeLastMeasure(measure, typeInformation, callback) {
    if (
        typeInformation &&
        typeInformation.id &&
        typeInformation.apikey &&
        typeInformation.service &&
        typeInformation.subservice
    ) {
        getDevice(
            typeInformation.id,
            typeInformation.apikey,
            typeInformation.service,
            typeInformation.subservice,
            function (error, data) {
                if (error) {
                    callback(error);
                } else {
                    data.lastMeasure = { timestamp: new Date().toISOString(), measure };
                    /* eslint-disable-next-line  new-cap */
                    const deviceObj = new Device.model(data);
                    deviceObj.isNew = false;
                    deviceObj
                        .save({})
                        .then((deviceDao) => {
                            callback(null, deviceDao.toObject());
                        })
                        .catch((error) => {
                            logger.debug(
                                fillService(context, deviceObj),
                                'Error storing device information: %s',
                                error
                            );
                            callback(new errors.InternalDbError(error));
                        });
                }
            }
        );
    } else {
        callback(null, null);
    }
}

exports.getDevicesByAttribute = alarmsInt(constants.MONGO_ALARM, getDevicesByAttribute);
exports.store = alarmsInt(constants.MONGO_ALARM, storeDevice);
exports.storeLastMeasure = alarmsInt(constants.MONGO_ALARM, storeLastMeasure);
exports.update = alarmsInt(constants.MONGO_ALARM, update);
exports.remove = alarmsInt(constants.MONGO_ALARM, removeDevice);
exports.list = alarmsInt(constants.MONGO_ALARM, listDevices);
exports.get = alarmsInt(constants.MONGO_ALARM, getDevice);
exports.getSilently = getDevice;
exports.getByName = alarmsInt(constants.MONGO_ALARM, getByName);
exports.getByNameAndType = alarmsInt(constants.MONGO_ALARM, getByNameAndType);
exports.clear = alarmsInt(constants.MONGO_ALARM, clear);
