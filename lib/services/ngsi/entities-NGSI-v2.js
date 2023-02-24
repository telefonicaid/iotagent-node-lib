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
const pluginUtils = require('../../plugins/pluginUtils');
const config = require('../../commonConfig');
const constants = require('../../constants');
const jexlParser = require('../../plugins/jexlParser');
const expressionPlugin = require('../../plugins/expressionPlugin');
const compressTimestampPlugin = require('../../plugins/compressTimestamp');
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

function addTimestampNgsi2(payload, timezone, timestampValue, skipMetadataAtt) {
    function addTimestampEntity(entity, timezone, timestampValue) {
        const timestamp = {
            type: constants.TIMESTAMP_TYPE_NGSI2
        };

        if (timestampValue) {
            timestamp.value = timestampValue;
        } else {
            if (!timezone) {
                timestamp.value = new Date().toISOString();
            } else {
                timestamp.value = moment().tz(timezone).format('YYYY-MM-DD[T]HH:mm:ss.SSSZ');
            }
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
                if (!skipMetadataAtt) {
                    addMetadata(entity[key]);
                }
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
                payload[i] = addTimestampEntity(payload[i], timezone, timestampValue);
            }
        }

        return payload;
    }
    return addTimestampEntity(payload, timezone, timestampValue);
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

function extractContextFromPayload(payload) {
    //{b: {value: 3,type: "string"},c: {value: false,type: "string"},d:{value: {g: 45},type: "string"},id: "tamcaysanto",type: "WaterTankMulti"}
    //to
    //{b:3,c:false,d:{g:45}}

    let ctx = {};
    for (const key in payload) {
        if (key !== 'type' && key !== 'id') {
            ctx[key] = payload[key].value;
        }
    }
    return ctx;
}
/**
 * Remove id, type and any hidden attrs after processing
 *
 * @param {Object} enities           Unprocessed entities
 * @param {Object} typeInformation  Configuration information for the device.
 */
