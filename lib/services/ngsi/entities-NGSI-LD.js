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
const pluginUtils = require('../../plugins/pluginUtils');
const config = require('../../commonConfig');
const constants = require('../../constants');
const jexlParser = require('../../plugins/jexlParser');
const expressionPlugin = require('../../plugins/expressionPlugin');
const moment = require('moment-timezone');
const logger = require('logops');
const _ = require('underscore');
const context = {
    op: 'IoTAgentNGSI-LD'
};
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
            (response.statusCode === 200 || response.statusCode === 204 || response.statusCode === 201)
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
                callback(new errors.DeviceNotFound(entityName, typeInformation));
            } else {
                callback(new errors.EntityGenericError(entityName, typeInformation.type, typeInformation, body));
            }
        } else {
            logger.debug(context, 'Unknown error executing ' + operationName + ' operation');
            if (!(body instanceof Array || body instanceof Object)) {
                body = JSON.parse(body);
            }

            callback(
                new errors.EntityGenericError(
                    entityName,
                    typeInformation.type,
                    typeInformation,
                    body,
                    response.statusCode
                )
            );
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
        callback(new errors.TypeNotFound(null, entityName, typeInformation));
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
 * Makes an update in the Device's entity in the context broker, with the values given in the 'attributes' array.
 * This array should comply to the NGSI-LD's attribute format.
 *
 * @param {String} entityName       Name of the entity to register.
 * @param {Array} attributes        Attribute array containing the values to update.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
/**
 * Makes an update in the Device's entity in the context broker, with the values given in the 'attributes' array. This
 * array should comply to the NGSIv2's attribute format.
 *
 * @param {String} entityName       Name of the entity to register.
 * @param {Array} measures          measure array containing the values to update.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
function sendUpdateValueNgsiLD(entityName, originMeasures, originTypeInformation, token, callback) {
    //aux function used to builf JEXL context.
    //it returns a flat object from an Attr array
    function reduceAttrToPlainObject(attrs, initObj = {}) {
        if (attrs !== undefined && Array.isArray(attrs)) {
            return attrs.reduce((result, item) => {
                result[item.name] = item.value;
                return result;
            }, initObj);
        } else {
            return initObj;
        }
    }
    //Make a clone and overwrite
    const idTypeSSSList = pluginUtils.getIdTypeServSubServiceFromDevice(originTypeInformation);

    //Check mandatory information: type
    if (!originTypeInformation || !originTypeInformation.type) {
        callback(new errors.TypeNotFound(null, entityName, originTypeInformation));
        return;
    }

    const payload = []; //will store the final payload
    let entities = {};

    const currentIsoDate = new Date().toISOString();
    const currentMoment = moment(currentIsoDate);
    //Managing timestamp (mustInsertTimeInstant flag to decide if we should insert Timestamp later on)
    const mustInsertTimeInstant =
        originTypeInformation.timestamp !== undefined ? originTypeInformation.timestamp : false;

    // Check if measures is a single measure or a array of measures (a multimeasure)
    if (originMeasures[0] && !originMeasures[0][0]) {
        originMeasures = [originMeasures];
    }

    for (let measures of originMeasures) {
        entities = {}; //{entityName:{entityType:[attrs]}}  //SubGoal Populate entities data structure
        let jexlctxt = {}; //will store the whole context (not just for JEXL)

        let plainMeasures = null; //will contain measures POJO
        //Make a clone and overwrite
        const typeInformation = JSON.parse(JSON.stringify(originTypeInformation));

        //Rename all measures with matches with id and type to measure_id and measure_type
        for (const measure of measures) {
            if (measure.name === 'id' || measure.name === 'type') {
                measure.name = constants.MEASURE + measure.name;
            }
        }

        //Make a copy of measures in an plain object: plainMeasures
        plainMeasures = reduceAttrToPlainObject(measures);
        //Build the initital JEXL Context
        //All the measures (avoid references make another copy instead)
        jexlctxt = reduceAttrToPlainObject(measures);
        //All the static
        jexlctxt = reduceAttrToPlainObject(typeInformation.staticAttributes, jexlctxt);
        //id type Service and Subservice
        jexlctxt = reduceAttrToPlainObject(idTypeSSSList, jexlctxt);

        logger.debug(
            context,
            'sendUpdateValueNgsiLD loop with: entityName=%s,  measures=%j,  typeInformation=%j, initial jexlContext=%j, timestamp=%j',
            entityName,
            plainMeasures,
            typeInformation,
            jexlctxt,
            mustInsertTimeInstant
        );

        //Now we can calculate the EntityName of primary entity
        let entityNameCalc = null;
        if (typeInformation.entityNameExp !== undefined && typeInformation.entityNameExp !== '') {
            try {
                logger.debug(context, 'sendUpdateValueNgsiLD entityNameExp %j', typeInformation.entityNameExp);
                entityNameCalc = expressionPlugin.applyExpression(
                    typeInformation.entityNameExp,
                    jexlctxt,
                    typeInformation
                );
            } catch (e) {
                logger.debug(
                    context,
                    'Error evaluating expression for entityName: %j with context: %j',
                    typeInformation.entityNameExp,
                    jexlctxt
                );
            }
        }

        entityName = entityNameCalc ? entityNameCalc : entityName;
        //enrich JEXL context
        jexlctxt.entity_name = entityName;

        let preprocessedAttr = [];
        //Add Raw Static, Lazy, Command and Actives attr attributes
        if (typeInformation && typeInformation.staticAttributes) {
            preprocessedAttr = preprocessedAttr.concat(typeInformation.staticAttributes);
        }
        if (typeInformation && typeInformation.lazy) {
            preprocessedAttr = preprocessedAttr.concat(typeInformation.lazy);
        }
        if (typeInformation && typeInformation.active) {
            preprocessedAttr = preprocessedAttr.concat(typeInformation.active);
        }

        //Proccess every proto Attribute to populate entities data steuture
        entities[entityName] = {};
        entities[entityName][typeInformation.type] = [];

        for (const currentAttr of preprocessedAttr) {
            let hitted = false; //any measure, expressiom or value hit the attr (avoid propagate "silent attr" with null values )
            let attrEntityName = entityName;
            let attrEntityType = typeInformation.type;
            let valueExpression = null;
            //manage active attr without object__id (name by default)
            currentAttr.object_id = currentAttr.object_id ? currentAttr.object_id : currentAttr.name;
            //Enrich the attr (skip, hit, value, meta-timeInstant)
            currentAttr.skipValue = currentAttr.skipValue ? currentAttr.skipValue : null;

            //determine AttrEntityName for multientity
            if (
                currentAttr.entity_name !== null &&
                currentAttr.entity_name !== undefined &&
                currentAttr.entity_name !== '' &&
                typeof currentAttr.entity_name === 'string'
            ) {
                try {
                    logger.debug(
                        context,
                        'Evaluating attribute: %j, for entity_name(exp):%j, with ctxt: %j',
                        currentAttr.name,
                        currentAttr.entity_name,
                        jexlctxt
                    );
                    attrEntityName = jexlParser.applyExpression(currentAttr.entity_name, jexlctxt, typeInformation);
                    if (!attrEntityName) {
                        attrEntityName = currentAttr.entity_name;
                    }
                } catch (e) {
                    logger.debug(
                        context,
                        'Exception evaluating entityNameExp:%j, with jexlctxt: %j',
                        currentAttr.entity_name,
                        jexlctxt
                    );
                    attrEntityName = currentAttr.entity_name;
                }
            }

            //determine AttrEntityType for multientity
            if (
                currentAttr.entity_type !== null &&
                currentAttr.entity_type !== undefined &&
                currentAttr.entity_type !== '' &&
                typeof currentAttr.entity_type === 'string'
            ) {
                attrEntityType = currentAttr.entity_type;
            }

            //PRE POPULATE CONTEXT
            jexlctxt[currentAttr.name] = plainMeasures[currentAttr.object_id];

            //determine Value
            if (currentAttr.value !== undefined) {
                //static attributes already have a value
                hitted = true;
                valueExpression = currentAttr.value;
            } else if (plainMeasures[currentAttr.object_id] !== undefined) {
                //we have got a meaure for that Attr
                //actives ¿lazis?
                hitted = true;
                valueExpression = plainMeasures[currentAttr.object_id];
            }
            //remove measures that has been shadowed by an alias (some may be left and managed later)
            //Maybe we must filter object_id if there is name == object_id
            measures = measures.filter((item) => item.name !== currentAttr.object_id && item.name !== currentAttr.name);

            if (
                currentAttr.expression !== undefined &&
                currentAttr.expression !== '' &&
                typeof currentAttr.expression === 'string'
            ) {
                try {
                    hitted = true;
                    valueExpression = jexlParser.applyExpression(currentAttr.expression, jexlctxt, typeInformation);
                    //we fallback to null if anything unexpecte happend
                    if (valueExpression === null || valueExpression === undefined || Number.isNaN(valueExpression)) {
                        valueExpression = null;
                    }
                } catch (e) {
                    valueExpression = null;
                }
                logger.debug(
                    context,
                    'Evaluated attr: %j, with expression: %j, and ctxt: %j resulting: %j',
                    currentAttr.name,
                    currentAttr.expression,
                    jexlctxt,
                    valueExpression
                );
            }

            currentAttr.hitted = hitted;
            currentAttr.value = valueExpression;

            //store de New Attributte in entity data structure
            if (hitted === true) {
                if (entities[attrEntityName] === undefined) {
                    entities[attrEntityName] = {};
                }
                if (entities[attrEntityName][attrEntityType] === undefined) {
                    entities[attrEntityName][attrEntityType] = [];
                }
                //store de New Attributte
                entities[attrEntityName][attrEntityType].push(currentAttr);
            }

            //RE-Populate de JEXLcontext (except for null or NaN we preffer undefined)
            jexlctxt[currentAttr.name] = valueExpression;

            // Expand metadata value expression
            if (currentAttr.metadata) {
                for (const metaKey in currentAttr.metadata) {
                    if (currentAttr.metadata[metaKey].expression && metaKey !== constants.TIMESTAMP_ATTRIBUTE) {
                        const newAttrMeta = {};
                        if (currentAttr.metadata[metaKey].type) {
                            newAttrMeta.type = currentAttr.metadata[metaKey].type;
                        }
                        let metaValueExpression;
                        try {
                            metaValueExpression = jexlParser.applyExpression(
                                currentAttr.metadata[metaKey].expression,
                                jexlctxt,
                                typeInformation
                            );
                            //we fallback to null if anything unexpecte happend
                            if (
                                metaValueExpression === null ||
                                metaValueExpression === undefined ||
                                Number.isNaN(metaValueExpression)
                            ) {
                                metaValueExpression = null;
                            }
                        } catch (e) {
                            metaValueExpression = null;
                        }
                        newAttrMeta.value = metaValueExpression;
                        currentAttr.metadata[metaKey] = newAttrMeta;
                    }
                }
            }
        }

        //now we can compute explicit (Bool or Array) with the complete JexlContext
        let explicit = false;
        if (typeof typeInformation.explicitAttrs === 'string') {
            try {
                explicit = jexlParser.applyExpression(typeInformation.explicitAttrs, jexlctxt, typeInformation);
                if (explicit instanceof Array && explicit.length > 0 && mustInsertTimeInstant) {
                    explicit.push(constants.TIMESTAMP_ATTRIBUTE);
                }
                logger.debug(
                    context,
                    'Calculated explicitAttrs with expression: %j and ctxt: %j resulting: %j',
                    typeInformation.explicitAttrs,
                    jexlctxt,
                    explicit
                );
            } catch (e) {
                // nothing to do: exception is already logged at info level
            }
        } else if (typeof typeInformation.explicitAttrs === 'boolean') {
            explicit = typeInformation.explicitAttrs;
        }

        //more mesures may be added to the attribute list (unnhandled/left mesaures) l
        if (explicit === false && Object.keys(measures).length > 0) {
            entities[entityName][typeInformation.type] = entities[entityName][typeInformation.type].concat(measures);
        }

        //PRE-PROCESSING FINISHED
        //Explicit ATTRS and SKIPVALUES will be managed while we build NGSI payload
        //Get ready to build and send NGSI payload (entities-->payload)

        for (const ename in entities) {
            for (const etype in entities[ename]) {
                const e = {};
                e.id = String(ename);
                e.type = String(etype);
                const timestamp = { type: constants.TIMESTAMP_TYPE_NGSI2 }; //timestamp scafold-attr for insertions.
                let timestampAttrs = null;
                if (mustInsertTimeInstant) {
                    // get timestamp for current entity

                    timestampAttrs = entities[ename][etype].filter(
                        (item) => item.name === constants.TIMESTAMP_ATTRIBUTE
                    );
                    if (timestampAttrs && timestampAttrs.length > 0) {
                        timestamp.value = timestampAttrs[0].value;
                    }

                    if (timestamp.value) {
                        if (!moment(timestamp.value, moment.ISO_8601, true).isValid()) {
                            callback(new errors.BadTimestamp(timestamp.value, entityName, typeInformation));
                            return;
                        }
                    } else if (!typeInformation.timezone) {
                        timestamp.value = currentIsoDate;
                        jexlctxt[constants.TIMESTAMP_ATTRIBUTE] = timestamp.value;
                    } else {
                        timestamp.value = currentMoment
                            .tz(typeInformation.timezone)
                            .format('YYYY-MM-DD[T]HH:mm:ss.SSSZ');
                        jexlctxt[constants.TIMESTAMP_ATTRIBUTE] = timestamp.value;
                    }
                }
                //extract attributes
                let isEmpty = true;
                for (const attr of entities[ename][etype]) {
                    if (
                        attr.name !== 'id' &&
                        attr.name !== 'type' &&
                        (attr.value !== attr.skipValue || attr.skipValue === undefined) &&
                        (attr.hitted || attr.hitted === undefined) && //undefined is for pure measures
                        (typeof explicit === 'boolean' || //true and false already handled
                            (explicit instanceof Array && //check the array version
                                (explicit.includes(attr.name) ||
                                    explicit.some(
                                        (item) => attr.object_id !== undefined && item.object_id === attr.object_id
                                    ))))
                    ) {
                        isEmpty = false;
                        if (mustInsertTimeInstant) {
                            // Add TimeInstant to all attribute metadata of all entities
                            if (attr.name !== constants.TIMESTAMP_ATTRIBUTE) {
                                if (!attr.metadata) {
                                    attr.metadata = {};
                                }
                                attr.metadata[constants.TIMESTAMP_ATTRIBUTE] = timestamp;
                            }
                        }
                        e[attr.name] = { type: attr.type, value: attr.value, metadata: attr.metadata };
                    }
                }
                if (!isEmpty) {
                    if (mustInsertTimeInstant) {
                        e[constants.TIMESTAMP_ATTRIBUTE] = timestamp;
                    }
                    payload.push(e);
                }
            }
        }
    } // end for (let measures of originMeasures)

    const url = '/ngsi-ld/v1/entityOperations/upsert/?options=update';
    const options = NGSIUtils.createRequestObject(url, originTypeInformation, token);
    options.json = payload;

    try {
        if (payload instanceof Array) {
            options.json = _.map(options.json, formatAsNGSILD);
        } else {
            options.json.id = entityName;
            options.json.type = originTypeInformation.type;
            options.json = [formatAsNGSILD(options.json)];
        }
    } catch (error) {
        return callback(new errors.BadGeocoordinates(JSON.stringify(payload), originTypeInformation));
    }

    if (originTypeInformation.active) {
        addLinkedEntities(originTypeInformation, options.json);
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
            generateNGSILDOperationHandler('update', entityName, originTypeInformation, token, options, callback)
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
exports.sendUpdateValue = function (entityName, attributes, typeInformation, token, callback) {
    NGSIUtils.applyMiddlewares(NGSIUtils.updateMiddleware, attributes, typeInformation, () => {
        return sendUpdateValueNgsiLD(entityName, attributes, typeInformation, token, callback);
    });
};
exports.sendQueryValue = sendQueryValueNgsiLD;
