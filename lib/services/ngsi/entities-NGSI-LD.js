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
const jexlParser = require('../../plugins/jexlParser');
const moment = require('moment-timezone');
const logger = require('logops');
const _ = require('underscore');
const context = {
    op: 'IoTAgentNGSI.Entities-LD'
};
const NGSIv2 = require('./entities-NGSI-v2');
const NGSIUtils = require('./ngsiUtils');

const NGSI_LD_URN = 'urn:ngsi-ld:';

/**
 * Amends an NGSIv2 attribute to NGSI-LD format
 * All native JSON types are respected and cast as Property values
 * Relationships must be give the type relationship
 *
 * @param      {String}   attr       Attribute to be analyzed
 * @return     {Object}              an object containing the attribute in NGSI-LD
 *                                   format
 */

function convertNGSIv2ToLD(attr) {
    // eslint eqeqeq - deliberate double equals to include undefined.
    if (attr.value == null || Number.isNaN(attr.value)) {
        return undefined;
    }
    let obj = { type: 'Property', value: attr.value };

    switch (attr.type.toLowerCase()) {
        // Properties
        case 'property':
        case 'string':
        case 'text':
        case 'textunrestricted':
            break;

        // Other Native JSON Types
        case 'boolean':
            obj.value = !!attr.value;
            break;
        case 'float':
            if (isNaN(attr.value)) {
                obj = undefined;
            } else {
                obj.value = Number.parseFloat(attr.value);
            }
            break;
        case 'integer':
            if (isNaN(attr.value)) {
                obj = undefined;
            } else {
                obj.value = Number.parseInt(attr.value);
            }
            break;
        case 'number':
            if (isNaN(attr.value)) {
                obj = undefined;
            } else if (NGSIUtils.isFloat(attr.value)) {
                obj.value = Number.parseFloat(attr.value);
            } else {
                obj.value = Number.parseInt(attr.value);
            }
            break;

        // Temporal Properties
        case 'datetime':
            obj.value = {
                '@type': 'DateTime',
                '@value': moment.tz(attr.value, 'Etc/UTC').toISOString()
            };
            break;
        case 'date':
            obj.value = {
                '@type': 'Date',
                '@value': moment.tz(attr.value, 'Etc/UTC').format(moment.HTML5_FMT.DATE)
            };
            break;
        case 'time':
            obj.value = {
                '@type': 'Time',
                '@value': moment.tz(attr.value, 'Etc/UTC').format(moment.HTML5_FMT.TIME_SECONDS)
            };
            break;

        // GeoProperties
        case 'geoproperty':
        case 'point':
        case 'geo:point':
        case 'geo:json':
            obj.type = 'GeoProperty';
            obj.value = NGSIUtils.getLngLats('Point', attr.value);
            break;
        case 'linestring':
        case 'geo:linestring':
            obj.type = 'GeoProperty';
            obj.value = NGSIUtils.getLngLats('LineString', attr.value);
            break;
        case 'polygon':
        case 'geo:polygon':
            obj.type = 'GeoProperty';
            obj.value = NGSIUtils.getLngLats('Polygon', attr.value);
            break;
        case 'multipoint':
        case 'geo:multipoint':
            obj.type = 'GeoProperty';
            obj.value = NGSIUtils.getLngLats('MultiPoint', attr.value);
            break;
        case 'multilinestring':
        case 'geo:multilinestring':
            obj.type = 'GeoProperty';
            obj.value = NGSIUtils.getLngLats('MultiLineString', attr.value);
            break;
        case 'multipolygon':
        case 'geo:multipolygon':
            obj.type = 'GeoProperty';
            obj.value = NGSIUtils.getLngLats('MultiPolygon', attr.value);
            break;

        // Relationships
        case 'relationship':
            obj.type = 'Relationship';
            obj.object = attr.value;
            delete obj.value;
            break;

        default:
            obj.value = { '@type': attr.type, '@value': attr.value };
    }

    if (attr.metadata) {
        let timestamp;
        Object.keys(attr.metadata).forEach(function (key) {
            switch (key) {
                case constants.TIMESTAMP_ATTRIBUTE:
                    timestamp = attr.metadata[key].value;
                    if (timestamp === constants.ATTRIBUTE_DEFAULT || !moment(timestamp).isValid()) {
                        obj.observedAt = constants.DATETIME_DEFAULT;
                    } else {
                        obj.observedAt = moment.tz(timestamp, 'Etc/UTC').toISOString();
                    }
                    break;
                case 'unitCode':
                    obj.unitCode = attr.metadata[key].value;
                    break;
                default:
                    obj[key] = convertNGSIv2ToLD(attr.metadata[key]);
            }
        });
        delete obj.TimeInstant;
    }
    return obj;
}

