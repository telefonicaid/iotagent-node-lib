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
    _ = require('underscore'),
    context = {
        op: 'IoTAgentNGSI.Entities-LD'
    },
    NGSIv2 = require('./entities-NGSI-v2'),
    NGSIUtils = require('./ngsiUtils');

const NGSI_LD_NULL = {'@type':  'Intangible', '@value':  null};
const NGSI_LD_URN = 'urn:ngsi-ld:';

function valueOfOrNull(value){
    return isNaN(value) ?  NGSI_LD_NULL : value;
}

function splitLngLat(value){
   var lngLats =  (typeof value === 'string' ||  value instanceof String ) ?  value.split(','): value;
   lngLats.forEach((element, index, lngLats)  => {
     if (Array.isArray(element)){
        lngLats[index] = splitLngLat(element);
     } else if (( typeof element  === 'string' ||  element instanceof String) && element.includes(',') ){
        lngLats[index] = splitLngLat(element);
     } else  {
        lngLats[index] = Number.parseFloat(element);
    }
   });
   return lngLats;
}

function getLngLats(value){
    var lngLats = _.flatten(splitLngLat(value));
    if (lngLats.length === 2){
        return lngLats;
    } 

    if (lngLats.length % 2 !== 0){
        logger.error(context, 'Bad attribute value type.' +
            'Expecting geo-coordinates. Received:%s', value);
        throw Error();
    }
    var arr = [];
    for (var i = 0, len = lngLats.length; i < len; i = i + 2) {
        arr.push([lngLats[i], lngLats[i+1]]);
    }
    return arr;
}




