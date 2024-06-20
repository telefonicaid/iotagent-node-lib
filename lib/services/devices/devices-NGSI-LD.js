/*
 * Copyright 2020 Telefonica Investigación y Desarrollo, S.A.U
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
 * Modified by: Jason Fox - FIWARE Foundation
 */

const request = require('../../request-shim');
const async = require('async');
const apply = async.apply;
const constants = require('../../constants');
const alarms = require('../common/alarmManagement');
const errors = require('../../errors');
const logger = require('logops');
const config = require('../../commonConfig');
const ngsiLD = require('../ngsi/entities-NGSI-LD');
const utils = require('../northBound/restUtils');
const moment = require('moment');
const _ = require('underscore');
const registrationUtils = require('./registrationUtils');
const NGSIv2 = require('./devices-NGSI-v2');
const context = {
    op: 'IoTAgentNGSI.Devices-LD'
};

/**
 * Concats or merges two JSON objects.
 *
 * @param  {Object} json1           JSON object where objects will be merged.
 * @param  {Object} json2           JSON object to be merged.
 */
function jsonConcat(json1, json2) {
    for (const key in json2) {
        /* eslint-disable-next-line  no-prototype-builtins */
        if (json2.hasOwnProperty(key)) {
            json1[key] = json2[key];
        }
    }
}

/**
 * Creates the response handler for the update entity request using NGSI-LD.
 * This handler basically deals with the errors
 * that could have been rised during the communication with the Context Broker.
 *
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 * @param {Object} updatedDevice    Device object that will be stored in the database.
 * @return {function}               Handler to pass to the request() function.
 */
function updateEntityHandlerNgsiLD(deviceData, updatedDevice, callback) {
    return function handleEntityResponse(error, response, body) {
        if (error) {
            logger.error(
                context,
                'ORION-001: Connection error creating inital entity in the Context Broker: %s',
                error
            );

            alarms.raise(constants.ORION_ALARM, error);

            callback(error);
        }
        // Handling different response codes for batch entity upsert in NGSI-LD specification:
        // - In v1.2.1, response code is 200
        // - In v1.3.1, response code is 204 (not handling 201 as entities already previously created)
        else if (response && (response.statusCode === 200 || response.statusCode === 204)) {
            alarms.release(constants.ORION_ALARM);
            logger.debug(context, 'Entity updated successfully.');
            callback(null, updatedDevice);
        } else {
            logger.error(
                context,
                'Protocol error connecting to the Context Broker [%d]: %s',
                response.statusCode,
                body
            );

            const errorObj = new errors.EntityGenericError(deviceData.id, deviceData.type, deviceData, body);

            callback(errorObj);
        }
    };
}

/**
 * Creates the initial entity representing the device in the Context Broker using NGSI-LD.
 * This is important mainly to allow the rest of the updateContext operations to be performed.
 *
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 * @param {Object} newDevice        Device object that will be stored in the database.
 */
function createInitialEntityNgsiLDFake(deviceData, newDevice, callback) {
    callback(null, newDevice);
}

/**
 * Updates the entity representing the device in the Context Broker using NGSI-LD.
 *
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 * @param {Object} updatedDevice    Device object that will be stored in the database.
 */
function updateEntityNgsiLD(deviceData, updatedDevice, callback) {
    const options = {
        url: config.getConfig().contextBroker.url + '/ngsi-ld/v1/entityOperations/upsert/?options=update',
        method: 'POST',
        json: {},
        headers: {
            'fiware-service': deviceData.service,
            'fiware-servicepath': deviceData.subservice,
            'NGSILD-Tenant': deviceData.service,
            'NGSILD-Path': deviceData.subservice,
            'Content-Type': 'application/ld+json'
        }
    };

    if (deviceData.cbHost && deviceData.cbHost.indexOf('://') !== -1) {
        options.url = deviceData.cbHost + '/ngsi-ld/v1/entityOperations/upsert/?options=update';
    } else if (deviceData.cbHost && deviceData.cbHost.indexOf('://') === -1) {
        options.url = 'http://' + deviceData.cbHost + '/ngsi-ld/v1/entityOperations/upsert/?options=update';
    }

    /*if (deviceData.type) {
       options.url += '?type=' + deviceData.type;
    }*/

    jsonConcat(options.json, NGSIv2.formatAttributes(deviceData.active, false));
    jsonConcat(options.json, NGSIv2.formatAttributes(deviceData.staticAttributes, true));
    jsonConcat(options.json, NGSIv2.formatCommands(deviceData.commands));

    if (
        ('timestamp' in deviceData && deviceData.timestamp !== undefined
            ? deviceData.timestamp
            : config.getConfig().timestamp) &&
        !utils.isTimestampedNgsi2(options.json)
    ) {
        options.json[constants.TIMESTAMP_ATTRIBUTE] = {
            type: constants.TIMESTAMP_TYPE_NGSI2,
            value: moment()
        };
    }

    options.json.id = String(deviceData.name);
    options.json.type = deviceData.type;
    options.json = [ngsiLD.formatAsNGSILD(options.json)];

    // FIXME: maybe there is be a better way to theck options.json = {}
    if (Object.keys(options.json).length === 0 && options.json.constructor === Object) {
        logger.debug(context, 'Skip updating entity in the Context Broker (no actual attribute change)');
        callback(null, updatedDevice);
    } else {
        logger.debug(context, 'Updating entity in the Context Broker:\n %s', JSON.stringify(options, null, 4));
        request(options, updateEntityHandlerNgsiLD(deviceData, updatedDevice, callback));
    }
}

