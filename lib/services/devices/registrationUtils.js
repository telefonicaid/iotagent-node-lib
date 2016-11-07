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
    errors = require('../../errors'),
    logger = require('logops'),
    _ = require('underscore'),
    intoTrans = require('../common/domain').intoTrans,
    config = require('../../commonConfig'),
    ngsiParser = require('./../ngsi/ngsiParser'),
    context = {
        op: 'IoTAgentNGSI.DeviceService'
    };


/**
 * Generates a handler for the registration requests that checks all the possible errors derived from the registration.
 * The parameter information is needed in order to fulfill error information.
 *
 * @param {Boolen} unregister       Indicates whether this registration is an unregistration or register.
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 * @return {Function}              The generated handler.
 */
function createRegistrationHandler(unregister, deviceData, callback) {
    return function handleRegistrationResponse(error, response, body) {
        if (error) {
            logger.error(context, 'ORION-002: Connection error sending registrations to the Context Broker: %s', error);
            callback(error);
        } else if (response && body && response.statusCode === 200) {
            var errorField = ngsiParser.getErrorField(body);

            if (errorField) {
                logger.error(context, 'Registration error connecting to the Context Broker: %j', errorField);
                callback(new errors.BadRequest(JSON.stringify(errorField)));
            } else {
                logger.debug(context, 'Registration success.');
                callback(null, body);
            }
        } else {
            var errorObj;

            logger.error(context, 'ORION-003: Protocol error connecting to the Context Broker: %j', errorObj);

            if (unregister) {
                errorObj = new errors.UnregistrationError(deviceData.id, deviceData.type);
            } else {
                errorObj = new errors.RegistrationError(deviceData.id, deviceData.type);
            }

            callback(errorObj);
        }
    };
}

/**
 * Sends a Context Provider registration or unregistration request to the Context Broker. As registrations cannot be
 * removed, an unregistration consists of an update of the existent registration to make reduce its duration to
 * 1 second.
 *
 * The entity type, entity name and lazy attributes list are needed in order to send the registration:
 *
 * @param {Boolen} unregister       Indicates whether this registration is an unregistration or register.
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 */
function sendRegistrations(unregister, deviceData, callback) {
    var options = {
        url: 'http://' + config.getConfig().contextBroker.host + ':' +
        config.getConfig().contextBroker.port + '/NGSI9/registerContext',
        method: 'POST',
        json: {
            contextRegistrations: [
                {
                    entities: [
                        {
                            type: deviceData.type,
                            isPattern: 'false',
                            id: String(deviceData.name)
                        }
                    ],
                    attributes: [],
                    providingApplication: config.getConfig().providerUrl
                }
            ],
            duration: (unregister) ? 'PT1S' : config.getConfig().deviceRegistrationDuration
        },
        headers: {
            'fiware-service': deviceData.service,
            'fiware-servicepath': deviceData.subservice
        }
    };

    function formatAttributes(originalVector) {
        var attributeList = [];

        if (originalVector && originalVector.length) {
            for (var i = 0; i < originalVector.length; i++) {
                attributeList.push({
                    name: originalVector[i].name,
                    type: originalVector[i].type,
                    isDomain: 'false'
                });
            }
        }

        return attributeList;
    }

    function mergeWithSameName(old, current) {
        var keys = _.pluck(old, 'name');

        if (keys.indexOf(current.name) < 0) {
            old.push(current);
        }

        return old;
    }

    if (deviceData.registrationId) {
        options.json.registrationId = deviceData.registrationId;
    }

    options.json.contextRegistrations[0].attributes = options.json.contextRegistrations[0].attributes.concat(
            formatAttributes(deviceData.lazy),
            formatAttributes(deviceData.commands)
        ).reduce(mergeWithSameName, []);

    if (options.json.contextRegistrations[0].attributes.length === 0) {
        logger.debug(context, 'No Context Provider registrations found for unregister');
        callback(null, deviceData);
    } else {
        logger.debug(context, 'Sending device registrations to Context Broker at [%s]', options.url);
        logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));

        request(options, createRegistrationHandler(unregister, deviceData, callback));
    }
}

exports.sendRegistrations = intoTrans(context, sendRegistrations);
exports.createRegistrationHandler = intoTrans(context, createRegistrationHandler);
