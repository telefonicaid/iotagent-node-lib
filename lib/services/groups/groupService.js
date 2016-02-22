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
    iotManagerService = require('./../common/iotManagerService'),
    apply = async.apply,
    logger = require('logops'),
    config = require('../../commonConfig'),
    errors = require('../../errors'),
    context = {
        op: 'IoTAgentNGSI.DeviceGroupService'
    };


/**
 * Store a set of groups into the registry. The set should contain a services parameter with an array of groups to add;
 * each group is added individually.
 *
 * @param {Object} groupSet         Set of device groups to add to the registry.
 */
function createGroup(groupSet, callback) {
    var insertions = [],
        insertedGroups = [];

    logger.debug(context, 'Creating new set of %d services', groupSet.services.length);

    for (var i = 0; i < groupSet.services.length; i++) {
        insertions.push(async.apply(config.getGroupRegistry().create, groupSet.services[i]));
        insertedGroups.push(groupSet.services[i]);
    }

    insertions.push(iotManagerService.register);
    async.series(insertions, callback);
}

/**
 * List all the groups created in the IoT Agent. This function can be called in two forms: with a single callback
 * parameter, or with four parameters (with optional null in the unwanted options).
 *
 * @param {Number} service      Service for wich all the configurations want to be retrieved.
 * @param {Number} limit        Maximum number of entries to return.
 * @param {Number} offset       Number of entries to skip for pagination.
 */
function listGroups(service, limit, offset, callback) {
    if (!callback) {
        callback = service;
    }

    config.getGroupRegistry().list(service, limit, offset, callback);
}

function checkServiceIdentity(service, subservice, deviceGroup, callback) {
    if (deviceGroup.service === service && deviceGroup.subservice === subservice) {
        callback(null, deviceGroup);
    } else {
        callback(new errors.MismatchedService(service, subservice));
    }
}

/**
 * Remove the device group defined by the given service and subservice names from the group registry.
 *
 * @param {String} service              Group service name.
 * @param {String} subservice           Group subservice name.
 * @param {String} resource             Resource where the devices will arrive.
 * @param {String} apikey               Api keys the devices will declare.
 */
function remove(service, subservice, resource, apikey, callback) {
    function extractId(deviceGroup, callback) {
        callback(null, deviceGroup.id);
    }

    function handleRemove(error, removedObject) {
        if (error) {
            callback(error);
        } else {
            iotManagerService.register(callback);
        }
    }

    async.waterfall([
        apply(config.getGroupRegistry().get, resource, apikey),
        apply(checkServiceIdentity, service, subservice),
        extractId,
        config.getGroupRegistry().remove
    ], handleRemove);
}

/**
 * Update the device group defined by resource and API Key with the values in the new body. The new body does not
 * override the old one as a whole: just the attributes present in the new body are changed.
 *
 * @param {String} service              Group service name.
 * @param {String} subservice           Group subservice name.
 * @param {String} resource             Resource where the devices will arrive.
 * @param {String} apikey               Api keys the devices will declare.
 * @param {Object} body                 New body containing the attributes to change.
 */
function update(service, subservice, resource, apikey, body, callback) {
    function extractId(deviceGroup, callback) {
        callback(null, deviceGroup.id, body);
    }

    async.waterfall([
        apply(config.getGroupRegistry().get, resource, apikey),
        apply(checkServiceIdentity, service, subservice),
        extractId,
        config.getGroupRegistry().update
    ], callback);
}

/**
 * Find a device group based on its service and subservice.
 *
 * @param {String} service              Group service name.
 * @param {String} subservice           Group subservice name.
 */
function find(service, subservice, callback) {
    config.getGroupRegistry().find(service, subservice, callback);
}

/**
 * Get the device group identified by the given (resource, apikey) pair.
 *
 * @param {String} resource             Resource where the devices will arrive.
 * @param {String} apikey               Api keys the devices will declare.
 */
function getGroup(resource, apikey, callback) {
    config.getGroupRegistry().get(resource, apikey, callback);
}

exports.create = createGroup;
exports.list = listGroups;
exports.find = find;
exports.get = getGroup;
exports.update = update;
exports.remove = remove;
