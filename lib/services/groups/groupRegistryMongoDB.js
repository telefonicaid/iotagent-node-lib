/*
 * Copyright 2015 Telefonica Investigación y Desarrollo, S.A.U
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
 *
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */

const logger = require('logops');
const mongoose = require('mongoose');
const intoTrans = require('../common/domain').intoTrans;
const fillService = require('./../common/domain').fillService;
const alarmsInt = require('../common/alarmManagement').intercept;
const constants = require('../../constants');
const errors = require('../../errors');
const Group = require('../../model/Group');
const async = require('async');
let context = {
    op: 'IoTAgentNGSI.MongoDBGroupRegister'
};

const attributeList = [
    'url',
    'resource',
    'apikey',
    'type',
    'endpoint',
    'transport',
    'service',
    'subservice',
    'description',
    'trust',
    'cbHost',
    'timezone',
    'timestamp',
    'commands',
    'lazy',
    'attributes',
    'staticAttributes',
    'internalAttributes',
    'autoprovision',
    'explicitAttrs',
    'expressionLanguage',
    'defaultEntityNameConjunction',
    'ngsiVersion',
    'entityNameExp',
    'payloadType',
    'useCBflowControl',
    'storeLastMeasure'
];

function createGroup(group, callback) {
    /* eslint-disable-next-line  new-cap */
    const groupObj = new Group.model();

    attributeList.forEach((key) => {
        groupObj[key] = group[key];
    });

    logger.debug(
        context,
        'Storing device group with id [%s], type [%s], apikey [%s] and resource [%s]',
        groupObj._id,
        groupObj.type,
        groupObj.apikey,
        groupObj.resource
    );
    groupObj
        .save({})
        .then((groupDAO) => {
            callback(null, groupDAO.toObject());
        })
        .catch((error) => {
            if (error.code === 11000) {
                logger.debug(
                    context,
                    'Duplicate group entry with resource [%s] and apiKey [%s]',
                    group.resource,
                    group.apikey
                );
                callback(new errors.DuplicateGroup(group));
            } else {
                logger.debug(context, 'Error storing device group information: %s', error);
                callback(new errors.InternalDbError(error));
            }
        });
}

/**
 * List all the groups created in the IoT Agent.
 *
 * @param {Number} service      Service for wich all the configurations want to be retrieved.
 * @param {Number} limit        Maximum number of entries to return.
 * @param {Number} offset       Number of entries to skip for pagination.
 */
function listGroups(service, limit, offset, callback) {
    const condition = {};

    function toObjectFn(obj) {
        return obj.toObject();
    }

    if (service) {
        condition.service = service;
    }

    const query = Group.model.find(condition).sort();
    const queryCount = Group.model.countDocuments(condition);
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
            services: results[0].map(toObjectFn)
        });
    });
}

function getById(id, callback) {
    context = fillService(context, { service: 'n/a', subservice: 'n/a' });
    logger.debug(context, 'Looking for device group with id [%s].', id);

    const query = Group.model.findOne({ _id: id });
    query.select({ __v: 0 });

    query
        .exec({})
        .then((data) => {
            if (data) {
                context = fillService(context, data);
                logger.debug(context, 'Device group data found: %j', data);
                callback(null, data);
            } else {
                logger.debug(context, 'Device group [%s] not found.', id);
                callback(new errors.DeviceGroupNotFound(id));
            }
        })
        .catch((error) => {
            logger.debug(context, 'Internal MongoDB Error getting group: %s', error);
            callback(new errors.InternalDbError(error));
        });
}

/**
 * List all the groups created in the IoT Agent for a service and a subservice.
 *
 * @param  {String} service        Service used to filter the groups.
 * @param  {String} subservice     Subservice used to filter the groups.
 * @param  {Function} callback     The callback function.
 */
function find(service, subservice, callback) {
    const condition = {};

    function toObjectFn(obj) {
        return obj.toObject();
    }

    condition.service = service;
    condition.subservice = subservice;

    const query = Group.model.find(condition).sort();
    const queryCount = Group.model.countDocuments(condition);
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
            services: results[0].map(toObjectFn)
        });
    });
}

