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
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 */

/*jshint unused:false*/
const async = require('async');
const errors = require('../../errors');
const logger = require('logops');
const intoTrans = require('../common/domain').intoTrans;
const context = {
    op: 'IoTAgentNGSI.NGSIUtils'
};
const _ = require('underscore');
const config = require('../../commonConfig');
const updateMiddleware = [];
const queryMiddleware = [];
/**
 * Determines if a value is of type float
 *
 * @param      {String}   value       Value to be analyzed
 * @return     {boolean}              True if float, False otherwise.
 */
function isFloat(value) {
    return !isNaN(value) && value.toString().indexOf('.') !== -1;
}

/**
 * It casts attribute values which are reported using JSON native types
 *
 * @param      {String}  payload  The payload
 * @return     {String}           New payload where attributes's values are casted to the corresponding JSON types
 */
function castJsonNativeAttributes(payload) {
    if (!config.getConfig().autocast) {
        return payload;
    }

    for (const key in payload) {
        if (
            payload.hasOwnProperty(key) &&
            payload[key].value &&
            payload[key].type &&
            typeof payload[key].value === 'string'
        ) {
            if (payload[key].type === 'Number' && isFloat(payload[key].value)) {
                payload[key].value = Number.parseFloat(payload[key].value);
            } else if (payload[key].type === 'Number' && Number.parseInt(payload[key].value)) {
                payload[key].value = Number.parseInt(payload[key].value);
            } else if (payload[key].type === 'Boolean') {
                payload[key].value = payload[key].value === 'true' || payload[key].value === '1';
            } else if (payload[key].type === 'None') {
                payload[key].value = null;
            } else if (payload[key].type === 'Array' || payload[key].type === 'Object') {
                try {
                    const parsedValue = JSON.parse(payload[key].value);
                    payload[key].value = parsedValue;
                } catch (e) {
                    logger.error(
                        context,
                        'Bad attribute value type.' + 'Expecting JSON Array or JSON Object. Received:%s',
                        payload[key].value
                    );
                }
            }
        }
    }
    return payload;
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
    let cbHost = config.getConfig().contextBroker.url;
    let options;
    const serviceContext = {};
    const headers = {
        'fiware-service': config.getConfig().service,
        'fiware-servicepath': config.getConfig().subservice
    };

    if (config.getConfig().authentication && config.getConfig().authentication.enabled) {
        headers[config.getConfig().authentication.header] = token;
    }
    logger.debug(context, 'typeInformation %j', typeInformation);
    if (typeInformation) {
        if (typeInformation.service) {
            headers['fiware-service'] = typeInformation.service;
            serviceContext.service = typeInformation.service;
        }

        if (typeInformation.subservice) {
            headers['fiware-servicepath'] = typeInformation.subservice;
            serviceContext.subservice = typeInformation.subservice;
        }

        if (typeInformation.cbHost && typeInformation.cbHost.indexOf('://') !== -1) {
            cbHost = typeInformation.cbHost;
        } else if (typeInformation.cbHost && typeInformation.cbHost.indexOf('://') === -1) {
            cbHost = 'http://' + typeInformation.cbHost;
        }
    }

    if (config.checkNgsiLD()) {
        headers['Content-Type'] = 'application/ld+json';
        headers['NGSILD-Tenant'] = headers['fiware-service'];
        headers['NGSILD-Path'] = headers['fiware-servicepath'];
    }

    options = {
        url: cbHost + url,
        method: 'POST',
        headers
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
        const middlewareList = _.clone(middlewareCollection);

        middlewareList.unshift(emptyMiddleware);
        middlewareList.push(endMiddleware);

        async.waterfall(middlewareList, callback);
    } else {
        callback(null, entity);
    }
}

function getMetaData(typeInformation, name, metadata) {
    if (metadata) {
        return metadata;
    }

    let i;
    if (typeInformation.active) {
        for (i = 0; i < typeInformation.active.length; i++) {
            /* jshint camelcase: false */
            if (name === typeInformation.active[i].object_id) {
                return typeInformation.active[i].metadata;
            }
        }
    }
    if (typeInformation.staticAttributes) {
        for (i = 0; i < typeInformation.staticAttributes.length; i++) {
            if (name === typeInformation.staticAttributes[i].name) {
                return typeInformation.staticAttributes[i].metadata;
            }
        }
    }
    return undefined;
}

/**
 * Given a NGSI Body, determines whether it contains any NGSI error.
 *
 * @param {String} body             String representing a NGSI body in JSON format.
 * @return {Number|*}
 */
function getErrorField(body) {
    let errorField = body.errorCode || body.orionError;

    if (body && body.contextResponses) {
        for (const i in body.contextResponses) {
            if (body.contextResponses[i].statusCode && body.contextResponses[i].statusCode.code !== '200') {
                errorField = body.contextResponses[i].statusCode;
            }
        }
    }

    return errorField;
}

exports.getErrorField = intoTrans(context, getErrorField);
exports.createRequestObject = createRequestObject;
exports.applyMiddlewares = applyMiddlewares;
exports.getMetaData = getMetaData;
exports.castJsonNativeAttributes = castJsonNativeAttributes;
exports.isFloat = isFloat;
exports.updateMiddleware = updateMiddleware;
exports.queryMiddleware = queryMiddleware;
