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
const logger = require('logops');
const _ = require('underscore');
const context = {
    op: 'IoTAgentNGSI-LD'
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

function convertAttrNGSILD(attr) {
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

        // LanguageProperties
        case 'languageproperty':
            obj.type = 'LanguageProperty';
            obj.languageMap = attr.value;
            delete obj.value;
            break;

        default:
            obj.value = { '@type': attr.type, '@value': attr.value };
    }

    if (!!obj && attr.metadata) {
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
                    obj[key] = convertAttrNGSILD(attr.metadata[key]);
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
                obj[key] = convertAttrNGSILD(json[key]);
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
 * Determines if a value is of type float
 *
 * @param      {String}   value       Value to be analyzed
 * @return     {boolean}              True if float, False otherwise.
 */
function isFloat(value) {
    return !isNaN(value) && value.toString().indexOf('.') !== -1;
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
    logger.debug(
        context,
        'sendUpdateValueNgsiLD called with: \n entityName=%s \n attributes=%j \n typeInformation=%j',
        entityName,
        attributes,
        typeInformation
    );
    const payload = [
        {
            id: entityName
        }
    ];

    const url = '/ngsi-ld/v1/entityOperations/upsert/?options=update';

    if (typeInformation && typeInformation.type) {
        payload[0].type = typeInformation.type;
    }

    if (config.getConfig().appendMode === true) {
        payload.actionType = 'append';
    } else {
        payload.actionType = 'update';
    }

    const options = NGSIUtils.createRequestObject(url, typeInformation, token);
    options.method = 'POST';

    if (typeInformation && typeInformation.staticAttributes) {
        attributes = attributes.concat(typeInformation.staticAttributes);
    }

    if (!typeInformation || !typeInformation.type) {
        callback(new errors.TypeNotFound(null, entityName));
        return;
    }
    const idTypeSSSList = pluginUtils.getIdTypeServSubServiceFromDevice(typeInformation);
    logger.debug(context, 'sendUpdateValueNgsiLD \n idTypeSSS are %j ', idTypeSSSList);
    const measureAttrsForCtxt = [];

    // Check explicitAttrs: adds all final needed attributes to payload
    if (
        typeInformation.explicitAttrs === undefined ||
        (typeof typeInformation.explicitAttrs === 'boolean' && !typeInformation.explicitAttrs)
        // explicitAttrs is not defined => default case: all attrs should be included
    ) {
        // This loop adds all measure values (attributes) into payload entities (entity[0])
        for (let i = 0; i < attributes.length; i++) {
            if (attributes[i].name && attributes[i].type) {
                payload[0][attributes[i].name] = {
                    value: attributes[i].value,
                    type: attributes[i].type
                };
                const metadata = NGSIUtils.getMetaData(typeInformation, attributes[i].name, attributes[i].metadata);
                if (metadata) {
                    payload[0][attributes[i].name].metadata = metadata;
                }
            } else {
                callback(new errors.BadRequest(null, entityName));
                return;
            }
        }
        logger.debug(context, 'sendUpdateValueNgsiLD \n pre-initial non-explicitAttrs payload=%j', payload);
        // Loop for add attrs from type.information.active (and lazys?) into payload entities (entity[0])
        if (typeInformation.active) {
            typeInformation.active.forEach((attr) => {
                if (attr.expression) {
                    if (attr.object_id) {
                        payload[0][attr.object_id] = {
                            value: payload[0][attr.object_id] ? payload[0][attr.object_id].value : undefined,
                            type: attr.type,
                            object_id: attr.object_id
                        };
                    } else {
                        payload[0][attr.name] = {
                            value: payload[0][attr.name] ? payload[0][attr.name].value : undefined,
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
            const attributesCtxt = [];
            if (typeInformation.static) {
                typeInformation.static.forEach(function (att) {
                    attributesCtxt.push(att);
                });
            }
            // Measures
            for (let i = 0; i < attributes.length; i++) {
                if (attributes[i].name && attributes[i].type) {
                    const measureAttr = {
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
                            const expandedAttr = {
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
                const res = jexlParser.applyExpression(typeInformation.explicitAttrs, ctxt, typeInformation);
                if (res === true) {
                    // like explicitAttrs == true
                    // selectAttrs should be measures which are defined attributes
                    typeInformation.active.forEach((attr) => {
                        selectedAttrs.push(attr.name);
                        selectedAttrs.push(attr.object_id);
                    });
                } else if (res === false) {
                    // like explicitAttrs == false
                    // selectAttrs should be measures and defined attributes
                    typeInformation.active.forEach((attr) => {
                        selectedAttrs.push(attr.name);
                        selectedAttrs.push(attr.object_id);
                    });
                    for (let i = 0; i < attributes.length; i++) {
                        selectedAttrs.push(attributes[i].name);
                    }
                } else {
                    selectedAttrs = res; // TBD: Check ensure is an array of strings
                }
                if (selectedAttrs.length === 0) {
                    // implies do nothing
                    logger.info(
                        context,
                        'sendUpdateValueNgsiLD \n none selectedAttrs with %j and ctxt %j',
                        typeInformation.explicitAttrs,
                        ctxt
                    );
                    return callback(null);
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
            // TBD: selectedAttrs could be a boolean as a result of applyExpression
            // explicitAtts is true => Add measures which are defined attributes
            typeInformation.active.forEach((attr) => {
                selectedAttrs.push(attr.name);
                selectedAttrs.push(attr.object_id);
            });
        }
        // This loop adds selected measured values (attributes) into payload entities (entity[0])
        for (let i = 0; i < attributes.length; i++) {
            if (attributes[i].name && selectedAttrs.includes(attributes[i].name) && attributes[i].type) {
                const attr = typeInformation.active.find((obj) => {
                    return obj.name === attributes[i].name;
                });
                payload[0][attributes[i].name] = {
                    value: attributes[i].value,
                    type: attributes[i].type
                };
                // ensure payload has attr with proper object_id
                if (attr && attr.object_id) {
                    payload[0][attributes[i].name].object_id = attr.object_id;
                }
                const metadata = NGSIUtils.getMetaData(typeInformation, attributes[i].name, attributes[i].metadata);
                if (metadata) {
                    payload[0][attributes[i].name].metadata = metadata;
                }
            } else if (attributes[i].name && !selectedAttrs.includes(attributes[i].name) && attributes[i].type) {
                const att = {
                    name: attributes[i].name,
                    type: attributes[i].type,
                    value: attributes[i].value
                };
                measureAttrsForCtxt.push(att);
            }
        }
        logger.debug(
            context,
            'sendUpdateValueNgsiLD \n pre-initial explicitAttrs payload=%j \n selectedAttrs',
            payload,
            selectedAttrs
        );

        // Loop for add seleted attrs from type.information.active into pyaload entities (entity[0])
        if (typeInformation.active) {
            typeInformation.active.forEach((attr) => {
                if (selectedAttrs.includes(attr.name)) {
                    if (attr.object_id) {
                        payload[0][attr.object_id] = {
                            value: payload[0][attr.object_id]
                                ? payload[0][attr.object_id].value
                                : payload[0][attr.name]
                                ? payload[0][attr.name].value
                                : undefined,
                            type: attr.type,
                            object_id: attr.object_id
                        };
                    } else {
                        payload[0][attr.name] = {
                            value: payload[0][attr.name] ? payload[0][attr.name].value : undefined,
                            type: attr.type
                        };
                    }
                }
            });
        }
    } // END check explicitAttrs
    logger.debug(context, 'sendUpdateValueNgsiLD \n initial payload=%j', payload);

    const currentEntity = payload[0];

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
    const ctxt = expressionPlugin.extractContext(attributesCtxt, typeInformation);
    logger.debug(context, 'sendUpdateValueNgsiLD \n initial ctxt %j ', ctxt);

    // Sort currentEntity to get first attrs without expressions (checking attrs in typeInformation.active)
    // attributes without expressions should be processed before
    logger.debug(context, 'sendUpdateValueNgsiLD \n currentEntity %j ', currentEntity);
    if (typeInformation.active && typeInformation.active.length > 0) {
        for (const k in currentEntity) {
            typeInformation.active.forEach(function (att) {
                if (
                    (att.object_id && att.object_id === k && att.expression) ||
                    (att.name && att.name === k && att.expression)
                ) {
                    const m = currentEntity[k];
                    delete currentEntity[k];
                    currentEntity[k] = m; // put into the end of currentEntity
                }
            });
        }
    }
    logger.debug(context, 'sendUpdateValueNgsiLD \n currentEntity sorted %j ', currentEntity);
    let timestampValue;
    // Loop for each final attribute to apply alias, multientity and expressions
    for (const j in currentEntity) {
        // discard id and type
        if (j !== 'id' || j !== 'type') {
            // Apply Mapping Alias: object_id in attributes are in typeInformation.active
            let attr;
            let newAttr = payload[0][j];
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
                        'sendUpdateValueNgsiLD \n invalid mapping for attr %j \n newAttr %j',
                        attr,
                        newAttr
                    );
                    delete payload[0][attr.object_id];
                    attr = undefined; // stop processing attr
                    newAttr = undefined;
                } else {
                    ctxt[attr.name] = payload[0][j].value;
                }
            }
            logger.debug(
                context,
                'sendUpdateValueNgsiLD \n procesing j %j attr %j ctxt %j \n newAttr %j ',
                j,
                attr,
                ctxt,
                newAttr
            );

            if (attr && attr.type) {
                if (attr.type !== 'GeoProperty') {
                    newAttr.type = attr.type;
                }
            }

            // Apply expression
            if (attr && attr.expression) {
                logger.debug(
                    context,
                    'sendUpdateValueNgsiLD \n apply expression %j \n over ctxt %j \n and device %j',
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
                            'sendUpdateValueNgsiLD \n no context available for apply expression %j \n',
                            attr.expression
                        );
                        res = newAttr.value; // keep newAttr value
                    }
                } catch (e) {
                    logger.error(context, 'sendUpdateValueNgsiLD \n apply expression exception %j \n', e);
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
                            'sendUpdateValueNgsiLD \n apply expression result: isNaN || undefined || null'
                        );
                        if (res === 'null' && newAttr.type === 'None') {
                            newAttr.value = null;
                        } else {
                            delete payload[0][j]; // remove measure attr
                            attr = undefined; // stop process attr
                        }
                    }
                } else {
                    // jexl expression plugin
                    newAttr.value = res;
                }
                logger.debug(
                    context,
                    'sendUpdateValueNgsiLD \n apply expression result %j \n newAttr %j',
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
                                'sendUpdateValueNgsiLD \n MULTI no context available for apply expression %j \n',
                                attr.entity_name
                            );
                            newEntityName = attr.entity_name;
                        }
                        newEntityName = newEntityName ? newEntityName : attr.entity_name;
                    } catch (e) {
                        logger.error(context, 'sendUpdateValueNgsiLD \n MULTI apply expression exception %j \n', e);
                        newEntityName = attr.entity_name;
                    }
                    logger.debug(
                        context,
                        'sendUpdateValueNgsiLD \n MULTI apply expression %j \n result %j \n payload %j',
                        attr.entity_name,
                        newEntityName,
                        payload
                    );
                }

                let newEntity = {
                    id: newEntityName ? newEntityName : payload[0].id,
                    type: attr.entity_type ? attr.entity_type : payload[0].type
                };
                // Check if there is already a newEntity created
                const alreadyEntity = payload.find((entity) => {
                    return entity.id === newEntity.id && entity.type === newEntity.type;
                });
                if (alreadyEntity) {
                    // Use alreadyEntity
                    alreadyEntity[attr.name] = newAttr;
                } else {
                    // Add newEntity to payload
                    newEntity[attr.name] = newAttr;
                    if (
                        'timestamp' in typeInformation && typeInformation.timestamp !== undefined
                            ? typeInformation.timestamp
                            : config.getConfig().timestamp !== undefined
                            ? config.getConfig().timestamp
                            : timestampValue !== undefined
                    ) {
                        newEntity = NGSIv2.addTimestamp(newEntity, typeInformation.timezone, timestampValue);
                        logger.debug(context, 'sendUpdateValueNgsiLD \n timestamped newEntity=%j', newEntity);
                    }
                    payload.push(newEntity);
                }
                if (attr && attr.name) {
                    if (attr.name !== j) {
                        logger.debug(
                            context,
                            'sendUpdateValueNgsiLD \n MULTI remove measure attr %j keep alias j %j from %j \n',
                            j,
                            attr,
                            payload
                        );
                        delete payload[0][j];
                    }
                }
                // if (attr && (attr.entity_type || attr.entity_name))
            } else {
                // Not a multientity attr
                if (attr && attr.name) {
                    payload[0][attr.name] = newAttr;
                    if (attr.name !== j) {
                        delete payload[0][j]; // keep alias name, remove measure name
                    }
                }
                if (newAttr && newAttr.type === constants.TIMESTAMP_TYPE_NGSI2 && newAttr.value) {
                    const extendedTime = compressTimestampPlugin.fromBasicToExtended(newAttr.value);
                    if (extendedTime) {
                        // TBD: there is not flag about compressTimestamp in iotagent-node-lib,
                        // but there is one in agents
                        newAttr.value = extendedTime;
                    }
                }
                if (j === constants.TIMESTAMP_ATTRIBUTE) {
                    if (newAttr && newAttr.type === constants.TIMESTAMP_TYPE_NGSI2 && newAttr.value) {
                        timestampValue = newAttr.value;
                        logger.debug(
                            context,
                            'sendUpdateValueNgsiLD \n newAttr is TimeInstant and new payload=%j',
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
                    const extendedTime = compressTimestampPlugin.fromBasicToExtended(
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
            'sendUpdateValueNgsiLD \n after procesing attr %j \n current entity %j \n current payload=%j',
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
            if (Object.keys(payload[0]).length > 3) {
                // include metadata with TimeInstant in attrs when TimeInstant is provided as measure in all entities
                payload[0] = NGSIv2.addTimestamp(
                    payload[0],
                    typeInformation.timezone,
                    timestampValue,
                    false // skipMetadataAtt
                );
            } else {
                // Do not include metadata with TimeInstant in attrs when TimeInstant is provided as measure
                // and no more entities
                payload[0] = NGSIv2.addTimestamp(
                    payload[0],
                    typeInformation.timezone,
                    timestampValue,
                    true // skipMetadataAtt
                );
            }
        } else {
            // jshint maxdepth:5
            for (let n = 0; n < payload.length; n++) {
                if (!utils.isTimestampedNgsi2(payload[n])) {
                    // legacy check needed?
                    payload[n] = NGSIv2.addTimestamp(payload[n], typeInformation.timezone);
                    // jshint maxdepth:5
                } else if (!utils.IsValidTimestampedNgsi2(payload[n])) {
                    // legacy check needed?
                    logger.error(context, 'Invalid timestamp:%s', JSON.stringify(payload[0]));
                    callback(new errors.BadTimestamp(payload));
                    return;
                }
            }
        }
    }

    logger.debug(context, 'sendUpdateValueNgsiLD \n ending payload=%j', payload);

    for (let m = 0; m < payload.length; m++) {
        for (const key in payload[m]) {
            // purge object_id from payload
            if (payload[m][key] && payload[m][key].object_id) {
                delete payload[m][key].object_id;
            }
        }
        payload[m] = NGSIUtils.castJsonNativeAttributes(payload[m]); // native types
    }
    logger.debug(context, 'sendUpdateValueNgsiLD \n payload with native types and without object_id %j', payload);

    options.json = payload;
    try {
        if (payload instanceof Array) {
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

    // Prevent to update an entity with an empty payload
    if (
        Object.keys(options.json).length > 0 &&
        (options.json.length > 1 || (options.json.length === 1 && Object.keys(options.json[0]).length > 2)) // more than id and type
    ) {
        logger.debug(context, 'Updating device value in the Context Broker at [%s]', options.url);
        logger.debug(context, 'Using the following NGSI LD request:\n\n%s\n\n', JSON.stringify(options, null, 4));
        request(
            options,
            generateNGSILDOperationHandler('update', entityName, typeInformation, token, options, callback)
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

exports.convertAttrNGSILD = convertAttrNGSILD;
exports.formatAsNGSILD = formatAsNGSILD;
exports.sendUpdateValue = sendUpdateValueNgsiLD;
exports.sendQueryValue = sendQueryValueNgsiLD;