function convertNGSIv2ToLD(attr){
    var obj = {type: 'Property', value: attr.value};
    switch (attr.type.toLowerCase()) {
        // Properties
        case 'property':
        case 'string':
            break;

       
       
        // Other Native JSON Types
        case 'boolean':
            obj.value = (!!attr.value);
             break;
        case 'float':
            obj.value =  valueOfOrNull(Number.parseFloat (attr.value));
            break;
        case 'integer':
            obj.value = valueOfOrNull(Number.parseInt(attr.value));
            break;
        case 'number':
            if (NGSIUtils.isFloat(attr.value)) {
               obj.value = valueOfOrNull(Number.parseFloat (attr.value));
            } else {
                obj.value = valueOfOrNull(Number.parseInt (attr.value));
            }
            break;
       
        // Temporal Properties
        case 'datetime':
            obj.value = { 
                '@type': 'DateTime', 
                '@value': moment.tz(attr.value, 'Etc/UTC').toISOString()};
            break;
        case 'date':
            obj.value = { 
                '@type': 'Date', 
                '@value': moment.tz(attr.value, 'Etc/UTC').format(moment.HTML5_FMT.DATE)};
            break;
        case 'time':
            obj.value = {
                '@type': 'Time', 
                '@value': moment.tz(attr.value, 'Etc/UTC').format(moment.HTML5_FMT.TIME_SECONDS)};
            break;

        // GeoProperties
        case 'geoproperty':
        case 'point':
        case 'geo:point':
            obj.type = 'GeoProperty';
            obj.value = {type: 'Point', coordinates: getLngLats(attr.value)}; 
            break;
        case 'linestring':
        case 'geo:linestring':
            obj.type = 'GeoProperty';
            obj.value = { type: 'LineString', coordinates: getLngLats(attr.value)}; 
            break;
        case 'polygon':
        case 'geo:polygon':
            obj.type = 'GeoProperty';
            obj.value = { type: 'Polygon', coordinates: getLngLats(attr.value)}; 
            break;
        case 'multipoint':
        case 'geo:multipoint':
            obj.type = 'GeoProperty';
            obj.value = { type: 'MultiPoint', coordinates: getLngLats(attr.value)}; 
            break;
        case 'multilinestring':
        case 'geo:multilinestring':
            obj.type = 'GeoProperty';
            obj.value = { type: 'MultiLineString', coordinates: attr.value};
            break;
        case 'multipolygon':
        case 'geo:multipolygon':
            obj.type = 'GeoProperty';
            obj.value = { type: 'MultiPolygon', coordinates: attr.value};
            break;

        // Relationships
        case 'relationship':
            obj.type = 'Relationship';
            obj.object = attr.value;
            delete obj.value;
            break;

        default:
            obj.value = {'@type': attr.type, '@value':  attr.value};
        }

    if (attr.metadata){
        Object.keys(attr.metadata).forEach(function(key) {
           switch (key) {
                case constants.TIMESTAMP_ATTRIBUTE:
                    var timestamp = attr.metadata[key].value;
                    if(timestamp ===  constants.ATTRIBUTE_DEFAULT || !(moment(timestamp).isValid())){
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

function formatAsNGSILD(json){
    var obj = {'@context' : config.getConfig().contextBroker.jsonLdContext};
    Object.keys(json).forEach(function(key) {
        switch (key) {
            case 'id':
                var id = json[key];
                obj[key] = id.startsWith(NGSI_LD_URN) ? id : NGSI_LD_URN + json.type + ':' + id;
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
    return function(error, response, body) {
        if (error) {
            logger.error(context, 'Error found executing ' + operationName + ' action in Context Broker: %s', error);

            alarms.raise(constants.ORION_ALARM, error);
            callback(error);
        } else if (body && body.orionError) {
            logger.debug(context, 'Orion error found executing ' + operationName + ' action in Context Broker: %j',
                body.orionError);

            callback(new errors.BadRequest(body.orionError.details));
        } else if (response && operationName === 'update' && (response.statusCode === 200)) {
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
        } else if (response && (response.statusCode === 403 || response.statusCode === 401)) {
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

            var errorField = NGSIUtils.getErrorField(body);
            if (response.statusCode && response.statusCode === 404 &&
                errorField.details.includes(typeInformation.type) ) {
                callback(new errors.DeviceNotFound(entityName));
            }
            else if (errorField.code && errorField.code === '404') {
                callback(new errors.AttributeNotFound());
            }
            else {
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
 * Makes an update in the Device's entity in the context broker, with the values given in the 'attributes' array. This
 * array should comply to the NGSIv2's attribute format.
 *
 * @param {String} entityName       Name of the entity to register.
 * @param {Array} attributes        Attribute array containing the values to update.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
function sendUpdateValueNgsiLD(entityName, attributes, typeInformation, token, callback) {

    var payload = {};

    /*var url = '/ngsi-ld/v1/entities/' + entityName + '/attrs';

    if (typeInformation.type) {
       url += '?type=' + typeInformation.type;
    }*/

    var url = '/ngsi-ld/v1/entityOperations/upsert/';

    var options = NGSIUtils.createRequestObject(url, typeInformation, token);
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

 
    for (var i = 0; i < attributes.length; i++) {
        if (attributes[i].name && attributes[i].type) {

            payload[attributes[i].name] = {
                'value' : attributes[i].value,
                'type' : attributes[i].type
            };
            var metadata = NGSIUtils.getMetaData(typeInformation, attributes[i].name, attributes[i].metadata);
            if (metadata){
                payload[attributes[i].name].metadata = metadata;
            }

        } else {
            callback(new errors.BadRequest(null, entityName));
            return;
        }
    }

    payload = NGSIUtils.castJsonNativeAttributes(payload);
    async.waterfall([
        apply(statsService.add, 'measureRequests', 1),
        apply(NGSIUtils.applyMiddlewares, NGSIUtils.updateMiddleware, payload, typeInformation)],
        function(error, result) {
        if (error) {
            callback(error);
        } else {
            if (result) {
                // The payload has been transformed by multientity plugin. It is not a JSON object but an Array.
                if (result instanceof Array) {

                    if ( ('timestamp' in typeInformation && typeInformation.timestamp !==
                        undefined) ? typeInformation.timestamp : config.getConfig().timestamp) {
                        // jshint maxdepth:5
                        if (!utils.isTimestampedNgsi2(result)) {
                            options.json = NGSIv2.addTimestamp(result, typeInformation.timezone);
                        // jshint maxdepth:5
                        } else if (!utils.IsValidTimestampedNgsi2(result)) {
                            logger.error(context, 'Invalid timestamp:%s', JSON.stringify(result));
                            callback(new errors.BadTimestamp(result));
                            return;
                        }
                    }

                    options.json = result;
                    
                } else {
                    delete result.id;
                    delete result.type;
                    options.json = result;
                    logger.debug(context, 'typeInformation: %j', typeInformation);
                    if ( ('timestamp' in typeInformation && typeInformation.timestamp !==
                        undefined) ? typeInformation.timestamp : config.getConfig().timestamp) {
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
            var att;
            if (options.json) {
                for (var entity = 0; entity < options.json.length; entity++) {
                    for (att in options.json[entity]) {
                        /*jshint camelcase: false */
                        if (options.json[entity][att].object_id) {
                            /*jshint camelcase: false */
                            delete options.json[entity][att].object_id;
                        }
                        if (options.json[entity][att].multi) {
                            delete options.json[entity][att].multi;
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
                }
            }

            try {

               
                if (result instanceof Array) {
                    options.json = _.map(options.json, formatAsNGSILD);
                }
                else {
                    options.json.id = entityName;
                    options.json.type = typeInformation.type;
                    options.json = [formatAsNGSILD(options.json)];
                }
            } catch (error) {
                return callback(new errors.BadGeocoordinates(JSON.stringify(payload)));
            }
         
            logger.debug(context, 'Updating device value in the Context Broker at [%s]', options.url);
            logger.debug(context, 'Using the following NGSI-LD request:\n\n%s\n\n', JSON.stringify(options, null, 4));


            //console.error(JSON.stringify(options, null, 4));

            request(options,
                generateNGSILDOperationHandler('update', entityName, typeInformation, token, options, callback));
        }
    });
}






exports.formatAsNGSILD= formatAsNGSILD;
exports.sendUpdateValue = sendUpdateValueNgsiLD;