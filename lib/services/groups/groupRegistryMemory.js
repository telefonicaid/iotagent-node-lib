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

var registeredGroups = {},
    logger = require('logops'),
    intoTrans = require('../common/domain').intoTrans,
    errors = require('../../errors'),
    _ = require('underscore'),
    context = {
        op: 'IoTAgentNGSI.InMemoryGroupRegister'
    },
    groupIds = 1;

function exists(group) {
    var keys = _.keys(registeredGroups);

    for (var i in keys) {
        if (registeredGroups[keys[i]].apikey === group.apikey &&
            registeredGroups[keys[i]].resource === group.resource) {
            return true;
        }
    }

    return false;
}

function createGroup(group, callback) {
    if (exists(group)) {
        callback(new errors.DuplicateGroup(group.resource, group.apikey));
    } else {
        var storeGroup = _.clone(group);

        storeGroup._id = groupIds++;

        registeredGroups[storeGroup._id] = storeGroup;
        registeredGroups[storeGroup._id].creationDate = Date.now();

        logger.debug(context, 'Storing device group for service [%s] and subservice [%s]',
            storeGroup._id, storeGroup.service, storeGroup.subservice);

        callback(null);
    }
}

/**
 * Function to filter all the groups belonging to a service.
 *
 * @param {String} service  Service name to use in the filtering.
 * @return {Function}      True if the item was an index of a group belonging to the given service.
 */
function getConfigurationsByService(service) {
    return Object.keys(registeredGroups).filter(function filterByService(item) {
        if (service) {
            return registeredGroups[item].service === service;
        } else {
            return true;
        }
    });
}

/**
 * List all the groups created in the IoT Agent. The result, passed as a parameter in the callback
 * will be an object with two attributes: the services array with the list of groups; and a count
 * attribute with the total number of groups in the collection.
 *
 * @param {Number} service      Service for wich all the configurations want to be retrieved.
 * @param {Number} limit        Maximum number of entries to return.
 * @param {Number} offset       Number of entries to skip for pagination.
 */
function listGroups(service, limit, offset, callback) {
    var result = [],
        skipped = 0,
        filteredGroups = getConfigurationsByService(service);

    for (var i in filteredGroups) {
        if (registeredGroups.hasOwnProperty(filteredGroups[i])) {
            if (offset && skipped < parseInt(offset, 10)) {
                skipped++;
            } else {
                result.push(registeredGroups[filteredGroups[i]]);
            }

            if (limit && result.length === parseInt(limit, 10)) {
                break;
            }
        }
    }

    callback(null, {
        count: filteredGroups.length,
        services: result
    });
}

function init(newConfig, callback) {
    callback(null);
}

function clear(callback) {
    registeredGroups = {};

    callback();
}

function find(service, subservice, callback) {
    var result;

    for (var i in registeredGroups) {
        if (registeredGroups.hasOwnProperty(i) &&
            registeredGroups[i].service === service &&
            registeredGroups[i].subservice === subservice) {
            result = registeredGroups[i];
            break;
        }
    }

    if (result) {
        callback(null, result);
    } else {
        callback(new errors.DeviceGroupNotFound(service, subservice));
    }
}

function findBy(fields) {
    return function() {
        var result,
            queryObj = {},
            i = 0,
            callback;

        while (typeof arguments[i] !== 'function') {
            queryObj[fields[i]] = arguments[i];
            i++;
        }

        callback = arguments[i];

        logger.debug(context, 'Looking for entity params %j', fields);

        for (var p in registeredGroups) {
            if (registeredGroups.hasOwnProperty(p)) {
                var found = 0;

                for (var j in queryObj) {
                    if (queryObj.hasOwnProperty(j) &&
                        registeredGroups[p][j] === queryObj[j]) {
                        found++;
                    }
                }

                if (found === Object.keys(queryObj).length) {
                    result = registeredGroups[p];
                    break;
                }
            }
        }

        if (result) {
            callback(null, result);
        } else {
            callback(new errors.DeviceGroupNotFound('n/a', 'n/a'));
        }
    };
}

function getSingleGroup(resource, apikey, callback) {
    var result;

    for (var i in registeredGroups) {
        if (registeredGroups.hasOwnProperty(i) &&
            registeredGroups[i].resource === resource &&
            registeredGroups[i].apikey === apikey) {
            result = registeredGroups[i];
            break;
        }
    }

    if (result) {
        callback(null, result);
    } else {
        callback(new errors.DeviceGroupNotFound(resource, apikey));
    }
}


function update(id, body, callback) {
    var groupToModify = registeredGroups[id];

    if (groupToModify) {
        for (var i in body) {
            if (body.hasOwnProperty(i)) {
                groupToModify[i] = body[i];
            }
        }

        callback(null, groupToModify);
    } else {
        callback(new errors.DeviceGroupNotFound(id));
    }
}

function remove(id, callback) {
    var removedObject = registeredGroups[id];
    delete registeredGroups[id];

    callback(null, removedObject);
}

exports.create = intoTrans(context, createGroup);
exports.list = intoTrans(context, listGroups);
exports.init = intoTrans(context, init);
exports.find = intoTrans(context, find);
exports.findBy = intoTrans(context, findBy);
exports.findType = intoTrans(context, findBy(['service', 'subservice', 'type']));
exports.get = intoTrans(context, getSingleGroup);
exports.update = intoTrans(context, update);
exports.remove = intoTrans(context, remove);
exports.clear = intoTrans(context, clear);
