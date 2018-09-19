/*
 * Copyright 2014 Telefonica Investigación y Desarrollo, S.A.U
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
 *
 * Modified by: Federico M. Facca - Martel Innovate
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */

'use strict';

var request = require('request'),
    statsService = require('./../stats/statsRegistry'),
    async = require('async'),
    apply = async.apply,
    intoTrans = require('../common/domain').intoTrans,
    alarms = require('../common/alarmManagement'),
    errors = require('../../errors'),
    utils = require('../northBound/restUtils'),
    config = require('../../commonConfig'),
    constants = require('../../constants'),
    logger = require('logops'),
    ngsiParser = require('./ngsiParser'),
    _ = require('underscore'),
    context = {
        op: 'IoTAgentNGSI.NGSIService'
    },
    updateMiddleware = [],
    queryMiddleware = [];

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
            var errorField = ngsiParser.getErrorField(body);

            logger.debug(context,
                'Received the following request from the CB:\n\n%s\n\n', JSON.stringify(body, null, 4));

            if (errorField) {
                logger.error(context,
                    'Operation ' + operationName + ' error connecting to the Context Broker: %j', errorField);

                if (errorField.code && errorField.code === '404') {
                    callback(new errors.DeviceNotFound(entityName));
                } else {
                    callback(new errors.EntityGenericError(entityName, typeInformation.type, errorField));
                }
            } else {
                logger.debug(context, 'Value updated successfully');
                alarms.release(constants.ORION_ALARM);
                callback(null, body);
            }
        } else if (response && response.statusCode === 403) {
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

/**
 * Generate an operation handler for NGSIv2-based operations (query and update). The handler takes care of identifiying
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
function generateNGSI2OperationHandler(operationName, entityName, typeInformation, token, options, callback) {
    return function(error, response, body) {
        if (error) {
            logger.error(context, 'Error found executing ' + operationName + ' action in Context Broker: %s', error);

            alarms.raise(constants.ORION_ALARM, error);
            callback(error);
        } else if (body && body.orionError) {
            logger.debug(context, 'Orion error found executing ' + operationName + ' action in Context Broker: %j',
                body.orionError);

            callback(new errors.BadRequest(body.orionError.details));
        } else if (response && operationName === 'update' && (response.statusCode === 204)) {
                logger.debug(context, 'Received the following response from the CB: Value updated successfully\n');
                alarms.release(constants.ORION_ALARM);
                callback(null, body);
        } else if (response && operationName === 'query' && body !== undefined && response.statusCode === 200) {
            logger.debug(context,
                'Received the following response from the CB:\n\n%s\n\n', JSON.stringify(body, null, 4));
                logger.debug(context, 'Value queried successfully');
                alarms.release(constants.ORION_ALARM);
                callback(null, body);
        } else if (response && operationName === 'query' && response.statusCode === 204) {
            logger.debug(context,
                'Received the following response from the CB:\n\n%s\n\n', JSON.stringify(body, null, 4));

            logger.error(context,
                'Operation ' + operationName + ' bad status code from the CB: 204.' +
                'A query operation must always return a body');
            callback(new errors.BadAnswer(response.statusCode, operationName));
        } else if (response && response.statusCode === 403) {
            logger.debug(context, 'Access forbidden executing ' + operationName + ' operation');
            callback(new errors.AccessForbidden(
                token,
                options.headers['fiware-service'],
                options.headers['fiware-servicepath']));
        } else if (response && body && response.statusCode === 404) {
            logger.debug(context,
                'Received the following response from the CB:\n\n%s\n\n', JSON.stringify(body, null, 4));

            logger.error(context,
                'Operation ' + operationName + ' error connecting to the Context Broker: %j', body);

            if (response.statusCode && response.statusCode === 404) {
                callback(new errors.DeviceNotFound(entityName));
            } else {
                callback(new errors.EntityGenericError(entityName, typeInformation.type, body));
            }
        } else {
            logger.debug(context, 'Unknown error executing ' + operationName + ' operation');
            if (! (body instanceof Array || body instanceof Object))
            {
                body = JSON.parse(body);
            }

            callback(new errors.EntityGenericError(entityName, typeInformation.type,
                body, response.statusCode));
        }
    };
}

/**
 * Create the request object used to communicate with the Context Broker, adding security and service information.
 *
 * @param {String} url                  Path for the Context Broker operation.
 * @param {Object} typeInformation      Object containing information about the device: service, security, etc.
 * @param {String} token                If present, security information needed to access the CB.
 * @return {Object}                    Containing all the information of the request but the payload.c
 */
function createRequestObject(url, typeInformation, token) {
    var cbHost = config.getConfig().contextBroker.url,
        options,
        serviceContext = {},
        headers = {
            'fiware-service': config.getConfig().service,
            'fiware-servicepath': config.getConfig().subservice
        };

    if (config.getConfig().authentication && config.getConfig().authentication.enabled) {
        headers[config.getConfig().authentication.header] = token;
    }

    if (typeInformation) {
        if (typeInformation.service) {
            headers['fiware-service'] = typeInformation.service;
            serviceContext.service = typeInformation.service;
        }

        if (typeInformation.subservice) {
            headers['fiware-servicepath'] = typeInformation.subservice;
            serviceContext.subservice = typeInformation.subservice;
        }

        if (typeInformation.cbHost) {
            cbHost = typeInformation.cbHost;
        }
    }

    options = {
        url: cbHost + url,
        method: 'POST',
        headers: headers
    };


    return intoTrans(serviceContext, function() {
        return options;
    })();
}

function applyMiddlewares(middlewareCollection, entity, typeInformation, callback) {
    function emptyMiddleware(callback) {
        callback(null, entity, typeInformation);
    }

    function endMiddleware(entity, typeInformation, callback) {
        callback(null, entity);
    }

    if (middlewareCollection && middlewareCollection.length > 0) {
        var middlewareList = _.clone(middlewareCollection);

        middlewareList.unshift(emptyMiddleware);
        middlewareList.push(endMiddleware);

        async.waterfall(middlewareList, callback);
    } else {
        callback(null, entity);
    }
}

function addTimestamp(payload) {
    var timestamp = {
            name: constants.TIMESTAMP_ATTRIBUTE,
            type: constants.TIMESTAMP_TYPE,
            value: (new Date()).toISOString()
        };

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

function addTimestampNgsi2(payload) {

    function addTimestampEntity(entity) {
        var timestamp = {
                type: constants.TIMESTAMP_TYPE_NGSI2,
                value: (new Date()).toISOString()
            };

        function addMetadata(attribute) {
            var timestampFound = false;

            if (!attribute.metadata) {
                attribute.metadata = {};
            }

            for (var i = 0; i < attribute.metadata.length; i++) {
                if (attribute.metadata[i] === constants.TIMESTAMP_ATTRIBUTE) {
                    if (attribute.metadata[constants.TIMESTAMP_ATTRIBUTE].type === constants.TIMESTAMP_TYPE_NGSI2 &&
                        attribute.metadata[constants.TIMESTAMP_ATTRIBUTE].value === timestamp.value) {
                            timestampFound = true;
                            break;
                        }
                }
            }

            if (!timestampFound) {
                attribute.metadata[constants.TIMESTAMP_ATTRIBUTE] = timestamp;
            }

            return attribute;
        }
        var keyCount = 0;
        for (var key in entity) {
            if (entity.hasOwnProperty(key) && key !== 'id' && key !== 'type') {
                addMetadata(entity[key]);
                keyCount += 1;
            }
        }
        // Add timestamp just to entity with attrs: multientity plugin could
        // create empty entities just with id and type.
        if (keyCount > 0) {
            entity[constants.TIMESTAMP_ATTRIBUTE] = timestamp;
        }

        return entity;
    }

    if (payload instanceof Array) {
        for (var i = 0; i < payload.length; i++) {
            if (!utils.isTimestampedNgsi2(payload[i])) {
                payload[i] = addTimestampEntity(payload[i]);
            }
        }

        return payload;
    } else {
        return addTimestampEntity(payload);
    }

}

/**
 * It casts attribute values which are reported using JSON native types
 *
 * @param      {String}  payload  The payload
 * @return     {String}           New payload where attributes's values are casted to the corresponding JSON types
 */
function castJsonNativeAttributes(payload) {

    /**
     * Determines if a value is of type float
     *
     * @param      {String}   value       Value to be analyzed
     * @return     {boolean}              True if float, False otherwise.
     */
    function isFloat(value) {
        return !isNaN(value) && value.toString().indexOf('.') !== -1;
    }

    if (!config.getConfig().autocast) {
        return payload;
    }

    for (var key in payload) {
        if (payload.hasOwnProperty(key) && payload[key].value &&
            payload[key].type && typeof(payload[key].value) === 'string') {
            if (payload[key].type === 'Number' && isFloat(payload[key].value)) {
                payload[key].value = Number.parseFloat(payload[key].value);
            } else if (payload[key].type === 'Number' && Number.parseInt(payload[key].value)) {
                payload[key].value = Number.parseInt(payload[key].value);
            }
            else if (payload[key].type === 'Boolean') {
                payload[key].value = (payload[key].value === 'true' || payload[key].value === '1');
            }
            else if (payload[key].type === 'None') {
                payload[key].value = null;
            }
            else if (payload[key].type === 'Array' || payload[key].type === 'Object') {
                try {
                    var parsedValue = JSON.parse(payload[key].value);
                    payload[key].value = parsedValue;
                } catch (e) {
                    logger.error(context, 'Bad attribute value type.' +
                        'Expecting JSON Array or JSON Object. Received:%s', payload[key].value);
                }
            }
        }
    }

    return payload;
}

/**
 * Makes an update in the Device's entity in the context broker, with the values given in the 'attributes' array. This
 * array should comply to the NGSIv2's attribute format.
 *
 * @param {String} entityName       Name of the entity to register.
 * @param {Array} attributes        Attribute array containing the values to update.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
function sendUpdateValueNgsi2(entityName, attributes, typeInformation, token, callback) {

    var payload = {};

    var options = createRequestObject(
        '/v2/entities/' + entityName + '/attrs',
        typeInformation,
        token);

    if (typeInformation && typeInformation.staticAttributes) {
        attributes = attributes.concat(typeInformation.staticAttributes);
    }

    if (!typeInformation || !typeInformation.type) {
        callback(new errors.TypeNotFound(null, entityName));
        return;
    }

    payload.id = entityName;
    payload.type = typeInformation.type;

    for (var i = 0; i < attributes.length; i++) {
        if (attributes[i].name && attributes[i].type) {
            payload[attributes[i].name] = {
                'value' : attributes[i].value,
                'type' : attributes[i].type,
                'metadata' : attributes[i].metadata
            };
        } else {
            callback(new errors.BadRequest(null, entityName));
            return;
        }
    }
    payload = castJsonNativeAttributes(payload);
    async.waterfall([
        apply(statsService.add, 'measureRequests', 1),
        apply(applyMiddlewares, updateMiddleware, payload, typeInformation)],
        function(error, result) {
        if (error) {
            callback(error);
        } else {
            if (result) {
                // The payload has been transformed by multientity plugin. It is not a JSON object but an Array.
                if (result instanceof Array) {
                    options = createRequestObject(
                        '/v2/op/update',
                        typeInformation,
                        token);

                    if ( (('timestamp' in typeInformation) ? typeInformation.timestamp : config.getConfig().timestamp) &&
                         ! utils.isTimestampedNgsi2(result)) {
                        result = addTimestampNgsi2(result);
                    }

                    options.json = {
                        actionType: 'APPEND',
                        entities: result
                    };
                } else {
                    delete result.id;
                    delete result.type;
                    options.json = result;
                    logger.debug(context, 'typeInformation: %j', typeInformation);
                    if ( (('timestamp' in typeInformation) ? typeInformation.timestamp : config.getConfig().timestamp) &&
                         ! utils.isTimestampedNgsi2(options.json)) {
                        options.json = addTimestampNgsi2(options.json);
                    }
                }
            } else {
                delete payload.id;
                delete payload.type;
                options.json = payload;
            }

            logger.debug(context, 'Updating device value in the Context Broker at [%s]', options.url);
            logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));

            request(options,
                generateNGSI2OperationHandler('update', entityName, typeInformation, token, options, callback));
        }
    });
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
    var options = createRequestObject('/v1/updateContext', typeInformation, token),
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

    if (config.getConfig().appendMode === true) {
        payload.updateAction = 'APPEND';
    } else {
        payload.updateAction = 'UPDATE';
    }

    async.waterfall([
        apply(statsService.add, 'measureRequests', 1),
        apply(applyMiddlewares, updateMiddleware, payload, typeInformation)
    ], function(error, result) {
        if (error) {
            callback(error);
        } else {
            if (result) {
                options.json = result;
            } else {
                options.json = payload;
            }

            if ((config.getConfig().timestamp || typeInformation.timestamp) &&
                !utils.isTimestamped(options.json)) {
                options.json = addTimestamp(options.json);
            }

            logger.debug(context, 'Updating device value in the Context Broker at [%s]', options.url);
            logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));

            request(options,
                generateNGSIOperationHandler('update', entityName, typeInformation, token, options, callback));
        }
    });
}

/**
 * Makes an update in the Device's entity in the context broker, with the values given in the 'attributes' array. This
 * array should comply to the NGSI's attribute format.
 *
 * @param {String} entityName       Name of the entity to register.
 * @param {Array} attributes        Attribute array containing the values to update.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
function sendUpdateValue(entityName, attributes, typeInformation, token, callback) {
    if (config.checkNgsi2()) {
        sendUpdateValueNgsi2(entityName, attributes, typeInformation, token, callback);
    } else {
        sendUpdateValueNgsi1(entityName, attributes, typeInformation, token, callback);
    }
}

/**
 * Makes a query to the Device's entity in the context broker using NGSIv2, with the list
 * of attributes given by the 'attributes' array.
 *
 * @param {String} entityName       Name of the entity to query.
 * @param {Array} attributes        Attribute array containing the names of the attributes to query.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
function sendQueryValueNgsi2(entityName, attributes, typeInformation, token, callback) {
    var url = '/v2/entities/' + entityName + '/attrs';

    if (attributes && attributes.length > 0) {
        var attributesQueryParam = '';

        for (var i = 0; i < attributes.length; i++) {
            attributesQueryParam = attributesQueryParam + attributes[i];
            if (i < attributes.length - 1) {
                attributesQueryParam = attributesQueryParam + ',';
            }
        }

        url = url + '?attrs=' + attributesQueryParam;
    }

    var options = createRequestObject(url, typeInformation, token);
    options.method = 'GET';
    options.json = true;

    if (!typeInformation || !typeInformation.type) {
        callback(new errors.TypeNotFound(null, entityName));
        return;
    }

    logger.debug(context, 'Querying values of the device in the Context Broker at [%s]', options.url);
    logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));


    request(options,
        generateNGSI2OperationHandler('query', entityName, typeInformation, token, options,
            function(error, result) {
                if (error) {
                    callback(error);
                } else {
                    applyMiddlewares(queryMiddleware, result, typeInformation, callback);
                }
            }));
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
    var options = createRequestObject('/v1/queryContext', typeInformation, token);

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
                    applyMiddlewares(queryMiddleware, result, typeInformation, callback);
                }
            }));
}

/**
 * Makes a query to the Device's entity in the context broker, with the list of attributes given by the 'attributes'
 * array.
 *
 * @param {String} entityName       Name of the entity to query.
 * @param {Array} attributes        Attribute array containing the names of the attributes to query.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
function sendQueryValue(entityName, attributes, typeInformation, token, callback) {
    if (config.checkNgsi2()) {
        sendQueryValueNgsi2(entityName, attributes, typeInformation, token, callback);
    } else {
        sendQueryValueNgsi1(entityName, attributes, typeInformation, token, callback);
    }
}

/**
 * Update the trust for a device or a deviceGroup depending on the source of the trust token.
 * Currently is a placeholder, but it is needed in case of Auth services which tokens have
 * expiration.
 *
 * @param {Object} deviceGroup        The deviceGroup where the trust token was stored. Null if stored in actual device.
 * @param {Object} deviceInformation  The device where the trust token was stored. Null if stored in deviceGroup.
 * @param {String} trust              The current trust token.
 * @param {Object} response           The response where the new token is stored.
 * @param {Function} callback         The callback function.
 */

function updateTrust(deviceGroup, deviceInformation, trust, response, callback) {
    callback(null, response);
}

/**
 * Launches an operation against the Context Broker, getting the security token in case the authorization sequence is
 * enabled. This method can be invoked with an externally added deviceInformation object to overwrite the information
 * on the configuration (for preregistered devices).
 *
 * @param {Function} operationFunction  Function to execute once the credentials and device information were retrieved.
 * @return {Function}                   The function that gets all the information wrapping the given operation.
 */
function executeWithDeviceInformation(operationFunction) {

    return function(entityName, type, apikey, attributes, deviceInformation, callback) {
        logger.debug(context, 'executeWithDeviceInfo entityName %s type %s apikey %s attributes %j deviceInformation %j', entityName, type, apikey, attributes, deviceInformation);
        config.getGroupRegistry().getType(type, function(error, deviceGroup) {
            var typeInformation;
            if (error) {
                logger.debug(context, 'error %j in get group device', error);
            }
            if (!callback) {
                callback = deviceInformation;

                if (deviceGroup) {
                    typeInformation = deviceGroup;
                } else {
                    typeInformation = config.getConfig().types[type];
                }
            } else {
                typeInformation = deviceInformation;
            }

            if (config.getConfig().authentication && config.getConfig().authentication.enabled) {
                var security = config.getSecurityService();
                if (typeInformation && typeInformation.trust) {
                    async.waterfall([
                        apply(security.auth, typeInformation.trust),
                        apply(updateTrust, deviceGroup, deviceInformation, typeInformation.trust),
                        apply(security.getToken, typeInformation.trust),
                        apply(operationFunction, entityName, attributes, typeInformation)
                    ], callback);
                } else {
                    callback(new errors.SecurityInformationMissing(typeInformation.type));
                }
            } else {
                operationFunction(entityName, attributes, typeInformation, null, callback);
            }
        });
    };
}

/**
 * Update the result of a command in the Context Broker. The result of the command has two components: the result
 * of the command itself will be represented with the sufix '_result' in the entity while the status is updated in the
 * attribute with the '_status' sufix.
 *
 * @param {String} entityName           Name of the entity holding the command.
 * @param {String} resource             Resource name of the endpoint the device is calling.
 * @param {String} apikey               Apikey the device is using to send the values.
 * @param {String} commandName          Name of the command whose result is being updated.
 * @param {String} commandResult        Result of the command in string format.
 * @param {Object} deviceInformation    Device information, including security and service information. (optional).
 */
function setCommandResult(entityName, resource, apikey, commandName,
                          commandResult, status, deviceInformation, callback) {

    config.getGroupRegistry().get(resource, apikey, function(error, deviceGroup) {
        var typeInformation,
            commandInfo,
            attributes = [
                {
                    name: commandName + constants.COMMAND_STATUS_SUFIX,
                    type: constants.COMMAND_STATUS,
                    value: status
                },
                {
                    name: commandName + constants.COMMAND_RESULT_SUFIX,
                    type: constants.COMMAND_RESULT,
                    value: commandResult
                }
            ];

        if (!callback) {
            callback = deviceInformation;

            if (deviceGroup) {
                typeInformation = deviceGroup;
            } else {
                typeInformation = config.getConfig().types[resource];
            }
        } else {
            typeInformation = deviceInformation;
        }

        if (!typeInformation.type) {
            if (deviceGroup) {
                typeInformation.type = deviceGroup.type;
            } else {
                typeInformation.type = resource;
            }
        }

        if (!typeInformation.service) {
            typeInformation.service = config.getConfig().service;
        }

        if (!typeInformation.subservice) {
            typeInformation.subservice = config.getConfig().subservice;
        }

        commandInfo = _.where(typeInformation.commands, {name: commandName});

        if (commandInfo.length === 1) {
            exports.update(
                entityName,
                resource,
                apikey,
                attributes,
                typeInformation,
                callback
            );
        } else {
            callback(new errors.CommandNotFound(commandName));
        }
    });
}

function addUpdateMiddleware(middleware) {
    updateMiddleware.push(middleware);
}

function addQueryMiddleware(middleware) {
    queryMiddleware.push(middleware);
}

function resetMiddlewares(callback) {
    updateMiddleware = [];
    queryMiddleware = [];

    callback();
}

exports.update = intoTrans(context, executeWithDeviceInformation)(sendUpdateValue);
exports.query = intoTrans(context, executeWithDeviceInformation)(sendQueryValue);
exports.addUpdateMiddleware = intoTrans(context, addUpdateMiddleware);
exports.addQueryMiddleware = intoTrans(context, addQueryMiddleware);
exports.resetMiddlewares = intoTrans(context, resetMiddlewares);
exports.setCommandResult = intoTrans(context, setCommandResult);
exports.castJsonNativeAttributes = castJsonNativeAttributes;
