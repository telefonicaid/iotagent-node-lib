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
const statsService = require('./../stats/statsRegistry');
const async = require('async');
const apply = async.apply;
const alarms = require('../common/alarmManagement');
const errors = require('../../errors');
const utils = require('../northBound/restUtils');
const config = require('../../commonConfig');
const constants = require('../../constants');
const moment = require('moment-timezone');
const NGSIUtils = require('./ngsiUtils');
const logger = require('logops');
const context = {
    op: 'IoTAgentNGSI.Entities-v2'
};
const _ = require('underscore');

/**
 * Amends an NGSIv2 Geoattribute from String to GeoJSON format
 *
 * @param      {Object}   attr       Attribute to be analyzed
 * @return     {Object}              GeoJSON version of the attribute
 */
function formatGeoAttrs(attr) {
    const obj = attr;
    if (attr.type) {
        switch (attr.type.toLowerCase()) {
            // GeoProperties
            case 'geo:json':
                // FIXME: #1012
                // case 'geoproperty':
                // case 'point':
                // case 'geo:point':
                obj.type = 'geo:json';
                obj.value = NGSIUtils.getLngLats('Point', attr.value);
                break;
            // FIXME: #1012
            // case 'linestring':
            // case 'geo:linestring':
            //     obj.type = 'geo:json';
            //     obj.value = NGSIUtils.getLngLats('LineString', attr.value);
            //     break;
            // case 'polygon':
            // case 'geo:polygon':
            //     obj.type = 'geo:json';
            //     obj.value = NGSIUtils.getLngLats('Polygon', attr.value);
            //     break;
            // case 'multipoint':
            // case 'geo:multipoint':
            //     obj.type = 'geo:json';
            //     obj.value = NGSIUtils.getLngLats('MultiPoint', attr.value);
            //     break;
            // case 'multilinestring':
            // case 'geo:multilinestring':
            //     obj.type = 'geo:json';
            //     obj.value = NGSIUtils.getLngLats('MultiLineString', attr.value);
            //     break;
            // case 'multipolygon':
            // case 'geo:multipolygon':
            //     obj.type = 'geo:json';
            //     obj.value = NGSIUtils.getLngLats('MultiPolygon', attr.value);
            //     break;
        }
    }
    return obj;
}