function removeHiddenAttrsFromMultiEntity(entities, typeInformation, payload) {
    function filterForEntity(entity, explicitAttrsList, typeInformation) {
        let effectiveList = [];
        for (const attr of explicitAttrsList) {
            if (typeof attr === 'string') {
                effectiveList.push(attr);
            } else if (typeof attr === 'object' && attr.object_id) {
                //find objectId in active attributes
                for (const active of typeInformation.active) {
                    if (active.object_id === attr.object_id) {
                        if (
                            active &&
                            active.name &&
                            active.entity_name &&
                            active.entity_name === entity.id
                            //if name is an expression it could fail... BUT IT WORKS!
                        ) {
                            effectiveList.push(active.name);
                        }
                        continue; //object_id must be unique
                    }
                }
            }
        }
        return effectiveList;
    }

    let explicitAttrsList;
    if (typeInformation.explicitAttrs) {
        explicitAttrsList = [];
        explicitAttrsList.push('type');
        explicitAttrsList.push('id');
        if (typeof typeInformation.explicitAttrs === 'boolean') {
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
        } else if (typeof typeInformation.explicitAttrs === 'string') {
            entities.forEach((entity) => {
                const attsArray = pluginUtils.extractAttributesArrayFromNgsi2Entity(entity);
                const ctx = {
                    ...jexlParser.extractContext(attsArray),
                    ...extractContextFromPayload(payload)
                }; //maybe overlapping between this two objects.
                let res = null;
                try {
                    res = jexlParser.applyExpression(typeInformation.explicitAttrs, ctx, typeInformation);
                } catch (e) {
                    // nothing to do: exception is already logged at info level
                }
                explicitAttrsList = res ? explicitAttrsList.concat(res) : explicitAttrsList;
            });
        }
    }
    if (explicitAttrsList && explicitAttrsList.length >= 0) {
        entities.forEach((entity) => {
            //some attrs are object_ids {object_id:oid} and need to be resolved for this entity
            //"explicitAttrs" : "attrA?['attrA',{object_id:'foo'}]:['attrB',{object_id:'bar'}]",
            let efectiveAttrsList = filterForEntity(entity, explicitAttrsList, typeInformation);
            const hidden = _.difference(_.keys(entity), efectiveAttrsList);
            logger.debug(context, 'removeHiddenAttrsFromMultiEntity %s from entity %s', hidden, entity);
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
function removeHiddenAttrs(result, typeInformation, payload) {
    delete result.id;
    delete result.type;
    let explicitAttrsList;
    if (typeInformation.explicitAttrs && typeof typeInformation.explicitAttrs === 'boolean') {
        explicitAttrsList = [];
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
        const attsArray = pluginUtils.extractAttributesArrayFromNgsi2Entity(result);
        const ctx = {
            ...jexlParser.extractContext(attsArray),
            ...extractContextFromPayload(payload)
        }; //maybe overlapping between this two objects. Measures not in active attrs.
        let res = null;
        try {
            res = jexlParser.applyExpression(typeInformation.explicitAttrs, ctx, typeInformation);
        } catch (e) {
            // nothing to do: exception is already logged at info level
        }
        explicitAttrsList = res ? res : [];
    }
    if (explicitAttrsList && explicitAttrsList.length >= 0) {
        const hidden = _.difference(_.keys(result), explicitAttrsList);
        logger.debug(context, 'removeHiddenAttrs %s', hidden);
        hidden.forEach((attr) => {
            delete result[attr];
        });
    }
    return result;
}

// /**
//  * Makes an update in the Device's entity in the context broker, with the values given in the 'attributes' array. This
//  * array should comply to the NGSIv2's attribute format.
//  *
//  * @param {String} entityName       Name of the entity to register.
//  * @param {Array} attributes        Attribute array containing the values to update.
//  * @param {Object} typeInformation  Configuration information for the device.
//  * @param {String} token            User token to identify against the PEP Proxies (optional).
//  */
// function sendUpdateValueNgsi2(entityName, attributes, typeInformation, token, callback) {
//     let payload = {};

//     let url = '/v2/entities/' + entityName + '/attrs';

//     if (typeInformation && typeInformation.type) {
//         url += '?type=' + typeInformation.type;
//     }

//     let options = NGSIUtils.createRequestObject(url, typeInformation, token);

//     if (typeInformation && typeInformation.staticAttributes) {
//         attributes = attributes.concat(typeInformation.staticAttributes);
//     }

//     if (!typeInformation || !typeInformation.type) {
//         callback(new errors.TypeNotFound(null, entityName));
//         return;
//     }

//     for (let i = 0; i < attributes.length; i++) {
//         if (attributes[i].name && attributes[i].type) {
//             payload[attributes[i].name] = {
//                 value: attributes[i].value,
//                 type: attributes[i].type
//             };
//             const metadata = NGSIUtils.getMetaData(typeInformation, attributes[i].name, attributes[i].metadata);
//             if (metadata) {
//                 payload[attributes[i].name].metadata = metadata;
//             }
//         } else {
//             callback(new errors.BadRequest(null, entityName));
//             return;
//         }
//     }
//     //overwritte if id or type missnamed atributes reach this point
//     payload.id = entityName;
//     payload.type = typeInformation.type;
//     payload = NGSIUtils.castJsonNativeAttributes(payload);
//     async.waterfall(
//         [
//             apply(statsService.add, 'measureRequests', 1),
//             apply(NGSIUtils.applyMiddlewares, NGSIUtils.updateMiddleware, payload, typeInformation)
//         ],
//         function (error, result) {
//             if (error) {
//                 callback(error);
//             } else {
//                 if (result) {
//                     // The payload has been transformed by multientity plugin. It is not a JSON object but an Array.
//                     if (result instanceof Array) {
//                         options = NGSIUtils.createRequestObject('/v2/op/update', typeInformation, token);

//                         if (
//                             'timestamp' in typeInformation && typeInformation.timestamp !== undefined
//                                 ? typeInformation.timestamp
//                                 : config.getConfig().timestamp
//                         ) {
//                             // jshint maxdepth:5
//                             if (!utils.isTimestampedNgsi2(result)) {
//                                 result = addTimestampNgsi2(result, typeInformation.timezone);
//                                 // jshint maxdepth:5
//                             } else if (!utils.IsValidTimestampedNgsi2(result)) {
//                                 logger.error(context, 'Invalid timestamp:%s', JSON.stringify(result));
//                                 callback(new errors.BadTimestamp(result));
//                                 return;
//                             }
//                         }
//                         options.json = {
//                             actionType: 'append',
//                             entities: removeHiddenAttrsFromMultiEntity(result, typeInformation, payload)
//                         };
//                         if (config.getConfig().appendMode === true) {
//                             options.json.actionType = 'append';
//                         } else {
//                             options.json.actionType = 'update';
//                         }
//                     } else {
//                         options.json = removeHiddenAttrs(result, typeInformation, payload);
//                         logger.debug(context, 'typeInformation: %j', typeInformation);
//                         if (
//                             'timestamp' in typeInformation && typeInformation.timestamp !== undefined
//                                 ? typeInformation.timestamp
//                                 : config.getConfig().timestamp
//                         ) {
//                             if (!utils.isTimestampedNgsi2(options.json)) {
//                                 options.json = addTimestampNgsi2(options.json, typeInformation.timezone);
//                             } else if (!utils.IsValidTimestampedNgsi2(options.json)) {
//                                 logger.error(context, 'Invalid timestamp:%s', JSON.stringify(options.json));
//                                 callback(new errors.BadTimestamp(options.json));
//                                 return;
//                             }
//                         }
//                         if (config.getConfig().appendMode === true) {
//                             options.method = 'POST';
//                         } else {
//                             options.method = 'PATCH';
//                         }
//                     }
//                 } else {
//                     delete payload.id;
//                     delete payload.type;
//                     options.json = payload;
//                 }
//                 // Purge object_id from entities before sent to CB
//                 // object_id was added by createNgsi2Entity to allow multientity
//                 // with duplicate attribute names.

//                 //some entities may be empty if they had only wrong attributes id-type
//                 //we filter the array
//                 if (options.json.entities) {
//                     options.json.entities = options.json.entities.filter((value) => Object.keys(value).length > 0);
//                 }

//                 let att;
//                 if (options.json.entities) {
//                     for (let entity = 0; entity < options.json.entities.length; entity++) {
//                         for (att in options.json.entities[entity]) {
//                             /*jshint camelcase: false */
//                             if (options.json.entities[entity][att].object_id) {
//                                 /*jshint camelcase: false */
//                                 delete options.json.entities[entity][att].object_id;
//                             }
//                             if (options.json.entities[entity][att].multi) {
//                                 delete options.json.entities[entity][att].multi;
//                             }
//                             if (options.json.entities[entity][att].name) {
//                                 delete options.json.entities[entity][att].name;
//                             }

//                             try {
//                                 // Format any GeoJSON attrs properly
//                                 options.json.entities[entity][att] = formatGeoAttrs(options.json.entities[entity][att]);
//                             } catch (error) {
//                                 return callback(new errors.BadGeocoordinates(JSON.stringify(options.json)));
//                             }
//                         }
//                     }
//                 } else {
//                     for (att in options.json) {
//                         /*jshint camelcase: false */
//                         if (options.json[att].object_id) {
//                             /*jshint camelcase: false */
//                             delete options.json[att].object_id;
//                         }
//                         if (options.json[att].multi) {
//                             delete options.json[att].multi;
//                         }
//                         if (options.json[att].name) {
//                             delete options[att].name;
//                         }

//                         try {
//                             // Format any GeoJSON attrs properly
//                             options.json[att] = formatGeoAttrs(options.json[att]);
//                         } catch (error) {
//                             return callback(new errors.BadGeocoordinates(JSON.stringify(options.json)));
//                         }
//                     }
//                 }

//                 // Prevent to update an entity with an empty payload
//                 if (Object.keys(options.json).length > 0) {
//                     logger.debug(context, 'Updating device value in the Context Broker at [%s]', options.url);
//                     logger.debug(
//                         context,
//                         'Using the following NGSI v2 request:\n\n%s\n\n',
//                         JSON.stringify(options, null, 4)
//                     );

//                     request(
//                         options,
//                         generateNGSI2OperationHandler('update', entityName, typeInformation, token, options, callback)
//                     );
//                 } else {
//                     logger.debug(
//                         context,
//                         'Not updating device value in the Context Broker at [%s] due to empty payload \n\n[%s]\n\n',
//                         options.url,
//                         JSON.stringify(options, null, 4)
//                     );
//                     callback(null);
//                 }
//             }
//         }
//     );
// }

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
 * Makes an update in the Device's entity in the context broker, with the values given in the 'attributes' array. This
 * array should comply to the NGSIv2's attribute format.
 *
 * @param {String} entityName       Name of the entity to register.
 * @param {Array} attributes        Attribute array containing the values to update.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
function sendUpdateValueNgsi2Refactored(entityName, attributes, typeInformation, token, callback) {
    logger.debug(
        context,
        'sendUpdateValueNgsi2Refactored called with: \n entityName=%s \n attributes=%j \n typeInformation=%j',
        entityName,
        attributes,
        typeInformation
    );
    let payload = {
        entities: [
            {
                id: entityName
            }
        ]
    };

    let url = '/v2/op/update';

    if (typeInformation && typeInformation.type) {
        payload.entities[0].type = typeInformation.type;
    }

    if (config.getConfig().appendMode === true) {
        payload.actionType = 'append';
    } else {
        payload.actionType = 'update';
    }

    let options = NGSIUtils.createRequestObject(url, typeInformation, token);

    if (typeInformation && typeInformation.staticAttributes) {
        attributes = attributes.concat(typeInformation.staticAttributes);
    }

    if (!typeInformation || !typeInformation.type) {
        callback(new errors.TypeNotFound(null, entityName));
        return;
    }
    let idTypeSSSList = pluginUtils.getIdTypeServSubServiceFromDevice(typeInformation);
    logger.debug(context, 'sendUpdateValueNgsi2Refactored \n idTypeSSS are %j ', idTypeSSSList);
    let measureAttrsForCtxt = [];

    // Check explicitAttrs
    if (
        typeInformation.explicitAttrs === undefined ||
        (typeof typeInformation.explicitAttrs === 'boolean' && !typeInformation.explicitAttrs)
        // explicitAttrs is not defined => default case: all attrs should be included
    ) {
        // This loop adds all measure values (attributes) into payload entities (entity[0])
        for (let i = 0; i < attributes.length; i++) {
            if (attributes[i].name && attributes[i].type) {
                payload.entities[0][attributes[i].name] = {
                    value: attributes[i].value,
                    type: attributes[i].type
                };
                const metadata = NGSIUtils.getMetaData(typeInformation, attributes[i].name, attributes[i].metadata);
                if (metadata) {
                    payload.entities[0][attributes[i].name].metadata = metadata;
                }
            } else {
                callback(new errors.BadRequest(null, entityName));
                return;
            }
        }
        logger.debug(context, 'sendUpdateValueNgsi2Refactored \n pre-initial non-explicitAttrs payload=%j', payload);
        // Loop for add attrs from type.information.active (and lazys?) into payload entities (entity[0])
        if (typeInformation.active) {
            typeInformation.active.forEach((attr) => {
                if (attr.expression) {
                    if (attr.object_id) {
                        payload.entities[0][attr.object_id] = {
                            value: payload.entities[0][attr.object_id]
                                ? payload.entities[0][attr.object_id].value
                                : undefined,
                            type: attr.type,
                            object_id: attr.object_id
                        };
                    } else {
                        payload.entities[0][attr.name] = {
                            value: payload.entities[0][attr.name] ? payload.entities[0][attr.name].value : undefined,
                            type: attr.type
                        };
                    }
                }
            });
        }
    } else {
        let selectedAttrs = [];
        if (typeof typeInformation.explicitAttrs === 'string') {
            // explicitAttrs is a jexlExpression
            // This ctxt should include all possible attrs
            let attributesCtxt = [];
            if (typeInformation.static) {
                typeInformation.static.forEach(function (att) {
                    attributesCtxt.push(att);
                });
            }
            // Measures
            for (let i = 0; i < attributes.length; i++) {
                if (attributes[i].name && attributes[i].type) {
                    let measureAttr = {
                        name: attributes[i].name,
                        value: attributes[i].value,
                        type: attributes[i].type
                    };
                    attributesCtxt.push(measureAttr);
                }
            }
            // This context is just to calculate explicitAttrs when is an expression
            let ctxt = expressionPlugin.extractContext(attributesCtxt.concat(idTypeSSSList), typeInformation);
            // typeInformation.active attrs with expressions expanded by current ctxt
            if (typeInformation.active) {
                typeInformation.active.forEach(function (att) {
                    if (att.expression) {
                        if (expressionPlugin.contextAvailable(att.expression, ctxt, typeInformation)) {
                            let expandedAttr = {
                                name: att.name,
                                value: att.expression, // it doesn't matter final value here
                                type: att.type
                            };
                            attributesCtxt.push(expandedAttr);
                            ctxt = expressionPlugin.extractContext(
                                attributesCtxt.concat(idTypeSSSList),
                                typeInformation
                            );
                        }
                    }
                });
            }
            // calculate expression for explicitAttrs
            try {
                selectedAttrs = jexlParser.applyExpression(typeInformation.explicitAttrs, ctxt, typeInformation);
                if (selectedAttrs.length === 0) {
                    // implies do nothing
                    callback(null);
                }
            } catch (e) {
                // nothing to do: exception is already logged at info level
            }
            typeInformation.active.forEach((attr) => {
                if (selectedAttrs.includes(attr.name)) {
                    selectedAttrs.push(attr.object_id);
                }
            });
        } else if (typeInformation.explicitAttrs && typeof typeInformation.explicitAttrs === 'boolean') {
            // explicitAtts is true => Add measures which are defined attributes
            typeInformation.active.forEach((attr) => {
                selectedAttrs.push(attr.name);
                selectedAttrs.push(attr.object_id);
            });
        }
        // This loop adds selected measured values (attributes) into payload entities (entity[0])
        for (let i = 0; i < attributes.length; i++) {
            if (attributes[i].name && selectedAttrs.includes(attributes[i].name) && attributes[i].type) {
                payload.entities[0][attributes[i].name] = {
                    value: attributes[i].value,
                    type: attributes[i].type
                };
                const metadata = NGSIUtils.getMetaData(typeInformation, attributes[i].name, attributes[i].metadata);
                if (metadata) {
                    payload.entities[0][attributes[i].name].metadata = metadata;
                }
            } else if (attributes[i].name && !selectedAttrs.includes(attributes[i].name) && attributes[i].type) {
                let att = {
                    name: attributes[i].name,
                    type: attributes[i].type,
                    value: attributes[i].value
                };
                measureAttrsForCtxt.push(att);
            }
        }
        logger.debug(
            context,
            'sendUpdateValueNgsi2Refactored \n pre-initial explicitAttrs payload=%j \n selectedAttrs',
            payload,
            selectedAttrs
        );

        // Loop for add seleted attrs from type.information.active into pyaload entities (entity[0])
        if (typeInformation.active) {
            typeInformation.active.forEach((attr) => {
                if (selectedAttrs.includes(attr.name)) {
                    if (attr.object_id) {
                        payload.entities[0][attr.object_id] = {
                            value: payload.entities[0][attr.object_id]
                                ? payload.entities[0][attr.object_id].value
                                : undefined,
                            type: attr.type,
                            object_id: attr.object_id
                        };
                    } else {
                        payload.entities[0][attr.name] = {
                            value: payload.entities[0][attr.name] ? payload.entities[0][attr.name].value : undefined,
                            type: attr.type
                        };
                    }
                }
            });
        }
    }
    logger.debug(context, 'sendUpdateValueNgsi2Refactored \n initial payload=%j', payload);

    let currentEntity = payload.entities[0];

    // Prepare attributes for expresionPlugin
    const attsArray = pluginUtils.extractAttributesArrayFromNgsi2Entity(currentEntity);

    // Exclude processing all attr expressions when current attr is of type 'commandStatus' or 'commandResult'
    let attsArrayFiltered = [];
    if (attsArray) {
        attsArrayFiltered = attsArray.filter((obj) => {
            return ![constants.COMMAND_STATUS, constants.COMMAND_RESULT].includes(obj.type);
        });
    }
    let attributesCtxt = [...attsArrayFiltered]; // just copy
    if (typeInformation.static) {
        typeInformation.static.forEach(function (att) {
            attributesCtxt.push(att);
        });
    }
    if (measureAttrsForCtxt) {
        measureAttrsForCtxt.forEach(function (att) {
            attributesCtxt.push(att);
        });
    }
    attributesCtxt = attributesCtxt.concat(idTypeSSSList);
    let ctxt = expressionPlugin.extractContext(attributesCtxt, typeInformation);
    logger.debug(context, 'sendUpdateValueNgsi2Refactored \n initial ctxt %j ', ctxt);

    // Sort currentEntity to get first attrs without expressions (checking attrs in typeInformation.active)
    // attributes without expressions should be processed before
    logger.debug(context, 'sendUpdateValueNgsi2Refactored \n currentEntity %j ', currentEntity);
    if (typeInformation.active && typeInformation.active.length > 0) {
        for (const k in currentEntity) {
            typeInformation.active.forEach(function (att) {
                if (
                    (att.object_id && att.object_id === k && att.expression) ||
                    (att.name && att.name === k && att.expression)
                ) {
                    let m = currentEntity[k];
                    delete currentEntity[k];
                    currentEntity[k] = m; // put into the end of currentEntity
                }
            });
        }
    }
    logger.debug(context, 'sendUpdateValueNgsi2Refactored \n currentEntity sorted %j ', currentEntity);
    let timestampValue = undefined;
    for (const j in currentEntity) {
        // discard id and type
        if (j !== 'id' || j !== 'type') {
            // Apply Mapping Alias: object_id in attributes are in typeInformation.active
            let attr;
            let newAttr = payload.entities[0][j];
            if (typeInformation.active) {
                attr = typeInformation.active.find((obj) => {
                    return obj.object_id === j;
                });
            }
            if (!attr) {
                if (typeInformation.lazy) {
                    attr = typeInformation.lazy.find((obj) => {
                        return obj.object_id === j;
                    });
                }
            }
            if (!attr) {
                if (typeInformation.active) {
                    attr = typeInformation.active.find((obj) => {
                        return obj.name === j;
                    });
                }
            }
            if (attr && attr.name) {
                if (['id', 'type'].includes(attr.name)) {
                    // invalid mapping
                    logger.debug(
                        context,
                        'sendUpdateValueNgsi2Refactored \n invalid mapping for attr %j \n newAttr %j',
                        attr,
                        newAttr
                    );
                    delete payload.entities[0][attr.object_id];
                    attr = undefined;
                    newAttr = undefined;
                } else {
                    ctxt[attr.name] = payload.entities[0][j]['value'];
                }
            }
            logger.debug(
                context,
                'sendUpdateValueNgsi2Refactored \n procesing j %j attr %j ctxt %j \n newAttr %j ',
                j,
                attr,
                ctxt,
                newAttr
            );
            if (attr && attr.type) {
                newAttr.type = attr.type;
            }

            // Apply expression
            if (attr && attr.expression) {
                logger.debug(
                    context,
                    'sendUpdateValueNgsi2Refactored \n apply expression %j \n over ctxt %j \n and device %j',
                    attr.expression,
                    ctxt,
                    typeInformation
                );
                let res = null;
                try {
                    if (expressionPlugin.contextAvailable(attr.expression, ctxt, typeInformation)) {
                        res = expressionPlugin.applyExpression(attr.expression, ctxt, typeInformation);
                    } else {
                        logger.warn(
                            context,
                            'sendUpdateValueNgsi2Refactored \n no context available for apply expression %j \n',
                            attr.expression
                        );
                        res = newAttr.value; // keep newAttr value
                    }
                } catch (e) {
                    logger.error(context, 'sendUpdateValueNgsi2Refactored \n apply expression exception %j \n', e);
                    if (!expressionPlugin.checkJexl(typeInformation)) {
                        return callback(e); // just throw error with legacy parser for backward compatiblity
                    } else {
                        res = ctxt[attr.name]; // TBD: add reference to test
                    }
                }
                if (!expressionPlugin.checkJexl(typeInformation)) {
                    // legacy expression plugin: Involves some legacy checks performed by applierExpression
                    if (
                        res &&
                        res !== 'undefined' &&
                        res !== 'null' &&
                        (typeof res === 'string' || res instanceof String) &&
                        !res.includes('NaN')
                    ) {
                        newAttr.value = res;
                        if (newAttr.type === 'Number' && isFloat(newAttr.value)) {
                            newAttr.value = Number.parseFloat(newAttr.value);
                        } else if (newAttr.type === 'Number' && !Number.isNaN(Number.parseInt(newAttr.value))) {
                            newAttr.value = Number.parseInt(newAttr.value);
                        } else if (newAttr.type === 'Boolean') {
                            newAttr.value = newAttr.value === 'true' || newAttr.value === '1';
                        } else if (newAttr.type === 'None') {
                            newAttr.value = null;
                        }
                    } else if (isNaN(res) || res === 'undefined' || res === 'null') {
                        logger.debug(
                            context,
                            'sendUpdateValueNgsi2Refactored \n apply expression isNaN || undefined || null'
                        );
                        if (res === 'null' && newAttr.type === 'None') {
                            newAttr.value = null;
                        } else {
                            delete payload.entities[0][j];
                            delete payload.entities[0][attr.name];
                            attr = undefined;
                        }
                    }
                } else {
                    // jexl expression plugin
                    newAttr.value = res;
                }
                logger.debug(
                    context,
                    'sendUpdateValueNgsi2Refactored \n apply expression result %j \n newAttr %j',
                    res,
                    newAttr
                );
            }

            // Apply Multientity: entity_type and entity_name in attributes are in typeInformation.active
            if (attr && (attr.entity_type || attr.entity_name)) {
                // Create a newEntity for this attribute
                let newEntityName = null;
                if (attr.entity_name) {
                    try {
                        if (expressionPlugin.contextAvailable(attr.entity_name, ctxt, typeInformation)) {
                            newEntityName = expressionPlugin.applyExpression(attr.entity_name, ctxt, typeInformation);
                        } else {
                            logger.warn(
                                context,
                                'sendUpdateValueNgsi2Refactored \n MULTI no context available for apply expression %j \n',
                                attr.entity_name
                            );
                            newEntityName = attr.entity_name;
                        }
                        newEntityName = newEntityName ? newEntityName : attr.entity_name;
                    } catch (e) {
                        logger.error(
                            context,
                            'sendUpdateValueNgsi2Refactored \n MULTI apply expression exception %j \n',
                            e
                        );
                        newEntityName = attr.entity_name;
                    }
                    logger.debug(
                        context,
                        'sendUpdateValueNgsi2Refactored \n MULTI apply expression %j \n result %j \n payload %j',
                        attr.entity_name,
                        newEntityName,
                        payload
                    );
                }

                let newEntity = {
                    id: newEntityName ? newEntityName : payload.entities[0].id,
                    type: attr.entity_type ? attr.entity_type : payload.entities[0].type
                };
                // Check if there is already a newEntity created
                let alreadyEntity = payload.entities.find((entity) => {
                    return entity.id === newEntity.id && entity.type === newEntity.type;
                });
                if (alreadyEntity) {
                    // Use alreadyEntity
                    alreadyEntity[attr.name] = newAttr;
                } else {
                    // Add newEntity to payload.entities
                    newEntity[attr.name] = newAttr;
                    if (
                        'timestamp' in typeInformation && typeInformation.timestamp !== undefined
                            ? typeInformation.timestamp
                            : config.getConfig().timestamp !== undefined
                            ? config.getConfig().timestamp
                            : timestampValue !== undefined
                    ) {
                        newEntity = addTimestampNgsi2(newEntity, typeInformation.timezone, timestampValue);
                        logger.debug(context, 'sendUpdateValueNgsi2Refactored \n timestamped newEntity=%j', newEntity);
                    }
                    payload.entities.push(newEntity);
                }
                if (attr && attr.name) {
                    if (attr.name !== j) {
                        logger.debug(
                            context,
                            'sendUpdateValueNgsi2Refactored \n MULTI remove attr %j j %jfrom %j \n',
                            attr,
                            j,
                            payload
                        );
                        delete payload.entities[0][j];
                    }
                }
            } else {
                // if (attr && (attr.entity_type || attr.entity_name))

                if (attr && attr.name) {
                    payload.entities[0][attr.name] = newAttr;
                    if (attr.name !== j) {
                        delete payload.entities[0][j]; // alias
                    }
                }
                if (newAttr && newAttr.type === constants.TIMESTAMP_TYPE_NGSI2 && newAttr.value) {
                    let extendedTime = compressTimestampPlugin.fromBasicToExtended(newAttr.value);
                    if (extendedTime) {
                        newAttr.value = extendedTime;
                    }
                }
                if (j === constants.TIMESTAMP_ATTRIBUTE) {
                    if (newAttr && newAttr.type === constants.TIMESTAMP_TYPE_NGSI2 && newAttr.value) {
                        timestampValue = newAttr.value;
                        logger.debug(
                            context,
                            'sendUpdateValueNgsi2Refactored \n newAttr is TimeInstant and new payload=%j',
                            payload
                        );
                    }
                }
                if (
                    newAttr &&
                    newAttr.metadata &&
                    newAttr.metadata[constants.TIMESTAMP_ATTRIBUTE] &&
                    newAttr.metadata[constants.TIMESTAMP_ATTRIBUTE].type === constants.TIMESTAMP_TYPE_NGSI2 &&
                    newAttr.metadata[constants.TIMESTAMP_ATTRIBUTE].value
                ) {
                    let extendedTime = compressTimestampPlugin.fromBasicToExtended(
                        newAttr.metadata[constants.TIMESTAMP_ATTRIBUTE].value
                    );
                    if (extendedTime) {
                        newAttr.metadata[constants.TIMESTAMP_ATTRIBUTE].value = extendedTime;
                    }
                }
            }
        } // if (j !== 'id' || j !== 'type')

        // final attr loop
        logger.debug(
            context,
            'sendUpdateValueNgsi2Refactored \n after procesing attr %j \n current entity %j \n current payload=%j',
            j,
            currentEntity,
            payload
        );
    }
    // for attr loop

    // Add timestamp to paylaod
    if (
        'timestamp' in typeInformation && typeInformation.timestamp !== undefined
            ? typeInformation.timestamp
            : config.getConfig().timestamp !== undefined
            ? config.getConfig().timestamp
            : timestampValue !== undefined
    ) {
        if (timestampValue) {
            // timeInstant is provided as measure
            if (payload.entities.length > 1) {
                for (let n = 0; n < payload.entities.length; n++) {
                    // include metadata with TimeInstant in attrs when TimeInstant is provided as measure in all entities
                    payload.entities[n] = addTimestampNgsi2(
                        payload.entities[n],
                        typeInformation.timezone,
                        timestampValue,
                        false // skipMetadataAtt
                    );
                }
            } else {
                // Do not include metadata with TimeInstant in attrs when TimeInstant is provided as measure
                // and no more entities
                payload.entities[0] = addTimestampNgsi2(
                    payload.entities[0],
                    typeInformation.timezone,
                    timestampValue,
                    true // skipMetadataAtt
                );
            }
        } else {
            // jshint maxdepth:5
            for (let n = 0; n < payload.entities.length; n++) {
                if (!utils.isTimestampedNgsi2(payload.entities[n])) {
                    // legacy check needed?
                    payload.entities[n] = addTimestampNgsi2(payload.entities[n], typeInformation.timezone);
                    // jshint maxdepth:5
                } else if (!utils.IsValidTimestampedNgsi2(payload.entities[n])) {
                    // legacy check needed?
                    logger.error(context, 'Invalid timestamp:%s', JSON.stringify(payload.entities[0]));
                    callback(new errors.BadTimestamp(payload.entities));
                    return;
                }
            }
        }
    }
    logger.debug(context, 'sendUpdateValueNgsi2Refactored \n ending payload=%j', payload);

    for (let m = 0; m < payload.entities.length; m++) {
        for (var key in payload.entities[m]) {
            // purge object_id from payload
            if (payload.entities[m][key] && payload.entities[m][key].object_id) {
                delete payload.entities[m][key].object_id;
            }
        }
        payload.entities[m] = NGSIUtils.castJsonNativeAttributes(payload.entities[m]); // native types
    }
    logger.debug(
        context,
        'sendUpdateValueNgsi2Refactored \n payload with native types and without object_id %j',
        payload
    );

    options.json = payload;

    // Prevent to update an entity with an empty payload
    if (Object.keys(options.json).length > 0) {
        // Final check: (to keep tests unchanged) before do CB requests
        //              one entity     -> request /v2/entities/ + entityName + /atts ?type=typeInformation.type
        //              multi entities -> request v2/op/update
        if (Object.keys(options.json.entities).length === 1) {
            url = '/v2/entities/' + entityName + '/attrs';
            if (typeInformation && typeInformation.type) {
                url += '?type=' + typeInformation.type;
            }
            options = NGSIUtils.createRequestObject(url, typeInformation, token);
            options.json = payload.entities[0];
            delete options.json.id;
            delete options.json.type;
            if (config.getConfig().appendMode === true) {
                options.method = 'POST';
            } else {
                options.method = 'PATCH';
            }
        }
        logger.debug(context, 'Updating device value in the Context Broker at [%s]', options.url);
        logger.debug(context, 'Using the following NGSI v2 request:\n\n%s\n\n', JSON.stringify(options, null, 4));
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

exports.sendQueryValue = sendQueryValueNgsi2;
//exports.sendUpdateValue = sendUpdateValueNgsi2;
exports.sendUpdateValue = sendUpdateValueNgsi2Refactored;
exports.addTimestamp = addTimestampNgsi2;
exports.formatGeoAttrs = formatGeoAttrs;
