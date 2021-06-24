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

const async = require('async');
const apply = async.apply;
const uuid = require('uuid');
const constants = require('../../constants');
const domain = require('domain');
const alarms = require('../common/alarmManagement');
const errors = require('../../errors');
const logger = require('logops');
const config = require('../../commonConfig');
const ngsiUtils = require('./../ngsi/ngsiUtils');
const registrationUtils = require('./registrationUtils');
const _ = require('underscore');
const utils = require('../northBound/restUtils');
const context = {
    op: 'IoTAgentNGSI.Devices-v1'
};

/**
 * Creates the response handler for the initial entity creation request NGSIv1.
 * This handler basically deals with the errors that could have been rised during
 * the communication with the Context Broker.
 *
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 * @param {Object} newDevice        Device object that will be stored in the database.
 * @return {function}               Handler to pass to the request() function.
 */
function createInitialEntityHandlerNgsi1(deviceData, newDevice, callback) {
    return function handleInitialEntityResponse(error, response, body) {
        if (error) {
            logger.error(
                context,
                'ORION-001: Connection error creating inital entity in the Context Broker: %s',
                error
            );

            alarms.raise(constants.ORION_ALARM, error);

            callback(error);
        } else if (response && body && response.statusCode === 200) {
            const errorField = ngsiUtils.getErrorField(body);

            if (errorField) {
                logger.error(context, 'Update error connecting to the Context Broker: %j', errorField);
                callback(new errors.BadRequest(JSON.stringify(errorField)));
            } else {
                alarms.release(constants.ORION_ALARM);
                logger.debug(context, 'Initial entity created successfully.');
                callback(null, newDevice);
            }
        } else {
            logger.error(
                context,
                'Protocol error connecting to the Context Broker [%d]: %s',
                response.statusCode,
                body
            );

            const errorObj = new errors.EntityGenericError(deviceData.id, deviceData.type, body);

            callback(errorObj);
        }
    };
}

/**
 * Creates the initial entity representing the device in the Context Broker using NGSIv1.
 * This is important mainly to allow the rest of the updateContext operations to be performed
 * using an UPDATE action instead of an APPEND one.
 *
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 * @param {Object} newDevice        Device object that will be stored in the database.
 */
function createInitialEntityNgsi1(deviceData, newDevice, callback) {
    let cbHost = config.getConfig().contextBroker.url;
    if (deviceData.cbHost && deviceData.cbHost.indexOf('://') !== -1) {
        cbHost = deviceData.cbHost;
    } else if (deviceData.cbHost && deviceData.cbHost.indexOf('://') === -1) {
        cbHost = 'http://' + deviceData.cbHost;
    }
    const options = {
        url: cbHost + '/v1/updateContext',
        method: 'POST',
        json: {
            contextElements: [
                {
                    type: deviceData.type,
                    isPattern: 'false',
                    id: String(deviceData.name),
                    attributes: []
                }
            ],
            updateAction: 'APPEND'
        },
        headers: {
            'fiware-service': deviceData.service,
            'fiware-servicepath': deviceData.subservice,
            'fiware-correlator': (domain.active && domain.active.corr) || uuid.v4()
        }
    };

    function formatAttributes(originalVector) {
        const attributeList = [];

        if (originalVector && originalVector.length) {
            for (let i = 0; i < originalVector.length; i++) {
                // (#628) check if attribute has entity_name:
                // In that case attribute should not be appear in current entity
                /*jshint camelcase: false */
                if (!originalVector[i].entity_name) {
                    attributeList.push({
                        name: originalVector[i].name,
                        type: originalVector[i].type,
                        value: constants.getInitialValueForType(originalVector[i].type)
                    });
                }
            }
        }

        return attributeList;
    }

    function formatCommands(originalVector) {
        const attributeList = [];

        if (originalVector && originalVector.length) {
            for (let i = 0; i < originalVector.length; i++) {
                attributeList.push({
                    name: originalVector[i].name + constants.COMMAND_STATUS_SUFIX,
                    type: constants.COMMAND_STATUS,
                    value: 'UNKNOWN'
                });
                attributeList.push({
                    name: originalVector[i].name + constants.COMMAND_RESULT_SUFIX,
                    type: constants.COMMAND_RESULT,
                    value: ' '
                });
            }
        }

        return attributeList;
    }

    options.json.contextElements[0].attributes = [].concat(
        formatAttributes(deviceData.active),
        deviceData.staticAttributes,
        formatCommands(deviceData.commands)
    );

    if (
        ('timestamp' in deviceData && deviceData.timestamp !== undefined
            ? deviceData.timestamp
            : config.getConfig().timestamp) &&
        !utils.isTimestamped(options.json)
    ) {
        options.json.contextElements[0].attributes.push({
            name: constants.TIMESTAMP_ATTRIBUTE,
            type: constants.TIMESTAMP_TYPE,
            value: ' '
        });
    }

    logger.debug(context, 'Creating initial entity in the Context Broker:\n %s', JSON.stringify(options, null, 4));
    utils.executeWithSecurity(options, newDevice, createInitialEntityHandlerNgsi1(deviceData, newDevice, callback));
}

