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
 */

'use strict';

var request = require('request'),
    statsService = require('./../stats/statsRegistry'),
    async = require('async'),
    apply = async.apply,
    errors = require('../../errors'),
    config = require('../../commonConfig'),
    constants = require('../../constants'),
    logger = require('logops'),
    security = require('./../common/securityService'),
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
            logger.debug(
                context,
                'Error found executing ' + operationName + ' action in Context Broker: %s', error);

            callback(error);
        } else if (body && body.orionError) {
            logger.debug(
                context,
                'Orion error found executing ' + operationName + ' action in Context Broker: %j', body.orionError);

            callback(new errors.BadRequest(body.orionError.details));
        } else if (response && body && response.statusCode === 200) {
            var errorField = ngsiParser.getErrorField(body);

            if (errorField) {
                logger.error(
                    context,
                    'Operation ' + operationName + ' error connecting to the Context Broker: %j', errorField);

                if (errorField.code && errorField.code === '404') {
                    callback(new errors.DeviceNotFound(entityName));
                } else {
                    callback(new errors.EntityGenericError(entityName, typeInformation.type, errorField));
                }
            } else {
                logger.debug(context, 'Value updated successfully');
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
 * Create the request object used to communicate with the Context Broker, adding security and service information.
 *
 * @param {String} url                  Path for the Context Broker operation.
 * @param {Object} typeInformation      Object containing information about the device: service, security, etc.
 * @param {String} token                If present, security information needed to access the CB.
 * @return {Object}                    Containing all the information of the request but the payload.c
 */
function createRequestObject(url, typeInformation, token) {
    var cbHost = 'http://' + config.getConfig().contextBroker.host + ':' + config.getConfig().contextBroker.port,
        options,
        headers = {
            'fiware-service': config.getConfig().service,
            'fiware-servicepath': config.getConfig().subservice,
            'X-Auth-Token': token
        };

    if (typeInformation) {
        if (typeInformation.service) {
            headers['fiware-service'] = typeInformation.service;
        }

        if (typeInformation.subservice) {
            headers['fiware-servicepath'] = typeInformation.subservice;
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

    return options;
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

function isTimestamped(payload) {
    for (var i in payload.contextElements[0].attributes) {
        if (payload.contextElements[0].attributes[i].name === constants.TIMESTAMP_ATTRIBUTE) {
            return true;
        }
    }

    return false;
}

function addTimestamp(payload) {
    var timestamp = {
            name: constants.TIMESTAMP_ATTRIBUTE,
            type: constants.TIMESTAMP_TYPE,
            value: (new Date()).toISOString()
        };

    function addMetadata(attribute) {
        if (!attribute.metadatas) {
            attribute.metadatas = [];
        }

        attribute.metadatas.push(timestamp);

        return attribute;
    }

    payload.contextElements[0].attributes.map(addMetadata);
    payload.contextElements[0].attributes.push(timestamp);

    return payload;
}

/**
 * Makes an update in the Device's entity in the context broker, with the values given in the 'attributes' array. This
 * array should comply to the NGSI's attribute format.
 *
 * @param {String} entityName         Name of the entity to register.
 * @param {Array} attributes        Attribute array containing the values to update.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
function sendUpdateValue(entityName, attributes, typeInformation, token, callback) {
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

    if (config.getConfig().appendMode) {
        payload.updateAction = 'APPEND';
    } else {
        payload.updateAction = 'UPDATE';
    }

    logger.debug(context, 'Updating device value in the Context Broker at [%s]', options.url);
    logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));

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

            if (config.getConfig().timestamp && !isTimestamped(options.json)) {
                options.json = addTimestamp(options.json);
            }

            request(options,
                generateNGSIOperationHandler('update', entityName, typeInformation, token, options, callback));
        }
    });
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
 * Launches an operation against the Context Broker, getting the security token in case the authorization sequence is
 * enabled. This method can be invoked with an externally added deviceInformation object to overwrite the information
 * on the configuration (for preregistered devices).
 *
 * @param {Function} operationFunction  Function to execute once the credentials and device information were retrieved.
 * @return {Function}                   The function that gets all the information wrapping the given operation.
 */
function executeWithDeviceInformation(operationFunction) {
    return function(entityName, resource, apikey, attributes, deviceInformation, callback) {
        config.getGroupRegistry().get(resource, apikey, function(error, deviceGroup) {
            var typeInformation;

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

            if (config.getConfig().authentication && config.getConfig().authentication.enabled) {
                if (typeInformation && typeInformation.trust) {
                    async.waterfall([
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
                    name: commandName + '_status',
                    type: 'Status',
                    value: status
                },
                {
                    name: commandName + '_result',
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
            attributes[1].type = commandInfo[0].type;

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

exports.update = executeWithDeviceInformation(sendUpdateValue);
exports.query = executeWithDeviceInformation(sendQueryValue);
exports.addUpdateMiddleware = addUpdateMiddleware;
exports.addQueryMiddleware = addQueryMiddleware;
exports.resetMiddlewares = resetMiddlewares;
exports.setCommandResult = setCommandResult;
