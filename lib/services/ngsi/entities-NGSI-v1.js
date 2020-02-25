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

'use strict';

var request = require('request'),
    statsService = require('./../stats/statsRegistry'),
    async = require('async'),
    apply = async.apply,
    alarms = require('../common/alarmManagement'),
    errors = require('../../errors'),
    utils = require('../northBound/restUtils'),
    config = require('../../commonConfig'),
    constants = require('../../constants'),
    moment = require('moment-timezone'),
    logger = require('logops'),
    context = {
        op: 'IoTAgentNGSI.Entities-v1'
    },
    ngsiUtils = require('./ngsiUtils');


/**
 * Generate an operation handler for NGSI-based operations (query and update). The handler takes care of identifiying
 * the errors and calling the appropriate callback with a success or a failure depending on how the operation ended.
 *
 * Most of the parameters are passed for debugging purposes mainly.
 *
 * @param {String} operationName        Name of the NGSI operation being performed.
 * @param {String} entityName           Name of the entity that was the target of the operation.
 * @param {Object} typeInformation      Information about the device the entity represents.
 * @param {String} token                Security token used to access the entity.
 * @param {Object} options              Object holding all the information about the HTTP request.

 * @return {Function}                  The generated handler.
 */
function generateNGSIOperationHandler(operationName, entityName, typeInformation, token, options, callback) {
    return function(error, response, body) {
        if (error) {
            logger.error(context, 'Error found executing ' + operationName + ' action in Context Broker: %s', error);

            alarms.raise(constants.ORION_ALARM, error);
            callback(error);
        } else if (body && body.orionError) {
            logger.debug(context, 'Orion error found executing ' + operationName + ' action in Context Broker: %j',
                body.orionError);

            callback(new errors.BadRequest(body.orionError.details));
        } else if (response && body && response.statusCode === 200) {
            var errorField = ngsiUtils.getErrorField(body);

            logger.debug(context,
                'Received the following request from the CB:\n\n%s\n\n', JSON.stringify(body, null, 4));

            if (errorField) {
                logger.error(context,
                    'Operation ' + operationName + ' error connecting to the Context Broker: %j', errorField);

                if (errorField.code && errorField.code === '404' &&
                    errorField.details.includes(typeInformation.type) ){
                    callback(new errors.DeviceNotFound(entityName));
                }
                else if (errorField.code && errorField.code === '404') {
                    callback(new errors.AttributeNotFound());
                } else {
                    callback(new errors.EntityGenericError(entityName, typeInformation.type, errorField));
                }
            } else {
                logger.debug(context, 'Value updated successfully');
                alarms.release(constants.ORION_ALARM);
                callback(null, body);
            }
        } else if (response && (response.statusCode === 403 || response.statusCode === 401)) {
            logger.debug(context, 'Access forbidden executing ' + operationName + ' operation');
            callback(new errors.AccessForbidden(
                token,
                options.headers['fiware-service'],
                options.headers['fiware-servicepath']));
        } else {
            logger.debug(context, 'Unknown error executing ' + operationName + ' operation');

            callback(new errors.EntityGenericError(entityName, typeInformation.type, {
                details: body
            }, response.statusCode));
        }
    };
}


function addTimestamp(payload, timezone) {

    var timestamp = {
            name: constants.TIMESTAMP_ATTRIBUTE,
            type: constants.TIMESTAMP_TYPE
        };

    if (!timezone) {
        timestamp.value = (new Date()).toISOString();
    } else {
        timestamp.value = moment().tz(timezone).format('YYYY-MM-DD[T]HH:mm:ss.SSSZ');
    }

    function addMetadata(attribute) {
        var timestampFound = false;

        if (!attribute.metadatas) {
            attribute.metadatas = [];
        }

        for (var i = 0; i < attribute.metadatas.length; i++) {
            if (attribute.metadatas[i].type === constants.TIMESTAMP_TYPE &&
                attribute.metadatas[i].name === constants.TIMESTAMP_ATTRIBUTE) {
                attribute.metadatas[i].value = timestamp.value;
                timestampFound = true;
                break;
            }
        }

        if (!timestampFound) {
            attribute.metadatas.push(timestamp);
        }

        return attribute;
    }

    payload.contextElements[0].attributes.map(addMetadata);
    payload.contextElements[0].attributes.push(timestamp);
    return payload;
}

