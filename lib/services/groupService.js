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

var async = require('async'),
    apply = async.apply,
    logger = require('fiware-node-logger'),
    context = {
        op: 'IoTAgentNGSI.DeviceGroupService'
    },
    registry,
    config;


function createGroup(groupSet, callback) {
    var insertions = [],
        insertedGroups = [];

    logger.debug(context, 'Creating new set of %d services', groupSet.length);

    for (var i = 0; i < groupSet.services.length; i++) {
        insertions.push(async.apply(registry.create, groupSet.services[i]));
        insertedGroups.push(groupSet.services[i]);
    }

    async.series(insertions, function(error) {
        if (error) {
            callback(error);
        } else {
            for (var j = 0; j < insertedGroups.length; j++) {
                config.types[insertedGroups[j].type] = insertedGroups[j];
            }

            callback();
        }
    });
}

function listGroups(callback) {
    registry.list(callback);
}

function remove(service, subservice, callback) {
    function extractId(deviceGroup, callback) {
        callback(null, deviceGroup.id);
    }

    function removeFromConfig(deviceGroup, callback) {
        delete config.types[deviceGroup.type];
        callback();
    }

    async.waterfall([
        apply(registry.find, service, subservice),
        extractId,
        registry.remove,
        removeFromConfig
    ], callback);
}

function update(service, subservice, body, callback) {
    function extractId(deviceGroup, callback) {
        callback(null, deviceGroup.id, body);
    }

    function updateConfig(deviceGroup, callback) {
        config.types[deviceGroup.type] = deviceGroup;

        callback();
    }

    async.waterfall([
        apply(registry.find, service, subservice),
        extractId,
        registry.update,
        updateConfig
    ], callback);
}

function find(service, subservice, callback) {
    registry.find(service, subservice, callback);
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
exports.find = find;
exports.update = update;
exports.remove = remove;
