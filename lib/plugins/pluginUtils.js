/*
 * Copyright 2015 Telefonica Investigación y Desarrollo, S.A.U
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
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */

'use strict';

var config = require('../commonConfig');

/**
 * Creates an array of attributes from an entity
 * @param       {Object}             entity
 * @return      {Object}             Array of attributes extracted from the entity
 */
function extractAttributesArrayFromNgsi2Entity(entity) {
    var attsArray = [];
    for (var i in entity) {
        if (entity.hasOwnProperty(i)) {
            if (i !== 'id' && i !== 'type') {
                var att = Object.assign({}, entity[i]);
                if (att.multi) {
                    // jshint maxdepth:5
                    for (var j in att.multi) {
                        var matt = Object.assign({}, entity[i].multi[j]);
                        matt.name = i;
                        attsArray.push(matt);
                    }
                    delete att.multi;
                }
                att.name = i;
                attsArray.push(att);
            }
        }
    }

    return attsArray;
}

/**
 * Creates a NGSIv2 entity.
 *
 * @param      {String}  id         The identifier
 * @param      {String}  type       The type
 * @param      {Object}  attsArray  The atts array
 * @param      {Object}  withObjectId  The flag to keep object_id
 * @return     {Object}  A NGSIv2 entity
 */
function createNgsi2Entity(id, type, attsArray, withObjectId) {
    var entity = {};
    entity.id = id;
    entity.type = type;
    for (var i = 0; i < attsArray.length; i++) {
        /*jshint camelcase: false */
        if (entity[attsArray[i].name] && withObjectId && attsArray[i].object_id) {
            // Check if multiple measures with multientity attributes with same name(#635)
            if (!entity[attsArray[i].name].multi) {
                entity[attsArray[i].name].multi = [];
            }
            entity[attsArray[i].name].multi.push({
                'type' : attsArray[i].type,
                'value' : attsArray[i].value,
                /*jshint camelcase: false */
                'object_id' : attsArray[i].object_id,
                'metadata' : attsArray[i].metadata
            });
        } else {
            entity[attsArray[i].name] = {
                'type' : attsArray[i].type,
                'value' : attsArray[i].value,
                'metadata' : attsArray[i].metadata
            };
            if (withObjectId && attsArray[i].object_id) {
               entity[attsArray[i].name].object_id = attsArray[i].object_id;
            }
        }
    }

    return entity;
}

function createProcessAttribute(fn, attributeType) {
    return function(attribute) {

        if (attribute.type && attribute.type === attributeType) {
            attribute.value = fn(attribute.value);
        }

        if (config.checkNgsi2()) {
            if (attribute.metadata) {
                attribute.metadata = attribute.metadata.map(createProcessAttribute(fn, attributeType));
            }
        } else {
            if (attribute.metadatas) {
                attribute.metadatas = attribute.metadatas.map(createProcessAttribute(fn, attributeType));
            }
        }

        return attribute;
    };
}

/**
 * Create a new filter for update requests. The filter will apply the given function to the value
 * of every attribute of the given type.
 *
 * @param {Function} fn             Function to apply. Should take one value and return one value.
 * @param {String} attributeType    Name of the type of attributes to modify
 * @return {query}                  Filter ready to be used in data filter plugins.
 */

function createUpdateFilter(fn, attributeType) {
    return function update(entity, typeInformation, callback) {
        function processEntityUpdateNgsi1(entity) {
            entity.attributes = entity.attributes.map(
                createProcessAttribute(fn, attributeType));

            return entity;
        }

        function processEntityUpdateNgsi2(entity) {
            var attsArray = extractAttributesArrayFromNgsi2Entity(entity);
            attsArray = attsArray.map(createProcessAttribute(fn, attributeType));
            entity = createNgsi2Entity(entity.id, entity.type, attsArray, true);
            return entity;
        }

        if (config.checkNgsi2()) {
            entity = processEntityUpdateNgsi2(entity);
        } else {
            entity.contextElements = entity.contextElements.map(processEntityUpdateNgsi1);
        }

        callback(null, entity, typeInformation);
    };
}

/**
 * Create a new filter for query responses. The filter will apply the given function to the value
 * of every attribute of the given type.
 *
 * @param {Function} fn             Function to apply. Should take one value and return one value.
 * @param {String} attributeType    Name of the type of attributes to modify
 * @return {query}                  Filter ready to be used in data filter plugins.
 */
function createQueryFilter(fn, attributeType) {
    return function query(entity, typeInformation, callback) {
        function processEntityQueryNgsi1(entity) {
            entity.contextElement.attributes = entity.contextElement.attributes.map(
                createProcessAttribute(fn, attributeType));

            return entity;
        }

        function processEntityQueryNgsi2(entity) {
            var attsArray = extractAttributesArrayFromNgsi2Entity(entity);
            attsArray = attsArray.map(createProcessAttribute(fn, attributeType));
            entity = createNgsi2Entity(entity.id, entity.type, attsArray);
            return entity;
        }

        if (config.checkNgsi2()) {
            entity = processEntityQueryNgsi2(entity);
        } else {
            entity.contextResponses = entity.contextResponses.map(processEntityQueryNgsi1);
        }

        callback(null, entity, typeInformation);
    };
}

/**
 * Creates an empty filter that does not change anything.
 *
 * @param {Object} entity               Data identifiying the requesting entity.
 * @param {Object} typeInformation      Information about the device corresponding to that entity.
 */
function identityFilter(entity, typeInformation, callback) {
    callback(null, entity, typeInformation);
}

exports.createProcessAttribute = createProcessAttribute;
exports.createUpdateFilter = createUpdateFilter;
exports.createQueryFilter = createQueryFilter;
exports.identityFilter = identityFilter;
exports.createNgsi2Entity = createNgsi2Entity;
exports.extractAttributesArrayFromNgsi2Entity = extractAttributesArrayFromNgsi2Entity;
