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
 */

const async = require('async');
const iotManagerService = require('./../common/iotManagerService');
const intoTrans = require('../common/domain').intoTrans;
const apply = async.apply;
const deviceService = require('../devices/deviceService');
const logger = require('logops');
const config = require('../../commonConfig');
const errors = require('../../errors');
const context = {
    op: 'IoTAgentNGSI.DeviceGroupService'
};

/**
 * Validate the Device Group: check mandatory params, and its check for duplicates with existing groups. This last
 * check may depend on the configuration mode.
 *
 *
 * @param {Object} group        Validate the device group
 */
function validateGroup(group, callback) {
    const validations = [];
    logger.debug(context, 'validateGroup %j', group);

    function generateDuplicateHandler(innerCb) {
        return function (error, foundGroup) {
            logger.debug(context, 'generateDuplicateHander error %j and foundGroup %j', error, foundGroup);
            if (!error || (foundGroup && foundGroup.count > 0)) {
                innerCb(new errors.DuplicateGroup(group));
            } else {
                innerCb();
            }
        };
    }

    function checkApiKeyAndResource(innerCb) {
        config.getGroupRegistry().getSilently(group.resource, group.apikey, generateDuplicateHandler(innerCb));
    }

    function checkMandatoryParams(innerCb) {
        if (!group.service) {
            innerCb(new errors.MissingConfigParams(['service']));
            return;
        }

        if (!group.subservice) {
            innerCb(new errors.MissingConfigParams(['subservice']));
            return;
        }

        if (!group.type) {
            innerCb(new errors.MissingConfigParams(['type']));
            return;
        }

        innerCb();
    }

    validations.push(checkApiKeyAndResource);
    validations.push(checkMandatoryParams);

    async.series(validations, callback);
}

/**
 * Store a set of groups into the registry. The set should contain a services parameter with an array of groups to add;
 * each group is added individually.
 *
 * @param {Object} groupSet         Set of device groups to add to the registry.
 */
function createGroup(groupSet, callback) {
    const insertions = [];
    const insertedGroups = [];

    logger.debug(context, 'Creating new set of %d services', groupSet.services.length);

    for (let i = 0; i < groupSet.services.length; i++) {
        insertions.push(async.apply(validateGroup, groupSet.services[i]));
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
    if (deviceGroup.service === service.toLowerCase() && deviceGroup.subservice === subservice) {
        callback(null, deviceGroup);
    } else {
        callback(new errors.MismatchedService(service, subservice));
    }
}

/**
 * Generates a handler for group management functions that, if the operation went out correctly, calls the
 * IoT Manager registration for group information update.
 *
 * @return {Function}      A handler for the group related functions.
 */
function handleWithIotaRegistration(callback) {
    /* eslint-disable-next-line  no-unused-vars */
    return function (error, objectResult) {
        if (error) {
            callback(error);
        } else {
            iotManagerService.register(callback);
        }
    };
}

/**
 * Remove the device group defined by the given service and subservice names from the group registry.
 *
 * @param {String} service              Group service name.
 * @param {String} subservice           Group subservice name.
 * @param {String} resource             Resource where the devices will arrive.
 * @param {String} apikey               Api keys the devices will declare.
 */
function remove(service, subservice, resource, apikey, device, callback) {
    function extractId(deviceGroup, callback) {
        callback(null, deviceGroup._id);
    }

    function unregisterDevice(device, cb) {
        deviceService.unregister(device.id, device.apikey, service, subservice, function (error) {
            if (error) {
                cb(error);
            }
        });
    }

    function deleteDevices(device, service, subservice, id, callback) {
        if (device) {
            deviceService.listDevices(service, subservice, function (error, devices) {
                if (error) {
                    callback(error);
                } else if (devices && devices.count > 0) {
                    async.map(devices.devices, unregisterDevice, function (error) {
                        if (error) {
                            callback(error);
                        }
                    });
                }
            });
        }

        callback(null, id);
    }

    async.waterfall(
        [
            apply(config.getGroupRegistry().get, resource, apikey),
            apply(checkServiceIdentity, service, subservice),
            extractId,
            apply(deleteDevices, device, service, subservice),
            config.getGroupRegistry().remove
        ],
        handleWithIotaRegistration(callback)
    );
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
        callback(null, deviceGroup._id, body);
    }

    async.waterfall(
        [
            apply(config.getGroupRegistry().get, resource, apikey),
            apply(checkServiceIdentity, service, subservice),
            extractId,
            config.getGroupRegistry().update
        ],
        handleWithIotaRegistration(callback)
    );
}

/**
 * Find a device group based on its service and subservice.
 *
 * @param {String} service              Group service name.
 * @param {String} subservice           Group subservice name.
 * @param {String} type                 Group type (optional).
 */
function find(service, subservice, type, callback) {
    if (type) {
        config.getGroupRegistry().findType(service, subservice, type, callback);
    } else {
        config.getGroupRegistry().find(service, subservice, callback);
    }
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

/**
 * Get the device group identified by the given (resource, apikey) pair,
 * allowing not found it (will be created later)
 *
 * @param {String} resource             Resource where the devices will arrive.
 * @param {String} apikey               Api keys the devices will declare.
 */
function getGroupSilently(resource, apikey, callback) {
    config.getGroupRegistry().getSilently(resource, apikey, callback);
}

/**
 * Get the API Key for the selected service if there is any, or the default API Key if a specific one does not exist.
 *
 * @param {String} service          Name of the service whose API Key we are retrieving.
 * @param {String} subservice       Name of the subservice whose API Key we are retrieving.
 * @param {String} type             Type of the device.
 */
function getEffectiveApiKey(service, subservice, type, callback) {
    logger.debug(
        context,
        'Getting effective API Key for service [%s], subservice [%s] and type [%s]',
        service,
        subservice,
        type
    );

    function handleFindGroup(error, group) {
        if (group) {
            logger.debug(context, 'Using found group: %j', group);
            callback(null, group.apikey);
        } else if (
            config.getConfig().types &&
            config.getConfig().types[type] &&
            config.getConfig().types[type].apikey
        ) {
            logger.debug(context, 'Using API Key for type [%s]: %s', type, config.getConfig().types[type].apikey);
            callback(null, config.getConfig().types[type].apikey);
        } else if (config.getConfig().defaultKey) {
            logger.debug(context, 'Using default API Key: %s', config.getConfig().defaultKey);
            callback(null, config.getConfig().defaultKey);
        } else {
            logger.error(
                context,
                'Could not find any APIKey information for device in service %s subservice %s and type %s',
                service,
                subservice,
                type
            );
            callback(new errors.GroupNotFound(service, subservice, type));
        }
    }

    find(service, subservice, type, handleFindGroup);
}

exports.create = intoTrans(context, createGroup);
exports.list = intoTrans(context, listGroups);
exports.find = intoTrans(context, find);
exports.get = intoTrans(context, getGroup);
exports.getSilently = intoTrans(context, getGroupSilently);
exports.update = intoTrans(context, update);
exports.remove = intoTrans(context, remove);
exports.getEffectiveApiKey = intoTrans(context, getEffectiveApiKey);