/**
 * Amends an NGSIv2 payload to NGSI-LD format
 *
 * @param      {Object}   value       JSON to be converted
 * @return     {Object}               NGSI-LD payload
 */

function formatAsNGSILD(json) {
    const obj = { '@context': config.getConfig().contextBroker.jsonLdContext };
    let id;
    Object.keys(json).forEach(function (key) {
        switch (key) {
            case 'id':
                id = json[key];
                obj[key] = id;
                if (!id.startsWith(NGSI_LD_URN)) {
                    obj[key] = NGSI_LD_URN + json.type + ':' + id;
                    logger.debug(context, 'Amending id to a valid URN: %s', obj[key]);
                }
                break;
            case 'type':
                obj[key] = json[key];
                break;
            case constants.TIMESTAMP_ATTRIBUTE:
                // Timestamp should not be added as a root
                // element for NSGI-LD.
                break;
            default:
                obj[key] = convertNGSIv2ToLD(json[key]);
        }
    });

    delete obj.TimeInstant;
    return obj;
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
function generateNGSILDOperationHandler(operationName, entityName, typeInformation, token, options, callback) {
    return function (error, response, body) {
        const bodyAsString = body ? JSON.stringify(body, null, 4) : '';

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
        } else if (
            response &&
            operationName === 'update' &&
            (response.statusCode === 200 || response.statusCode === 204)
        ) {
            logger.info(context, 'Received the following response from the CB: Value updated successfully\n');
            alarms.release(constants.ORION_ALARM);
            callback(null, body);
        } else if (response && operationName === 'query' && body !== undefined && response.statusCode === 200) {
            logger.info(context, 'Received the following response from the CB:\n\n%s\n\n', bodyAsString);
            logger.debug(context, 'Value queried successfully');
            alarms.release(constants.ORION_ALARM);
            callback(null, body);
        } else if (response && operationName === 'query' && response.statusCode === 204) {
            logger.info(context, 'Received the following response from the CB:\n\n%s\n\n', bodyAsString);

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
            logger.info(context, 'Received the following response from the CB:\n\n%s\n\n', bodyAsString);
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
 * Makes a query to the Device's entity in the context broker using NGSI-LD, with the list
 * of attributes given by the 'attributes' array.
 *
 * @param {String} entityName       Name of the entity to query.
 * @param {Array} attributes        Attribute array containing the names of the attributes to query.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
function sendQueryValueNgsiLD(entityName, attributes, typeInformation, token, callback) {
    let url = '/ngsi-ld/v1/entities/urn:ngsi-ld:' + typeInformation.type + ':' + entityName;

    if (attributes && attributes.length > 0) {
        url = url + '?attrs=' + attributes.join(',');
    }

    const options = NGSIUtils.createRequestObject(url, typeInformation, token);
    options.method = 'GET';
    options.json = true;

    if (!typeInformation || !typeInformation.type) {
        callback(new errors.TypeNotFound(null, entityName));
        return;
    }

    logger.debug(context, 'Querying values of the device in the Context Broker at [%s]', options.url);
    logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));

    request(
        options,
        generateNGSILDOperationHandler('query', entityName, typeInformation, token, options, function (error, result) {
            if (error) {
                callback(error);
            } else {
                NGSIUtils.applyMiddlewares(NGSIUtils.queryMiddleware, result, typeInformation, callback);
            }
        })
    );
}

/**
 * Adds any linked data items to the NGSI-LD payload for the context broker.
 * For example a Building entity linked to a temperature gauge Device will
 * also be updated as measures are received to update the Device Entity.
 *
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {Object} json             Payload to send to the context broker
 */
function addLinkedEntities(typeInformation, json) {
    // use the supplied type if possible, but fallback to reading the
    // type from the id of the entity.
    function getEntityType(id, target) {
        if (target.type) {
            return target.type;
        }
        let calculatedType = id.replace(NGSI_LD_URN, '');
        const n = calculatedType.indexOf(':');
        calculatedType = calculatedType.substring(0, n !== -1 ? n : calculatedType.length);
        logger.debug(context, 'Guessing linked type from %s as no type attribute found', id);
        return calculatedType;
    }
    const linkedTypeInfo = {};
    if (typeInformation.staticAttributes) {
        typeInformation.staticAttributes.forEach((item) => {
            if (item.link) {
                linkedTypeInfo[item.name] = item.link;
            }
        });
    }

    Object.keys(linkedTypeInfo).forEach((sourceAttr) => {
        const sourceAttribute = json[0][sourceAttr];
        if (sourceAttribute) {
            const linkInfo = linkedTypeInfo[sourceAttr];
            const linkName = linkInfo.name || 'providedBy';
            const linkedEntity = {
                '@context': config.getConfig().contextBroker.jsonLdContext,
                id: sourceAttribute.object || sourceAttribute.value
            };
            linkedEntity.type = getEntityType(linkedEntity.id, linkInfo);
            linkInfo.attributes.forEach((attr) => {
                if (json[0][attr]) {
                    linkedEntity[attr] = json[0][attr];
                    linkedEntity[attr][linkName] = { type: 'Relationship', object: json[0].id };
                }
            });
            json.push(linkedEntity);
        }
    });
}

/**
 * Remove id, type and any hidden attrs after processing
 *
 * @param {Object} enities           Unprocessed entities
 * @param {Object} typeInformation  Configuration information for the device.
 */
function removeHiddenAttrsFromMultiEntity(entities, typeInformation) {
    const explicitAttrsList = [];
    if (typeInformation.explicitAttrs && typeof typeInformation.explicitAttrs === 'boolean') {
        explicitAttrsList.push('type');
        explicitAttrsList.push('id');
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
    } else if (typeInformation.explicitAttrs && typeof typeInformation.explicitAttrs === 'string') {
        entities.forEach((entity) => {
            const attsArray = utils.extractAttributesArrayFromNgsi2Entity(entity);
            const ctx = jexlParser.extractContext(attsArray);
            var res = jexlParser.applyExpression(typeInformation.explicitAttrs, ctx, typeInformation);
            if (res !== null) {
                explicitAttrsList.concat(res); // res is expected to be an array of string
            } else {
                // Transform explicitAttrs (i.e. "['attr1','attr2']" ) into an Array of String (i.e. ['attr1', 'attr2'] )
                var array = typeInformation.explicitAttrs.substring(1, typeInformation.explicitAttrs.length - 1);
                var arrayAttrs = array
                    .replace(',', '')
                    .split("'")
                    .filter((v) => v !== '');
                explicitAttrsList.concat(arrayAttrs);
            }
        });
    }
    if (explicitAttrsList.length > 0) {
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
 * @param {Object} result           Unprocessed entity
 * @param {Object} typeInformation  Configuration information for the device.
 */
function removeHiddenAttrs(result, typeInformation) {
    delete result.id;
    delete result.type;
    const explicitAttrsList = [];
    if (typeInformation.explicitAttrs && typeof typeInformation.explicitAttrs === 'boolean') {
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
    } else if (typeInformation.explicitAttrs && typeof typeInformation.explicitAttrs === 'string') {
        const attsArray = utils.extractAttributesArrayFromNgsi2Entity(result);
        const ctx = jexlParser.extractContext(attsArray);
        var res = jexlParser.applyExpression(typeInformation.explicitAttrs, ctx, typeInformation);
        if (res !== null) {
            explicitAttrsList.concat(res); // res is expected to be an array of string
        } else {
            // Transform explicitAttrs (i.e. "['attr1','attr2']" ) into an Array of String (i.e. ['attr1', 'attr2'] )
            var array = typeInformation.explicitAttrs.substring(1, typeInformation.explicitAttrs.length - 1);
            var arrayAttrs = array
                .replace(',', '')
                .split("'")
                .filter((v) => v !== '');
            explicitAttrsList.concat(arrayAttrs);
        }
    }
    if (explicitAttrsList.length > 0) {
        const hidden = _.difference(_.keys(result), explicitAttrsList);
        hidden.forEach((attr) => {
            delete result[attr];
        });
    }
    return result;
}

/**
 * Makes an update in the Device's entity in the context broker, with the values given in the 'attributes' array.
 * This array should comply to the NGSI-LD's attribute format.
 *
 * @param {String} entityName       Name of the entity to register.
 * @param {Array} attributes        Attribute array containing the values to update.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
function sendUpdateValueNgsiLD(entityName, attributes, typeInformation, token, callback) {
    let payload = {};
    const url = '/ngsi-ld/v1/entityOperations/upsert/?options=update';

    const options = NGSIUtils.createRequestObject(url, typeInformation, token);
    options.method = 'POST';

    if (typeInformation && typeInformation.staticAttributes) {
        attributes = attributes.concat(typeInformation.staticAttributes);
    }

    if (!typeInformation || !typeInformation.type) {
        callback(new errors.TypeNotFound(null, entityName));
        return;
    }

    payload.id = entityName;
    payload.type = typeInformation.type;

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
                        if (
                            'timestamp' in typeInformation && typeInformation.timestamp !== undefined
                                ? typeInformation.timestamp
                                : config.getConfig().timestamp
                        ) {
                            if (!utils.isTimestampedNgsi2(result)) {
                                options.json = NGSIv2.addTimestamp(result, typeInformation.timezone);
                            } else if (!utils.IsValidTimestampedNgsi2(result)) {
                                logger.error(context, 'Invalid timestamp:%s', JSON.stringify(result));
                                callback(new errors.BadTimestamp(result));
                                return;
                            }
                        }

                        options.json = removeHiddenAttrsFromMultiEntity(result, typeInformation);
                    } else {
                        // Remove id, type and any hidden attrs after processing
                        options.json = removeHiddenAttrs(result, typeInformation);
                        logger.debug(context, 'typeInformation: %j', typeInformation);
                        if (
                            'timestamp' in typeInformation && typeInformation.timestamp !== undefined
                                ? typeInformation.timestamp
                                : config.getConfig().timestamp
                        ) {
                            if (!utils.isTimestampedNgsi2(options.json)) {
                                options.json = NGSIv2.addTimestamp(options.json, typeInformation.timezone);
                            } else if (!utils.IsValidTimestampedNgsi2(options.json)) {
                                logger.error(context, 'Invalid timestamp:%s', JSON.stringify(options.json));
                                callback(new errors.BadTimestamp(options.json));
                                return;
                            }
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
                let att;
                if (options.json) {
                    for (let entity = 0; entity < options.json.length; entity++) {
                        for (att in options.json[entity]) {
                            /*jshint camelcase: false */
                            if (options.json[entity][att].object_id) {
                                /*jshint camelcase: false */
                                delete options.json[entity][att].object_id;
                            }
                            if (options.json[entity][att].multi) {
                                delete options.json[entity][att].multi;
                            }
                            if (options.json[entity][att].name) {
                                delete options.json[entity][att].name;
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
                            delete options.json[att].name;
                        }
                    }
                }

                try {
                    if (result instanceof Array) {
                        options.json = _.map(options.json, formatAsNGSILD);
                    } else {
                        options.json.id = entityName;
                        options.json.type = typeInformation.type;
                        options.json = [formatAsNGSILD(options.json)];
                    }
                } catch (error) {
                    return callback(new errors.BadGeocoordinates(JSON.stringify(payload)));
                }

                if (typeInformation.active) {
                    addLinkedEntities(typeInformation, options.json);
                }

                logger.debug(context, 'Updating device value in the Context Broker at [%s]', options.url);
                logger.debug(
                    context,
                    'Using the following NGSI-LD request:\n\n%s\n\n',
                    JSON.stringify(options, null, 4)
                );

                request(
                    options,
                    generateNGSILDOperationHandler('update', entityName, typeInformation, token, options, callback)
                );
            }
        }
    );
}

exports.formatAsNGSILD = formatAsNGSILD;
exports.sendUpdateValue = sendUpdateValueNgsiLD;
exports.sendQueryValue = sendQueryValueNgsiLD;
