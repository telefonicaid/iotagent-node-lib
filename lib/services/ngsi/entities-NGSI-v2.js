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
const alarms = require('../common/alarmManagement');
const errors = require('../../errors');
const pluginUtils = require('../../plugins/pluginUtils');
const constants = require('../../constants');
const jexlParser = require('../../plugins/jexlParser');
const expressionPlugin = require('../../plugins/expressionPlugin');
const moment = require('moment-timezone');
const NGSIUtils = require('./ngsiUtils');
const logger = require('logops');
const context = {
    op: 'IoTAgentNGSI.Entities-v2'
};

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
        callback(new errors.TypeNotFound(null, entityName, typeInformation));
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
 * Makes an update in the Device's entity in the context broker, with the values given in the 'attributes' array. This
 * array should comply to the NGSIv2's attribute format.
 *
 * @param {String} entityName       Name of the entity to register.
 * @param {Array} measures          measure array containing the values to update.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
function sendUpdateValueNgsi2(entityName, originMeasures, originTypeInformation, token, callback) {
    //aux functions used to builf JEXL context.
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
    //it returns a metadata object using the same structure described
    // at https://github.com/telefonicaid/fiware-orion/blob/master/doc/manuals/orion-api.md#metadata-support
    function reduceMetadataAttrToPlainObject(attrs, initObj = {}) {
        if (attrs !== undefined && Array.isArray(attrs)) {
            return attrs.reduce((result, item) => {
                if (result['metadata'] === undefined) {
                    result['metadata'] = {};
                }
                if (item.metadata !== undefined) {
                    result['metadata'][item.name] = {};
                    for (var meta in item.metadata) {
                        result['metadata'][item.name][meta] = item.metadata[meta].value;
                    }
                }
                return result;
            }, initObj);
        } else {
            return initObj;
        }
    }

    //Make a clone and overwrite
    let idTypeSSSList = pluginUtils.getIdTypeServSubServiceFromDevice(originTypeInformation);

    //Check mandatory information: type
    if (!originTypeInformation || !originTypeInformation.type) {
        callback(new errors.TypeNotFound(null, entityName, originTypeInformation));
        return;
    }

    let payload = {}; //will store the final payload
    let entities = {};
    payload.actionType = 'append';
    payload.entities = [];

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
        let typeInformation = JSON.parse(JSON.stringify(originTypeInformation));

        //Rename all measures with matches with id and type to measure_id and measure_type
        for (let measure of measures) {
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
        //metadata attributes
        jexlctxt = reduceMetadataAttrToPlainObject(typeInformation.active, jexlctxt);
        //metadata static attributes
        jexlctxt = reduceMetadataAttrToPlainObject(typeInformation.staticAttributes, jexlctxt);

        logger.debug(
            context,
            'sendUpdateValueNgsi2 loop with: entityName=%s,  measures=%j,  typeInformation=%j, initial jexlContext=%j, timestamp=%j',
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
                logger.debug(context, 'sendUpdateValueNgsi2 entityNameExp %j', typeInformation.entityNameExp);
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
        jexlctxt['entity_name'] = entityName;

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

        for (let currentAttr of preprocessedAttr) {
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
                typeof currentAttr.entity_name == 'string'
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
                typeof currentAttr.expression == 'string'
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
                for (var metaKey in currentAttr.metadata) {
                    if (currentAttr.metadata[metaKey].expression && metaKey !== constants.TIMESTAMP_ATTRIBUTE) {
                        let newAttrMeta = {};
                        if (currentAttr.metadata[metaKey].type) {
                            newAttrMeta['type'] = currentAttr.metadata[metaKey].type;
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
                        newAttrMeta['value'] = metaValueExpression;
                        currentAttr.metadata[metaKey] = newAttrMeta;

                        //RE-Populate de JEXLcontext
                        // It is possible metadata is still not in ctxt
                        if (!jexlctxt.metadata) {
                            jexlctxt.metadata = {};
                        }
                        if (!jexlctxt.metadata[currentAttr.name]) {
                            jexlctxt.metadata[currentAttr.name] = {};
                        }
                        jexlctxt.metadata[currentAttr.name][currentAttr.metadata[metaKey]] = metaValueExpression;
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
        } else if (typeof typeInformation.explicitAttrs == 'boolean') {
            explicit = typeInformation.explicitAttrs;
        }

        //more mesures may be added to the attribute list (unnhandled/left mesaures) l
        if (explicit === false && Object.keys(measures).length > 0) {
            entities[entityName][typeInformation.type] = entities[entityName][typeInformation.type].concat(measures);
        }

        //PRE-PROCESSING FINISHED
        //Explicit ATTRS and SKIPVALUES will be managed while we build NGSI payload
        //Get ready to build and send NGSI payload (entities-->payload)

        for (let ename in entities) {
            for (let etype in entities[ename]) {
                let e = {};
                e.id = String(ename);
                e.type = String(etype);
                let timestamp = { type: constants.TIMESTAMP_TYPE_NGSI2 }; //timestamp scafold-attr for insertions.
                let timestampAttrs = null;
                if (mustInsertTimeInstant) {
                    // get timestamp for current entity

                    timestampAttrs = entities[ename][etype].filter(
                        (item) => item.name === constants.TIMESTAMP_ATTRIBUTE
                    );
                    if (timestampAttrs && timestampAttrs.length > 0) {
                        timestamp.value = timestampAttrs[0]['value'];
                    }

                    if (timestamp.value) {
                        if (!moment(timestamp.value, moment.ISO_8601, true).isValid()) {
                            callback(new errors.BadTimestamp(timestamp.value, entityName, typeInformation));
                            return;
                        }
                    } else {
                        if (!typeInformation.timezone) {
                            timestamp.value = currentIsoDate;
                            jexlctxt[constants.TIMESTAMP_ATTRIBUTE] = timestamp.value;
                        } else {
                            timestamp.value = currentMoment
                                .tz(typeInformation.timezone)
                                .format('YYYY-MM-DD[T]HH:mm:ss.SSSZ');
                            jexlctxt[constants.TIMESTAMP_ATTRIBUTE] = timestamp.value;
                        }
                    }
                }
                //extract attributes
                let isEmpty = true;
                for (let attr of entities[ename][etype]) {
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
                    payload.entities.push(e);
                }
            }
        }
    } // end for (let measures of originMeasures)
    let url = '/v2/op/update';
    if (originTypeInformation.useCBflowControl) {
        url += '?options=flowControl';
    }
    let options = NGSIUtils.createRequestObject(url, originTypeInformation, token);
    options.json = payload;

    // Prevent to update an entity with an empty payload: more than id and type
    if (
        Object.keys(options.json).length > 0 &&
        (options.json.entities.length > 1 ||
            (options.json.entities.length === 1 && Object.keys(options.json.entities[0]).length > 2))
    ) {
        // Final check: (to keep tests unchanged) before do CB requests
        //              one entity     -> request /v2/entities/ + entityName + /atts ?type=typeInformation.type
        //              multi entities -> request /v2/op/update
        // Note that the options object is prepared for the second case (multi entity), so we "patch" it
        // only in the first case

        //Multi: multientity (more than one name o more than one type at primary entity)
        //  of multimeasure (originMeasures is an array of more than one element)
        let multi =
            Object.keys(entities).length > 1 ||
            Object.keys(entities[entityName]).length > 1 ||
            originMeasures.length > 1;

        if (!multi) {
            // recreate options object to use single entity update
            url = '/v2/entities?options=upsert';
            if (originTypeInformation.useCBflowControl) {
                url += ',flowControl';
            }
            options = NGSIUtils.createRequestObject(url, originTypeInformation, token);
            delete payload.actionType;

            let entityAttrs = payload.entities[0];
            const transformedObject = {};
            for (let attrname in entityAttrs) {
                let attr = entityAttrs[attrname];
                transformedObject[attrname] = {
                    type: attr.type,
                    value: attr.value,
                    metadata: attr.metadata
                };
            }
            transformedObject.id = entityAttrs.id;
            transformedObject.type = entityAttrs.type;
            options.json = transformedObject;
            options.method = 'POST';
        } else if (payload.entities.every((entity) => 'TimeInstant' in entity)) {
            // Try sort entities by TimeInstant
            payload.entities.sort(
                (a, b) => new Date(a.TimeInstant.value).getTime() - new Date(b.TimeInstant.value).getTime()
            );
            options.json = payload;
        } else {
            // keep current options object created for a batch update
            logger.debug(
                context,
                "some entities lack the 'TimeInstant' key. Sorting is not feasible: %j ",
                payload.entities
            );
        }

        //Send the NGSI request
        logger.debug(context, 'Updating device value in the Context Broker at: %j', options.url);
        logger.debug(context, 'Using the following NGSI v2 request: %j', options);

        request(
            options,
            generateNGSI2OperationHandler('update', entityName, originTypeInformation, token, options, callback)
        );
    } else {
        logger.debug(
            context,
            'Not updating device value in the Context Broker at: %j, due to empty payload: %j',
            options.url,
            options
        );
        callback(null);
    }
}

exports.sendQueryValue = sendQueryValueNgsi2;
exports.sendUpdateValue = function (entityName, measures, typeInformation, token, callback) {
    NGSIUtils.applyMiddlewares(NGSIUtils.updateMiddleware, measures, typeInformation, () => {
        return sendUpdateValueNgsi2(entityName, measures, typeInformation, token, callback);
    });
};

exports.formatGeoAttrs = formatGeoAttrs;
