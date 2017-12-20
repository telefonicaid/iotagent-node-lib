/*
 * Copyright 2016 Telefonica Investigación y Desarrollo, S.A.U
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

/* jshint camelcase: false */

var _ = require('underscore'),
    parser = require('./expressionParser');

function hasEntityName(item) {
    return item.entity_name;
}

/**
 * Return a list of all the attributes that don't have a multientity option.
 *
 * @param {Array} originalAttrs        Array of original attributes coming from the single-entity device.
 * @param {Array} meAttributes         Array of all the multientity attributes.
 * @return {Array}                     List of all the attrbiutes without multientity flag.
 */
function filterOutMultientities(originalAttrs, meAttributes) {
    return originalAttrs.filter(function(item) {
        return !_.contains(meAttributes, item.name);
    });
}

/**
 * Generate new Context Elements for each new Entity, with the attributes of the original entity matching its
 * entity_name.
 *
 * @param {Object} entity                   The original entity
 * @param {Array} newEntities               List of the new entities that will be generated
 * @param {Array} entityTypes               Map of the types for each entity ID
 * @param {Object} typeInformation          Object with all the data about the device type
 * @param {Array} multiEntityAttributes     List of attributes with multientity option
 * @return {Array}                          List of the new Context Entities
 */
function generateNewCEs(entity, newEntities, entityTypes, typeInformation, multiEntityAttributes) {
    var result = [],
        newEntityAttributes,
        newEntityAttributeNames,
        entityName,
        context;

    function filterByEntityName(entityName) {
        return function(item) {
            return item.entity_name === entityName;
        };
    }

    function filterByAttributeNames(item) {
        return _.contains(newEntityAttributeNames, item.name);
    }

    context = parser.extractContext(entity.contextElements[0].attributes);

    for (var i = 0; i < newEntities.length; i++) {
        newEntityAttributeNames = _.pluck(multiEntityAttributes.filter(filterByEntityName(newEntities[i])), 'name');

        newEntityAttributes = entity.contextElements[0].attributes.filter(filterByAttributeNames);

        entityName = parser.applyExpression(newEntities[i], context, typeInformation);

        result.push({
            type: entityTypes[newEntities[i]],
            isPattern: 'false',
            id: entityName,
            attributes: newEntityAttributes
        });
    }

    return result;
}

function extractTypes(attributeList, defaultType) {
    var typeMap = {};

    for (var i = 0; i < attributeList.length; i++) {
        typeMap[attributeList[i].entity_name] = attributeList[i].entity_type || defaultType;
    }

    return typeMap;
}

function updateAttribute(entity, typeInformation, callback) {
    if (typeInformation.active) {
        var multiEntityAttributes = typeInformation.active.filter(hasEntityName),
            newEntities = _.pluck(multiEntityAttributes, 'entity_name'),
            attributesList = _.pluck(multiEntityAttributes, 'name'),
            entityTypes = extractTypes(multiEntityAttributes, entity.contextElements[0].type),
            resultAttributes;

        resultAttributes = filterOutMultientities(entity.contextElements[0].attributes, attributesList);

        entity.contextElements = entity.contextElements.concat(
            generateNewCEs(entity, newEntities, entityTypes, typeInformation, multiEntityAttributes));

        entity.contextElements[0].attributes = resultAttributes;
    }

    callback(null, entity, typeInformation);
}

exports.update = updateAttribute;
