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
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 *
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */
'use strict';

var logger = require('logops'),
    dbService = require('../../model/dbConn'),
    intoTrans = require('../common/domain').intoTrans,
    fillService = require('./../common/domain').fillService,
    alarmsInt = require('../common/alarmManagement').intercept,
    constants = require('../../constants'),
    errors = require('../../errors'),
    Group = require('../../model/Group'),
    async = require('async'),
    context = {
        op: 'IoTAgentNGSI.MongoDBGroupRegister'
    };

/**
 * Generates a handler for the save device group operations. The handler will take the customary error and the saved
 * device group as the parameters (and pass the serialized DAO as the callback value).
 *
 * @return {Function}       The generated handler.
 */
function saveGroupHandler(groupDAO, callback) {
    return function saveHandler(error, result) {
        if (error) {
            logger.debug(fillService(context, groupDAO), 'Error storing device group information: %s', error);

            callback(new errors.InternalDbError(error));
        } else {
            callback(null, groupDAO.toObject());
        }
    };
}

function createGroup(group, callback) {
    var groupObj = new Group.model(),
        attributeList = [
            'url',
            'resource',
            'apikey',
            'type',
            'service',
            'subservice',
            'trust',
            'cbHost',
            'timezone',
            'timestamp',
            'commands',
            'lazy',
            'attributes',
            'staticAttributes',
            'internalAttributes'
        ];

    for (var i = 0; i < attributeList.length; i++) {
        groupObj[attributeList[i]] = group[attributeList[i]];
    }

    logger.debug(context, 'Storing device group with id [%s], type [%s], apikey [%s] and resource [%s]',
        groupObj._id, groupObj.type, groupObj.apikey, groupObj.resource);

    groupObj.save(function saveHandler(error, groupDAO) {
        if (error) {
            if (error.code === 11000) {
                logger.debug(context, 'Duplicate group entry with resource [%s] and apiKey [%s]',
                    group.resource, group.apikey);

                callback(new errors.DuplicateGroup(group.resource, group.apikey));
            } else {
                logger.debug(context, 'Error storing device group information: %s', error);

                callback(new errors.InternalDbError(error));
            }
        } else {
            callback(null, groupDAO.toObject());
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
    var condition = {},
        query;

    function toObjectFn(obj) {
        return obj.toObject();
    }

    if (service) {
        condition.service = service;
    }

    query = Group.model.find(condition).sort();

    if (limit) {
        query.limit(parseInt(limit, 10));
    }

    if (offset) {
        query.skip(parseInt(offset, 10));
    }

    async.series([
        query.exec.bind(query),
        Group.model.count.bind(Group.model, condition)
    ], function(error, results) {
        callback(error, {
            count: results[1],
            services: results[0].map(toObjectFn)
        });
    });
}

function getById(id, callback) {
    var query;

    logger.debug(context, 'Looking for device group with id [%s].', id);

    query = Group.model.findOne({_id: id});
    query.select({__v: 0});

    query.exec(function handleGet(error, data) {
        if (error) {
            logger.debug(context, 'Internal MongoDB Error getting device: %s', error);

            callback(new errors.InternalDbError(error));
        } else if (data) {
            logger.debug(context, 'Device group data found: %j', data);
            callback(null, data);
        } else {
            logger.debug(context, 'Device group [%s] not found.', id);

            callback(new errors.DeviceGroupNotFound(id));
        }
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
    var condition = {},
        query;

    function toObjectFn(obj) {
        return obj.toObject();
    }

    condition.service = service;
    condition.subservice = subservice;

    query = Group.model.find(condition).sort();

    async.series([
        query.exec.bind(query),
        Group.model.count.bind(Group.model, condition)
    ], function(error, results) {
        callback(error, {
            count: results[1],
            services: results[0].map(toObjectFn)
        });
    });
}


function findBy(fields) {
    return function() {
        var query,
            queryObj = {},
            i = 0,
            callback;

        while (typeof arguments[i] !== 'function') {
            if (arguments[i]) {
                queryObj[fields[i]] = arguments[i];
            }

            i++;
        }

        callback = arguments[i];

        logger.debug(context, 'Looking for group params %j with queryObj %j', fields, queryObj);
        query = Group.model.findOne(queryObj);

        query.select({__v: 0});

        query.exec(function handleGet(error, data) {
            if (error) {
                logger.debug(context, 'Internal MongoDB Error getting group: %s', error);
                callback(new errors.InternalDbError(error));
            } else if (data) {
                logger.debug(context, 'Device group data found: %j', data.toObject());
                callback(null, data.toObject());

            } else {
                logger.debug(context, 'Device group for fields [%j] not found: [%j]', fields, queryObj);

                callback(new errors.DeviceGroupNotFound(fields));
            }
        });
    };
}

function update(id, body, callback) {
    logger.debug(context, 'Storing updated values for configuration [%s]:\n%s', id, JSON.stringify(body, null, 4));
    getById(id, function(error, group) {
        if (error) {
            callback(error);
        } else {
            var attributes = [
                'url',
                'apikey',
                'type',
                'service',
                'subservice',
                'trust',
                'cbHost',
                'timezone',
                'timestamp',
                'commands',
                'lazy',
                'attributes',
                'staticAttributes'
            ];

            for (var i = 0; i < attributes.length; i++) {
                if (body[attributes[i]]) {
                    group[attributes[i]] = body[attributes[i]];
                }
            }

            group.isNew = false;
            group.save(saveGroupHandler(group, callback));
        }
    });
}

function remove(id, callback) {
    logger.debug(context, 'Removing device group with id [%s]', id);

    getById(id, function(error, deviceGroup) {
        if (error) {
            callback(error);
        } else {
            Group.model.remove({ _id: id }, function(error, commandResult) {
                if (error) {
                    logger.debug(context, 'Internal MongoDB Error getting device: %s', error);

                    callback(new errors.InternalDbError(error));
                } else if (commandResult && commandResult.result && commandResult.result.n === 1) {
                    logger.debug(context, 'Device [%s] successfully removed.', id);

                    callback(null, deviceGroup);
                } else {
                    logger.debug(context, 'Device [%s] not found for removal.', id);

                    callback(new errors.DeviceGroupNotFound(id));
                }
            });
        }
    });
}

function init(newConfig, callback) {
    callback(null);
}

function clear(callback) {
    dbService.db.db.dropDatabase(callback);
}

exports.create = alarmsInt(constants.MONGO_ALARM, intoTrans(context, createGroup));
exports.list = alarmsInt(constants.MONGO_ALARM, intoTrans(context, listGroups));
exports.init = alarmsInt(constants.MONGO_ALARM, intoTrans(context, init));
exports.find = alarmsInt(constants.MONGO_ALARM, intoTrans(context, find));
exports.findType = alarmsInt(constants.MONGO_ALARM, intoTrans(context, findBy(['service', 'subservice', 'type'])));
exports.findBy = alarmsInt(constants.MONGO_ALARM, intoTrans(context, findBy));
exports.get = alarmsInt(constants.MONGO_ALARM, intoTrans(context, findBy(['resource', 'apikey'])));
exports.getType = alarmsInt(constants.MONGO_ALARM, intoTrans(context, findBy(['type'])));
exports.update = alarmsInt(constants.MONGO_ALARM, intoTrans(context, update));
exports.remove = alarmsInt(constants.MONGO_ALARM, intoTrans(context, remove));
exports.clear = alarmsInt(constants.MONGO_ALARM, intoTrans(context, clear));