/**
 * Updates the register of an existing device identified by the Id and Type in the Context Broker, and the internal
 * registry. It uses NGSIv2.
 *
 * The device id and type are required fields for a registration updated. Only the following attributes will be
 * updated: lazy, active and internalId. Any other change will be ignored. The registration for the lazy attributes
 * of the updated entity will be updated if existing, and created if not. If new active attributes are created,
 * the entity will be updated creating the new attributes.
 *
 * @param {Object} deviceObj                    Object with all the device information (mandatory).
 */
function updateRegisterDeviceNgsiLD(deviceObj, previousDevice, entityInfoUpdated, callback) {
    if (!deviceObj.id || !deviceObj.type) {
        callback(new errors.MissingAttributes('Id or device missing', deviceObj));
        return;
    }

    logger.debug(context, 'Update provisioned LD device in Device Service %j %j', deviceObj, entityInfoUpdated);

    function combineWithNewDevice(newDevice, oldDevice, callback) {
        logger.debug(context, 'combineWithNewDevice %j %j', newDevice, oldDevice);
        if (oldDevice) {
            oldDevice.internalId = newDevice.internalId;
            oldDevice.lazy = newDevice.lazy;
            oldDevice.commands = newDevice.commands;
            oldDevice.staticAttributes = newDevice.staticAttributes;
            oldDevice.active = newDevice.active;
            oldDevice.name = newDevice.name;
            oldDevice.type = newDevice.type;
            oldDevice.polling = newDevice.polling;
            oldDevice.timezone = newDevice.timezone;
            if ('timestamp' in newDevice && newDevice.timestamp !== undefined) {
                oldDevice.timestamp = newDevice.timestamp;
            }
            if ('autoprovision' in newDevice && newDevice.autoprovision !== undefined) {
                oldDevice.autoprovision = newDevice.autoprovision;
            }
            if ('explicitAttrs' in newDevice && newDevice.explicitAttrs !== undefined) {
                oldDevice.explicitAttrs = newDevice.explicitAttrs;
            }

            oldDevice.endpoint = newDevice.endpoint || oldDevice.endpoint;

            callback(null, oldDevice);
        } else {
            callback(new errors.DeviceNotFound(newDevice.id, newDevice));
        }
    }

    function getAttributeDifference(oldArray, newArray) {
        let oldActiveKeys;
        let newActiveKeys;
        let updateKeys;
        let result;

        if (oldArray && newArray) {
            newActiveKeys = _.pluck(newArray, 'name');
            oldActiveKeys = _.pluck(oldArray, 'name');

            updateKeys = _.difference(newActiveKeys, oldActiveKeys);

            result = newArray.filter(function (attribute) {
                return updateKeys.indexOf(attribute.name) >= 0;
            });
        } else if (newArray) {
            result = newArray;
        } else {
            result = [];
        }

        return result;
    }

    function extractDeviceDifference(newDevice, oldDevice, callback) {
        const deviceData = {
            id: oldDevice.id,
            name: oldDevice.name,
            type: oldDevice.type,
            service: oldDevice.service,
            subservice: oldDevice.subservice
        };

        deviceData.active = getAttributeDifference(oldDevice.active, newDevice.active);
        deviceData.lazy = getAttributeDifference(oldDevice.lazy, newDevice.lazy);
        deviceData.commands = getAttributeDifference(oldDevice.commands, newDevice.commands);
        deviceData.staticAttributes = getAttributeDifference(oldDevice.staticAttributes, newDevice.staticAttributes);

        if (entityInfoUpdated) {
            jsonConcat(deviceData.active, oldDevice.active);
            jsonConcat(deviceData.lazy, oldDevice.lazy);
            jsonConcat(deviceData.commands, oldDevice.commands);
            jsonConcat(deviceData.staticAttributes, oldDevice.staticAttributes);
            if (oldDevice.name !== newDevice.name) {
                deviceData.name = newDevice.name;
            }
            if (oldDevice.type !== newDevice.type) {
                deviceData.type = newDevice.type;
            }
        }

        callback(null, deviceData, oldDevice);
    }

    if (entityInfoUpdated) {
        async.waterfall(
            [
                apply(
                    config.getRegistry().get,
                    deviceObj.id,
                    previousDevice.apikey,
                    deviceObj.service,
                    deviceObj.subservice
                ),
                apply(extractDeviceDifference, deviceObj),
                createInitialEntityNgsiLDFake,
                apply(combineWithNewDevice, deviceObj),
                apply(registrationUtils.sendRegistrations, false),
                apply(registrationUtils.processContextRegistration, deviceObj),
                apply(config.getRegistry().update, previousDevice)
            ],
            callback
        );
    } else {
        async.waterfall(
            [
                apply(
                    config.getRegistry().get,
                    deviceObj.id,
                    previousDevice.apikey,
                    deviceObj.service,
                    deviceObj.subservice
                ),
                apply(extractDeviceDifference, deviceObj),
                updateEntityNgsiLD,
                apply(combineWithNewDevice, deviceObj),
                apply(registrationUtils.sendRegistrations, false),
                apply(registrationUtils.processContextRegistration, deviceObj),
                apply(config.getRegistry().update, previousDevice)
            ],
            callback
        );
    }
}

exports.updateRegisterDevice = updateRegisterDeviceNgsiLD;
