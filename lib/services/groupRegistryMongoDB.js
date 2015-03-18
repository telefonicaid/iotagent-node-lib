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
 */
'use strict';

var logger = require('fiware-node-logger'),
    dbService = require('../model/dbConn'),
    errors = require('../errors'),
    Group = require('../model/Group'),
    context = {
        op: 'IoTAgentNGSI.MongoDBGroupRegister'
    };

/**
 * Generates a handler for the save device group operations. The handler will take the customary error and the saved
 * device group as the parameters (and pass the serialized DAO as the callback value).
 *
 * @return {Function}       The generated handler.
 */
function saveGroupHandler(callback) {
    return function saveHandler(error, groupDAO) {
        if (error) {
            logger.debug(context, 'Error storing device group information: %s', error);

            callback(new errors.InternalDbError(error));
        } else {
            callback(null, groupDAO.toObject());
        }
    };
}

function createGroup(group, callback) {
    var groupObj = new Group.model(),
        attributeList = [
            'id',
            'url',
            'resource',
            'apikey',
            'type',
            'service',
            'subservice',
            'trust',
            'cbHost',
            'timezone',
            'commands',
            'lazy',
            'active'
        ];

    for (var i = 0; i < attributeList.length; i++) {
        groupObj[attributeList[i]] = group[attributeList[i]];
    }

    logger.debug(context, 'Storing device group with id [%s] and type [%s]', groupObj.id, groupObj.type);

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

function listGroups(callback) {
    var condition = {},
        query;

    query = Group.model.find(condition).sort();

    query.exec(callback);
}

function getById(id, callback) {
    var query;

    logger.debug(context, 'Looking for device group with id [%s].', id);

    query = Group.model.findOne({id: id});
    query.select({__v: 0});

    query.exec(function handleGet(error, data) {
        if (error) {
            logger.debug(context, 'Internal MongoDB Error getting device: %s', error);

            callback(new errors.InternalDbError(error));
        } else if (data) {
            callback(null, data);
        } else {
            logger.debug(context, 'Device group [%s] not found.', id);

            callback(new errors.DeviceGroupNotFound(id));
        }
    });
}

function findBy(fields) {
    return function() {
        var query,
            queryObj = {},
            i = 0,
            callback;

        while (typeof arguments[i] !== 'function') {
            queryObj[fields[i]] = arguments[i];
            i++;
        }

        callback = arguments[i];

        logger.debug(context, 'Looking for entity params %j', fields);

        query = Group.model.findOne(queryObj);

        query.select({__v: 0});

        query.exec(function handleGet(error, data) {
            if (error) {
                logger.debug(context, 'Internal MongoDB Error getting device: %s', error);

                callback(new errors.InternalDbError(error));
            } else if (data) {
                callback(null, data);
            } else {
                logger.debug(context, 'Device group for fields [%j]not found.', fields);

                callback(new errors.DeviceGroupNotFound());
            }
        });
    };
}

function update(id, body, callback) {
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
                'commands',
                'lazy',
                'active'
            ];

            for (var i = 0; i < attributes.length; i++) {
                group[attributes[i]] = body[attributes[i]];
            }

            group.save(saveGroupHandler(callback));
        }
    });
}

function remove(id, callback) {
    logger.debug(context, 'Removing device group with id [%s]', id);

    getById(id, function(error, deviceGroup) {
        if (error) {
            callback(error);
        } else {
            Group.model.remove({ id: id }, function(error, number, test) {
                if (error) {
                    logger.debug(context, 'Internal MongoDB Error getting device: %s', error);

                    callback(new errors.InternalDbError(error));
                } else if (number === 1) {
                    logger.debug(context, 'Entity [%s] successfully removed.', id);

                    callback(null, deviceGroup);
                } else {
                    logger.debug(context, 'Entity [%s] not found for removal.', id);

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
    dbService.dropDatabase(callback);
}

exports.create = createGroup;
exports.list = listGroups;
exports.init = init;
exports.find = findBy(['service', 'subservice']);
exports.get = findBy(['resource', 'apikey']);
exports.update = update;
exports.remove = remove;
exports.clear = clear;
