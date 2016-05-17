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
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 */

'use strict';

function createProcessAttribute(fn, attributeType) {
    return function(attribute) {
        if (attribute.type && attribute.type === attributeType) {

            attribute.value = fn(attribute.value);
        }

        if (attribute.metadatas) {
            attribute.metadatas = attribute.metadatas.map(createProcessAttribute(fn, attributeType));
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
        function processEntityUpdate(entity) {
            entity.attributes = entity.attributes.map(
                createProcessAttribute(fn, attributeType));

            return entity;
        }

        entity.contextElements = entity.contextElements.map(processEntityUpdate);

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
        function processEntityQuery(entity) {
            entity.contextElement.attributes = entity.contextElement.attributes.map(
                createProcessAttribute(fn, attributeType));

            return entity;
        }

        entity.contextResponses = entity.contextResponses.map(processEntityQuery);

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