/**
 * Makes a query to the Device's entity in the context broker using NGSIv1, with the list of
 * attributes given by the 'attributes' array.
 *
 * @param {String} entityName       Name of the entity to query.
 * @param {Array} attributes        Attribute array containing the names of the attributes to query.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
function sendQueryValueNgsi1(entityName, attributes, typeInformation, token, callback) {
    var options = ngsiUtils.createRequestObject('/v1/queryContext', typeInformation, token);

    if (!typeInformation || !typeInformation.type) {
        callback(new errors.TypeNotFound(null, entityName));
        return;
    }

    options.json = {
            entities: [
                {
                    type: typeInformation.type,
                    isPattern: 'false',
                    id: entityName
                }
            ],
            attributes: attributes
        };

    logger.debug(context, 'Querying values of the device in the Context Broker at [%s]', options.url);
    logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));


    request(options,
        generateNGSIOperationHandler('query', entityName, typeInformation, token, options,
            function(error, result) {
                if (error) {
                    callback(error);
                } else {
                    ngsiUtils.applyMiddlewares(ngsiUtils.queryMiddleware, result, typeInformation, callback);
                }
            }));
}

/**
 * Makes an update in the Device's entity in the context broker, with the values given in the 'attributes' array. This
 * array should comply to the NGSIv1's attribute format.
 *
 * @param {String} entityName       Name of the entity to register.
 * @param {Array} attributes        Attribute array containing the values to update.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
function sendUpdateValueNgsi1(entityName, attributes, typeInformation, token, callback) {
    var options = ngsiUtils.createRequestObject('/v1/updateContext', typeInformation, token),
        payload;



    if (typeInformation && typeInformation.staticAttributes) {
        attributes = attributes.concat(typeInformation.staticAttributes);
    }

    if (!typeInformation || !typeInformation.type) {
        callback(new errors.TypeNotFound(null, entityName));
        return;
    }

    payload = {
            contextElements: [
                {
                    type: typeInformation.type,
                    isPattern: 'false',
                    id: entityName,
                    attributes: attributes
                }
            ]
    };
    if ('autoprovision' in typeInformation &&
        /* jshint -W101 */
        typeInformation.autoprovision === undefined ? typeInformation.autoprovision === true : config.getConfig().appendMode === true) {
        payload.updateAction = 'APPEND';
    } else {
        payload.updateAction = 'UPDATE';
    }
    async.waterfall([
        apply(statsService.add, 'measureRequests', 1),
        apply(ngsiUtils.applyMiddlewares, ngsiUtils.updateMiddleware, payload, typeInformation)
    ], function(error, result) {
        if (error) {
            callback(error);
        } else {
            if (result) {
                options.json = result;
            } else {
                options.json = payload;
            }

            if ( ('timestamp' in typeInformation && typeInformation.timestamp !== undefined) ?
                typeInformation.timestamp : config.getConfig().timestamp) {
                if (!utils.isTimestamped(options.json)) {
                    options.json = addTimestamp(options.json, typeInformation.timezone);
                } else if (!utils.IsValidTimestamped(options.json)) {
                    logger.error(context, 'Invalid timestamp:%s', JSON.stringify(options.json));
                    callback(new errors.BadTimestamp(options.json));
                    return;
                }

            }

            logger.debug(context, 'Updating device value in the Context Broker at [%s]', options.url);
            logger.debug(context, 'Using the following NGSI-v1 request:\n\n%s\n\n', JSON.stringify(options, null, 4));

            //console.error(JSON.stringify(options.json, null, 4));


            request(options,
                generateNGSIOperationHandler('update', entityName, typeInformation, token, options, callback));
        }
    });
}


exports.sendQueryValue = sendQueryValueNgsi1;
exports.sendUpdateValue = sendUpdateValueNgsi1;
