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

var request = require('request'),
    async = require('async'),
    apply = async.apply,
    errors = require('../errors'),
    logger = require('fiware-node-logger'),
    _ = require('underscore'),
    context = {
        op: 'IoTAgentNGSI.DeviceGroupService'
    },
    registry,
    config;


function createGroup(groupSet, callback) {
    var insertions = [];

    for (var i = 0; i < groupSet.services.length; i++) {
        insertions.push(async.apply(registry.create, groupSet.services[i]));
    }

    async.series(insertions, callback);
}

function listGroups(callback) {
    registry.list(callback);
}

function remove(service, subservice, callback) {
    registry.find(service, subservice, function (error, deviceGroup) {
        if (error) {
            callback(error);
        } else {
            registry.remove(deviceGroup.id, callback);
        }
    });
}

function update(service, subservice, body, callback) {
    registry.find(service, subservice, function (error, deviceGroup) {
        if (error) {
            callback(error);
        } else {
            registry.update(deviceGroup.id, body, callback);
        }
    });
}

/**
 * Initializes the device Group service. The initialization requires a configuration object and a reference to a device
 * registry.
 *
 * @param {Object} newRegistry      Reference to a device registry, where the devices information will be stored.
 * @param {Object} newConfig        Configuration object.
 */
function init(newRegistry, newConfig, callback) {
    registry = newRegistry;
    config = newConfig;

    callback(null);
}

exports.init = init;
exports.create = createGroup;
exports.list = listGroups;
exports.update = update;
exports.remove = remove;