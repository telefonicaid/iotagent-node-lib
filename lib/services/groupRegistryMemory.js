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
    logger = require('fiware-node-logger'),
    errors = require('../errors'),
    _ = require('underscore'),
    context = {
        op: 'IoTAgentNGSI.InMemoryGroupRegister'
    },
    groupIds = 1;

function createGroup(group, callback) {
    var storeGroup = _.clone(group);

    storeGroup.id = groupIds++;

    registeredGroups[storeGroup.id] = storeGroup;
    registeredGroups[storeGroup.id].creationDate = Date.now();

    logger.debug(context, 'Storing device group for service [%s] and subservice [%s]',
        storeGroup.id, storeGroup.service, storeGroup.subservice);

    callback(null);
}

function listGroups(callback) {
    var result = [];

    for (var i in registeredGroups) {
        if (registeredGroups.hasOwnProperty(i)) {
            result.push(registeredGroups[i]);
        }
    }
    callback(null, result);
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

exports.create = createGroup;
exports.list = listGroups;
exports.init = init;
exports.find = find;
exports.update = update;
exports.remove = remove;
exports.clear = clear;