function findOneInMongoDB(queryObj, fields, callback) {
    const query = Group.model.findOne(queryObj);
    query.select({ __v: 0 });
    query.lean();

    query
        .exec({})
        .then((data) => {
            if (data) {
                context = fillService(context, data);
                logger.debug(context, 'Device group data found: %j', data);
                callback(null, data);
            } else {
                logger.debug(context, 'Device group for fields [%j] not found: [%j]', fields, queryObj);
                callback(new errors.DeviceGroupNotFound(fields, queryObj));
            }
        })
        .catch((error) => {
            logger.debug(context, 'Internal MongoDB Error getting group: %s', error);
            callback(new errors.InternalDbError(error));
        });
}

function findBy(fields) {
    return function () {
        const queryObj = {};
        let i = 0;

        /* eslint-disable prefer-rest-params */
        while (typeof arguments[i] !== 'function') {
            if (arguments[i]) {
                queryObj[fields[i]] = arguments[i];
            }

            i++;
        }
        const callback = arguments[i];
        /* eslint-enable prefer-rest-params */

        context = fillService(context, { service: 'n/a', subservice: 'n/a' });
        logger.debug(context, 'Looking for group params %j with queryObj %j', fields, queryObj);
        findOneInMongoDB(queryObj, fields, callback);
    };
}

function update(id, body, callback) {
    logger.debug(context, 'Storing updated values for configuration [%s]:\n%s', id, JSON.stringify(body, null, 4));
    getById(id, function (error, group) {
        if (error) {
            callback(error);
        } else {
            attributeList.forEach((key) => {
                if (body[key] !== undefined) {
                    group[key] = body[key];
                }
            });
            /* eslint-disable-next-line  new-cap */
            const groupObj = new Group.model(group);
            groupObj.isNew = false;
            groupObj
                .save({})
                .then((groupDAO) => {
                    callback(null, groupDAO.toObject());
                })
                .catch((error) => {
                    logger.debug(fillService(context, group), 'Error storing device group information: %s', error);
                    callback(new errors.InternalDbError(error));
                });
        }
    });
}

function remove(id, callback) {
    logger.debug(context, 'Removing device group with id [%s]', id);

    getById(id, function (error, deviceGroup) {
        if (error) {
            callback(error);
        } else {
            const query = Group.model.deleteOne({ _id: id });
            query
                .exec({})
                .then(() => {
                    logger.debug(context, 'Device group [%s] successfully removed.', id);
                    callback(null, deviceGroup);
                })
                .catch((error) => {
                    logger.debug(context, 'Internal MongoDB Error getting device group: %s', error);

                    callback(new errors.InternalDbError(error));
                });
        }
    });
}

function init(newConfig, callback) {
    callback(null);
}

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

exports.create = alarmsInt(constants.MONGO_ALARM + '_01', intoTrans(context, createGroup));
exports.list = alarmsInt(constants.MONGO_ALARM + '_02', intoTrans(context, listGroups));
exports.init = alarmsInt(constants.MONGO_ALARM + '_03', intoTrans(context, init));
exports.find = alarmsInt(constants.MONGO_ALARM + '_04', intoTrans(context, find));
exports.findType = alarmsInt(
    constants.MONGO_ALARM + '_05',
    intoTrans(context, findBy(['service', 'subservice', 'type', 'apikey']))
);
exports.findTypeSilently = intoTrans(context, findBy(['service', 'subservice', 'type', 'apikey']));
exports.findSilently = intoTrans(context, findBy(['service', 'subservice', 'apikey']));
exports.findBy = alarmsInt(constants.MONGO_ALARM + '_06', intoTrans(context, findBy));
exports.get = alarmsInt(constants.MONGO_ALARM + '_07', intoTrans(context, findBy(['resource', 'apikey'])));
exports.getSilently = intoTrans(context, findBy(['resource', 'apikey']));
exports.getType = alarmsInt(constants.MONGO_ALARM + '_08', intoTrans(context, findBy(['type'])));
exports.getTypeSilently = intoTrans(context, findBy(['type']));
exports.update = alarmsInt(constants.MONGO_ALARM + '_09', intoTrans(context, update));
exports.remove = alarmsInt(constants.MONGO_ALARM + '_10', intoTrans(context, remove));
exports.clear = alarmsInt(constants.MONGO_ALARM + '_11', intoTrans(context, clear));