function addTimestampNgsi2(payload, timezone) {
    function addTimestampEntity(entity, timezone) {
        const timestamp = {
            type: constants.TIMESTAMP_TYPE_NGSI2
        };

        if (!timezone) {
            timestamp.value = new Date().toISOString();
        } else {
            timestamp.value = moment().tz(timezone).format('YYYY-MM-DD[T]HH:mm:ss.SSSZ');
        }

        function addMetadata(attribute) {
            let timestampFound = false;

            if (!attribute.metadata) {
                attribute.metadata = {};
            }

            for (let i = 0; i < attribute.metadata.length; i++) {
                if (attribute.metadata[i] === constants.TIMESTAMP_ATTRIBUTE) {
                    if (
                        attribute.metadata[constants.TIMESTAMP_ATTRIBUTE].type === constants.TIMESTAMP_TYPE_NGSI2 &&
                        attribute.metadata[constants.TIMESTAMP_ATTRIBUTE].value === timestamp.value
                    ) {
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
        let keyCount = 0;
        for (const key in entity) {
            /* eslint-disable-next-line  no-prototype-builtins */
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
        for (let i = 0; i < payload.length; i++) {
            if (!utils.isTimestampedNgsi2(payload[i])) {
                payload[i] = addTimestampEntity(payload[i], timezone);
            }
        }

        return payload;
    }
    return addTimestampEntity(payload, timezone);
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
    return function (error, response, body) {
        if (error) {
            logger.error(context, 'Error found executing ' + operationName + ' action in Context Broker: %s', error);

            alarms.raise(constants.ORION_ALARM, error);
            callback(error);
        } else if (body && body.orionError) {
            logger.debug(
                context,
                'Orion error found executing ' + operationName + ' action in Context Broker: %j',
                body.orionError
            );

            callback(new errors.BadRequest(body.orionError.details));
        } else if (response && operationName === 'update' && response.statusCode === 204) {
            logger.info(context, 'Received the following response from the CB: Value updated successfully\n');
            alarms.release(constants.ORION_ALARM);
            callback(null, body);
        } else if (response && operationName === 'query' && body !== undefined && response.statusCode === 200) {
            logger.debug(
                context,
                'Received the following response from the CB:\n\n%s\n\n',
                JSON.stringify(body, null, 4)
            );
            logger.debug(context, 'Value queried successfully');
            alarms.release(constants.ORION_ALARM);
            callback(null, body);
        } else if (response && operationName === 'query' && response.statusCode === 204) {
            logger.info(
                context,
                'Received the following response from the CB:\n\n%s\n\n',
                JSON.stringify(body, null, 4)
            );

            logger.error(
                context,
                'Operation ' +
                    operationName +
                    ' bad status code from the CB: 204.' +
                    'A query operation must always return a body'
            );
            callback(new errors.BadAnswer(response.statusCode, operationName));
        } else if (response && (response.statusCode === 403 || response.statusCode === 401)) {
            logger.debug(context, 'Access forbidden executing ' + operationName + ' operation');
            callback(
                new errors.AccessForbidden(
                    token,
                    options.headers['fiware-service'],
                    options.headers['fiware-servicepath']
                )
            );
        } else if (response && body && response.statusCode === 404) {
            logger.info(
                context,
                'Received the following response from the CB:\n\n%s\n\n',
                JSON.stringify(body, null, 4)
            );

            logger.error(context, 'Operation ' + operationName + ' error connecting to the Context Broker: %j', body);

            let errorField = body.error;
            if (body.description) {
                errorField += ':' + body.description;
            }

            if (errorField !== undefined) {
                callback(new errors.DeviceNotFound(entityName));
            } else {
                callback(new errors.EntityGenericError(entityName, typeInformation.type, body));
            }
        } else {
            logger.debug(context, 'Unknown error executing ' + operationName + ' operation');
            if (!(body instanceof Array || body instanceof Object)) {
                body = JSON.parse(body);
            }

            callback(new errors.EntityGenericError(entityName, typeInformation.type, body, response.statusCode));
        }
    };
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
    let url = '/v2/entities/' + entityName + '/attrs';

    if (attributes && attributes.length > 0) {
        let attributesQueryParam = '';

        for (let i = 0; i < attributes.length; i++) {
            attributesQueryParam = attributesQueryParam + attributes[i];
            if (i < attributes.length - 1) {
                attributesQueryParam = attributesQueryParam + ',';
            }
        }

        url = url + '?attrs=' + attributesQueryParam;
    }

    if (typeInformation.type) {
        if (attributes && attributes.length > 0) {
            url += '&type=' + typeInformation.type;
        } else {
            url += '?type=' + typeInformation.type;
        }
    }

    const options = NGSIUtils.createRequestObject(url, typeInformation, token);
    options.method = 'GET';

    if (!typeInformation || !typeInformation.type) {
        callback(new errors.TypeNotFound(null, entityName));
        return;
    }

    logger.debug(context, 'Querying values of the device in the Context Broker at [%s]', options.url);
    logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));

    request(
        options,
        generateNGSI2OperationHandler('query', entityName, typeInformation, token, options, function (error, result) {
            if (error) {
                callback(error);
            } else {
                NGSIUtils.applyMiddlewares(NGSIUtils.queryMiddleware, result, typeInformation, callback);
            }
        })
    );
}

/**
 * Remove id, type and any hidden attrs after processing
 *
 * @param {Object} enities           Unprocessed entities
 * @param {Object} typeInformation  Configuration information for the device.
 */
function removeHiddenAttrsFromMultiEntity(entities, typeInformation) {
    if (typeInformation.explicitAttrs) {
        const explicitAttrsList = ['type', 'id'];
        if (typeInformation.timestamp) {
            explicitAttrsList.push(constants.TIMESTAMP_ATTRIBUTE);
        }

        if (typeInformation.active) {
            typeInformation.active.forEach((attr) => {
                explicitAttrsList.push(attr.name);
            });
        }
        if (typeInformation.staticAttributes) {
            typeInformation.staticAttributes.forEach((attr) => {
                explicitAttrsList.push(attr.name);
            });
        }
        entities.forEach((entity) => {
            const hidden = _.difference(_.keys(entity), explicitAttrsList);
            hidden.forEach((attr) => {
                delete entity[attr];
            });
        });
    }
    return entities;
}
/**
 * Remove id, type and any hidden attrs after processing
 *
 * @param {Object} result           An Unprocessed entity
 * @param {Object} typeInformation  Configuration information for the device.
 */
function removeHiddenAttrs(result, typeInformation) {
    delete result.id;
    delete result.type;

    if (typeInformation.explicitAttrs) {
        const explicitAttrsList = [];
        if (typeInformation.timestamp) {
            explicitAttrsList.push(constants.TIMESTAMP_ATTRIBUTE);
        }
        if (typeInformation.active) {
            typeInformation.active.forEach((attr) => {
                explicitAttrsList.push(attr.name);
            });
        }
        if (typeInformation.staticAttributes) {
            typeInformation.staticAttributes.forEach((attr) => {
                explicitAttrsList.push(attr.name);
            });
        }
        const hidden = _.difference(_.keys(result), explicitAttrsList);
        hidden.forEach((attr) => {
            delete result[attr];
        });
    }
    return result;
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
    let payload = {};

    let url = '/v2/entities/' + entityName + '/attrs';

    if (typeInformation.type) {
        url += '?type=' + typeInformation.type;
    }

    let options = NGSIUtils.createRequestObject(url, typeInformation, token);

    if (typeInformation && typeInformation.staticAttributes) {
        attributes = attributes.concat(typeInformation.staticAttributes);
    }

    if (!typeInformation || !typeInformation.type) {
        callback(new errors.TypeNotFound(null, entityName));
        return;
    }

    for (let i = 0; i < attributes.length; i++) {
        if (attributes[i].name && attributes[i].type) {
            payload[attributes[i].name] = {
                value: attributes[i].value,
                type: attributes[i].type
            };
            const metadata = NGSIUtils.getMetaData(typeInformation, attributes[i].name, attributes[i].metadata);
            if (metadata) {
                payload[attributes[i].name].metadata = metadata;
            }
        } else {
            callback(new errors.BadRequest(null, entityName));
            return;
        }
    }
    //overwritte if id or type missnamed atributes reach this point
    payload.id = entityName;
    payload.type = typeInformation.type;
    payload = NGSIUtils.castJsonNativeAttributes(payload);
    async.waterfall(
        [
            apply(statsService.add, 'measureRequests', 1),
            apply(NGSIUtils.applyMiddlewares, NGSIUtils.updateMiddleware, payload, typeInformation)
        ],
        function (error, result) {
            if (error) {
                callback(error);
            } else {
                if (result) {
                    // The payload has been transformed by multientity plugin. It is not a JSON object but an Array.
                    if (result instanceof Array) {
                        options = NGSIUtils.createRequestObject('/v2/op/update', typeInformation, token);

                        if (
                            'timestamp' in typeInformation && typeInformation.timestamp !== undefined
                                ? typeInformation.timestamp
                                : config.getConfig().timestamp
                        ) {
                            // jshint maxdepth:5
                            if (!utils.isTimestampedNgsi2(result)) {
                                result = addTimestampNgsi2(result, typeInformation.timezone);
                                // jshint maxdepth:5
                            } else if (!utils.IsValidTimestampedNgsi2(result)) {
                                logger.error(context, 'Invalid timestamp:%s', JSON.stringify(result));
                                callback(new errors.BadTimestamp(result));
                                return;
                            }
                        }
                        options.json = {
                            actionType: 'append',
                            entities: removeHiddenAttrsFromMultiEntity(result, typeInformation)
                        };
                        if (config.getConfig().appendMode === true) {
                            options.json.actionType = 'append';
                        } else {
                            options.json.actionType = 'update';
                        }
                    } else {
                        options.json = removeHiddenAttrs(result, typeInformation);
                        logger.debug(context, 'typeInformation: %j', typeInformation);
                        if (
                            'timestamp' in typeInformation && typeInformation.timestamp !== undefined
                                ? typeInformation.timestamp
                                : config.getConfig().timestamp
                        ) {
                            if (!utils.isTimestampedNgsi2(options.json)) {
                                options.json = addTimestampNgsi2(options.json, typeInformation.timezone);
                            } else if (!utils.IsValidTimestampedNgsi2(options.json)) {
                                logger.error(context, 'Invalid timestamp:%s', JSON.stringify(options.json));
                                callback(new errors.BadTimestamp(options.json));
                                return;
                            }
                        }
                        if (config.getConfig().appendMode === true) {
                            options.method = 'POST';
                        } else {
                            options.method = 'PATCH';
                        }
                    }
                } else {
                    delete payload.id;
                    delete payload.type;
                    options.json = payload;
                }
                // Purge object_id from entities before sent to CB
                // object_id was added by createNgsi2Entity to allow multientity
                // with duplicate attribute names.

                //some entities may be empty if they had only wrong attributes id-type
                //we filter the array
                if (options.json.entities) {
                    options.json.entities = options.json.entities.filter((value) => Object.keys(value).length > 0);
                }

                let att;
                if (options.json.entities) {
                    for (let entity = 0; entity < options.json.entities.length; entity++) {
                        for (att in options.json.entities[entity]) {
                            /*jshint camelcase: false */
                            if (options.json.entities[entity][att].object_id) {
                                /*jshint camelcase: false */
                                delete options.json.entities[entity][att].object_id;
                            }
                            if (options.json.entities[entity][att].multi) {
                                delete options.json.entities[entity][att].multi;
                            }
                            if (options.json.entities[entity][att].name) {
                                delete options.json.entities[entity][att].name;
                            }

                            try {
                                // Format any GeoJSON attrs properly
                                options.json.entities[entity][att] = formatGeoAttrs(options.json.entities[entity][att]);
                            } catch (error) {
                                return callback(new errors.BadGeocoordinates(JSON.stringify(options.json)));
                            }
                        }
                    }
                } else {
                    for (att in options.json) {
                        /*jshint camelcase: false */
                        if (options.json[att].object_id) {
                            /*jshint camelcase: false */
                            delete options.json[att].object_id;
                        }
                        if (options.json[att].multi) {
                            delete options.json[att].multi;
                        }
                        if (options.json[att].name) {
                            delete options[att].name;
                        }

                        try {
                            // Format any GeoJSON attrs properly
                            options.json[att] = formatGeoAttrs(options.json[att]);
                        } catch (error) {
                            return callback(new errors.BadGeocoordinates(JSON.stringify(options.json)));
                        }
                    }
                }

                // Prevent to update an entity with an empty payload
                if (Object.keys(options.json).length > 0) {
                    logger.debug(context, 'Updating device value in the Context Broker at [%s]', options.url);
                    logger.debug(
                        context,
                        'Using the following NGSI v2 request:\n\n%s\n\n',
                        JSON.stringify(options, null, 4)
                    );

                    request(
                        options,
                        generateNGSI2OperationHandler('update', entityName, typeInformation, token, options, callback)
                    );
                } else {
                    logger.debug(
                        context,
                        'Not updating device value in the Context Broker at [%s] due to empty payload \n\n[%s]\n\n',
                        options.url,
                        JSON.stringify(options, null, 4)
                    );
                    callback(null);
                }
            }
        }
    );
}

exports.sendQueryValue = sendQueryValueNgsi2;
exports.sendUpdateValue = sendUpdateValueNgsi2;
exports.addTimestamp = addTimestampNgsi2;
exports.formatGeoAttrs = formatGeoAttrs;
