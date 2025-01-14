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
 * Modified by: Federico M. Facca - Martel Innovate
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 * Modified by: Jason Fox - FIWARE Foundation
 */

/* eslint-disable consistent-return */

const request = require('../../request-shim');
const async = require('async');
const apply = async.apply;
const uuid = require('uuid');
const constants = require('../../constants');
const domain = require('domain');
const alarms = require('../common/alarmManagement');
const errors = require('../../errors');
const logger = require('logops');
const config = require('../../commonConfig');
const registrationUtils = require('./registrationUtils');
const _ = require('underscore');
const utils = require('../northBound/restUtils');
const NGSIv2 = require('../ngsi/entities-NGSI-v2');
const moment = require('moment');
const context = {
    op: 'IoTAgentNGSI.Devices-v2'
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
 * Creates the response handler for the update entity request using NGSIv2. This handler basically deals with the errors
 * that could have been rised during the communication with the Context Broker.
 *
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 * @param {Object} updatedDevice    Device object that will be stored in the database.
 * @return {function}               Handler to pass to the request() function.
 */
function updateEntityHandlerNgsi2(deviceData, updatedDevice, callback) {
    return function handleEntityResponse(error, response, body) {
        if (error) {
            logger.error(context, 'ORION-001: Connection error updating entity in the Context Broker: %s', error);

            alarms.raise(constants.ORION_ALARM, error);

            callback(error);
        } else if (response && response.statusCode === 204) {
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

            const errorObj = new errors.EntityGenericError(
                deviceData.id,
                deviceData.type,
                deviceData,
                body,
                response.statusCode
            );

            callback(errorObj);
        }
    };
}

/**
 * Formats device's attributes in NGSIv2 format.
 *
 * @param  {Object} originalVector  Original vector which contains all the device information and attributes.
 * @param  {Object} staticAtts      Flag that defined if the device'attributes are static.
 * @return {Object}                 List of device's attributes formatted in NGSIv2.
 */
function formatAttributesNgsi2(originalVector, staticAtts) {
    const attributeList = {};

    if (originalVector && originalVector.length) {
        for (let i = 0; i < originalVector.length; i++) {
            // (#628) check if attribute has entity_name:
            // In that case attribute should not be appear in current entity
            /*jshint camelcase: false */

            if (!originalVector[i].entity_name) {
                attributeList[originalVector[i].name] = {
                    type: originalVector[i].type,
                    value: constants.getInitialValueForType(originalVector[i].type)
                };
                if (staticAtts) {
                    attributeList[originalVector[i].name].value = originalVector[i].value;
                } else {
                    attributeList[originalVector[i].name].value = constants.getInitialValueForType(
                        originalVector[i].type
                    );
                }
                if (originalVector[i].metadata) {
                    attributeList[originalVector[i].name].metadata = originalVector[i].metadata;
                }
            }
        }
    }

    return attributeList;
}

/**
 * Formats device's commands in NGSIv2 format.
 *
 * @param  {Object} originalVector  Original vector which contains all the device information and attributes.
 * @return {Object}                 List of device's commands formatted in NGSIv2.
 */
function formatCommandsNgsi2(originalVector) {
    const attributeList = {};

    if (originalVector && originalVector.length) {
        for (let i = 0; i < originalVector.length; i++) {
            attributeList[originalVector[i].name + constants.COMMAND_STATUS_SUFIX] = {
                type: constants.COMMAND_STATUS,
                value: 'UNKNOWN'
            };
            attributeList[originalVector[i].name + constants.COMMAND_RESULT_SUFIX] = {
                type: constants.COMMAND_RESULT,
                value: ' '
            };
        }
    }

    return attributeList;
}

/*
 * This methods makes a bypass in updateRegisterDeviceNgsi2 to allow not change
 * extractDeviceDifference and combineWithNewDevice methods
 */
function createInitialEntityNgsi2Fake(deviceData, newDevice, callback) {
    callback(null, newDevice);
}

/**
 * Updates the entity representing the device in the Context Broker using NGSIv2.
 *
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 * @param {Object} updatedDevice    Device object that will be stored in the database.
 */
function updateEntityNgsi2(deviceData, updatedDevice, callback) {
    const options = {
        url: config.getConfig().contextBroker.url + '/v2/entities/' + String(deviceData.name) + '/attrs',
        method: 'POST',
        json: {},
        headers: {
            'fiware-service': deviceData.service,
            'fiware-servicepath': deviceData.subservice,
            'fiware-correlator': (domain.active && domain.active.corr) || uuid.v4()
        }
    };

    if (deviceData.cbHost && deviceData.cbHost.indexOf('://') !== -1) {
        options.url = deviceData.cbHost + '/v2/entities/' + String(deviceData.name) + '/attrs';
    } else if (deviceData.cbHost && deviceData.cbHost.indexOf('://') === -1) {
        options.url = 'http://' + deviceData.cbHost + '/v2/entities/' + String(deviceData.name) + '/attrs';
    }

    if (deviceData.type) {
        options.url += '?type=' + deviceData.type;
    }

    jsonConcat(options.json, formatAttributesNgsi2(deviceData.active, false));
    jsonConcat(options.json, formatAttributesNgsi2(deviceData.staticAttributes, true));
    jsonConcat(options.json, formatCommandsNgsi2(deviceData.commands));

    for (const att in options.json) {
        try {
            // Format any GeoJSON attrs properly
            options.json[att] = NGSIv2.formatGeoAttrs(options.json[att]);
        } catch (error) {
            return callback(new errors.BadGeocoordinates(JSON.stringify(options.json), deviceData));
        }
    }

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

    // FIXME: maybe there is be a better way to theck options.json = {}
    if (Object.keys(options.json).length === 0 && options.json.constructor === Object) {
        logger.debug(context, 'Skip updating entity in the Context Broker (no actual attribute change)');
        callback(null, updatedDevice);
    } else {
        logger.debug(context, 'Updating entity in the Context Broker:\n %s', JSON.stringify(options, null, 4));
        request(options, updateEntityHandlerNgsi2(deviceData, updatedDevice, callback));
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
function updateRegisterDeviceNgsi2(deviceObj, previousDevice, entityInfoUpdated, callback) {
    if (!deviceObj.id || !deviceObj.type) {
        callback(new errors.MissingAttributes('Id or device missing', deviceObj));
        return;
    }

    logger.debug(context, 'Update provisioned v2 device in Device Service %j %j', deviceObj, entityInfoUpdated);

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
            if ('explicitAttrs' in newDevice && newDevice.explicitAttrs !== undefined) {
                oldDevice.explicitAttrs = newDevice.explicitAttrs;
            }
            if ('apikey' in newDevice && newDevice.apikey !== undefined) {
                oldDevice.apikey = newDevice.apikey;
            }
            if ('payloadType' in newDevice && newDevice.payloadType !== undefined) {
                oldDevice.payloadType = newDevice.payloadType;
            }
            if ('endpoint' in newDevice && newDevice.endpoint !== undefined) {
                oldDevice.endpoint = newDevice.endpoint;
            }
            if ('transport' in newDevice && newDevice.transport !== undefined) {
                oldDevice.transport = newDevice.transport;
            }
            if ('useCBflowControl' in newDevice && newDevice.useCBflowControl !== undefined) {
                oldDevice.useCBflowControl = newDevice.useCBflowControl;
            }
            if ('storeLastMeasure' in newDevice && newDevice.storeLastMeasure !== undefined) {
                oldDevice.storeLastMeasure = newDevice.storeLastMeasure;
            }
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
                    previousDevice.apikey, // it could be updated
                    deviceObj.service,
                    deviceObj.subservice
                ),
                apply(extractDeviceDifference, deviceObj),
                createInitialEntityNgsi2Fake,
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
                updateEntityNgsi2,
                apply(combineWithNewDevice, deviceObj),
                apply(registrationUtils.sendRegistrations, false),
                apply(registrationUtils.processContextRegistration, deviceObj),
                apply(config.getRegistry().update, previousDevice)
            ],
            callback
        );
    }
}

exports.updateRegisterDevice = updateRegisterDeviceNgsi2;
exports.formatCommands = formatCommandsNgsi2;
exports.formatAttributes = formatAttributesNgsi2;
exports.updateEntityHandler = updateEntityHandlerNgsi2;