/**
 * Updates the register of an existing device identified by the Id and Type in the Context Broker, and the internal
 * registry. It uses NGSIv1.
 *
 * The device id and type are required fields for a registration updated. Only the following attributes will be
 * updated: lazy, active and internalId. Any other change will be ignored. The registration for the lazy attributes
 * of the updated entity will be updated if existing, and created if not. If new active attributes are created,
 * the entity will be updated creating the new attributes.
 *
 * @param {Object} deviceObj                    Object with all the device information (mandatory).
 */
function updateRegisterDeviceNgsi1(deviceObj, entityInfoUpdated, callback) {
    if (!deviceObj.id || !deviceObj.type) {
        callback(new errors.MissingAttributes('Id or device missing'));
        return;
    }

    logger.debug(context, 'Update provisioned v1 device in Device Service');

    function combineWithNewDevice(newDevice, oldDevice, callback) {
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
            oldDevice.endpoint = newDevice.endpoint || oldDevice.endpoint;

            callback(null, oldDevice);
        } else {
            callback(new errors.DeviceNotFound(newDevice.id));
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

        function concatenateOldData(attributeArray, oldAttributeArray) {
            if (typeof oldAttributeArray !== 'undefined' && oldAttributeArray.length > 0) {
                attributeArray = attributeArray.concat(oldAttributeArray);
            }
            return attributeArray;
        }

        if (entityInfoUpdated) {
            deviceData.active = concatenateOldData(deviceData.active, oldDevice.active);
            deviceData.lazy = concatenateOldData(deviceData.lazy, oldDevice.lazy);
            deviceData.commands = concatenateOldData(deviceData.commands, oldDevice.commands);
            deviceData.staticAttributes = concatenateOldData(deviceData.staticAttributes, oldDevice.staticAttributes);
            if (oldDevice.name !== newDevice.name) {
                deviceData.name = newDevice.name;
            }
            if (oldDevice.type !== newDevice.type) {
                deviceData.type = newDevice.type;
            }
        }

        callback(null, deviceData, oldDevice);
    }

    async.waterfall(
        [
            apply(config.getRegistry().get, deviceObj.id, deviceObj.service, deviceObj.subservice),
            apply(extractDeviceDifference, deviceObj),
            createInitialEntityNgsi1,
            apply(combineWithNewDevice, deviceObj),
            apply(registrationUtils.sendRegistrations, false),
            apply(registrationUtils.processContextRegistration, deviceObj),
            config.getRegistry().update
        ],
        callback
    );
}

exports.createInitialEntity = createInitialEntityNgsi1;
exports.updateRegisterDevice = updateRegisterDeviceNgsi1;
