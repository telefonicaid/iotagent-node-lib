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
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 *
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */

'use strict';

/* jshint camelcase: false */

var _ = require('underscore'),
    constants = require('../constants'),
    parser = require('./expressionParser'),
    config = require('../commonConfig'),
     /*jshint unused:false*/
    logger = require('logops'),
     /*jshint unused:false*/
    context = {
        op: 'IoTAgentNGSI.MultiEntityPlugin'
    },
    utils = require('./pluginUtils'),
    aliasPlugin = require('./attributeAlias');


function hasEntityName(item) {
    return item.entity_name;
}

/**
 * Return a list of all the attributes that don't have a multientity option. It considers NGSIv1.
 *
 * @param {Array} originalAttrs        Array of original attributes coming from the single-entity device.
 * @param {Array} meAttributes         Array of all the multientity attributes.
 * @return {Array}                     List of all the attrbiutes without multientity flag.
 */
function filterOutMultientitiesNgsi1(originalAttrs, meAttributes) {
    return originalAttrs.filter(function(item) {
        return !_.contains(meAttributes, item.name);
    });
}

/**
 * Return a list of all the attributes that don't have a multientity option. It considers NGSIv2.
 *
 * @param {Array} originalAttrs        Array of original attributes coming from the single-entity device.
 * @param {Array} meAttributes         Array of all the multientity attributes.
 * @return {Array}                     List of all the attrbiutes without multientity flag.
 */
function filterOutMultientitiesNgsi2(originalAttrs, meAttributes) {
    var result = {};
    for (var att in originalAttrs) {
        if (originalAttrs.hasOwnProperty(att)) {
            if (!_.contains(meAttributes, att)) {
                result[att] = originalAttrs[att];
            }
        }
    }

    return result;
}

/**
 * Generate new Context Elements for each new Entity, with the attributes of the original entity matching its
 * entity_name. It considers Ngsiv1.
 *
 * @param {Object} entity                   The original entity
 * @param {Array} newEntities               List of the new entities that will be generated
 * @param {Array} entityTypes               Map of the types for each entity ID
 * @param {Object} typeInformation          Object with all the data about the device type
 * @param {Array} multiEntityAttributes     List of attributes with multientity option
 * @return {Array}                          List of the new Context Entities
 */
function generateNewCEsNgsi1(entity, newEntities, entityTypes, typeInformation, multiEntityAttributes) {
    var result = [],
        newEntityAttributes,
        newEntityAttributeNames,
        entityName,
        ctx;

    function filterByEntityName(entityName) {
        return function(item) {
            return item.entity_name === entityName;
        };
    }

    function filterByAttributeNames(item) {
        return _.contains(newEntityAttributeNames, item.name);
    }

    ctx = parser.extractContext(entity.contextElements[0].attributes);

    for (var i = 0; i < newEntities.length; i++) {
        newEntityAttributeNames = _.pluck(multiEntityAttributes.filter(filterByEntityName(newEntities[i])), 'name');

        newEntityAttributes = entity.contextElements[0].attributes.filter(filterByAttributeNames);
        // Fix duplicated attributes in entity
        newEntityAttributes = _.uniq(newEntityAttributes, JSON.stringify);
        entityName = parser.applyExpression(newEntities[i], ctx, typeInformation);

        result.push({
            type: entityTypes[newEntities[i]],
            isPattern: 'false',
            id: entityName,
            attributes: newEntityAttributes
        });
    }

    return result;
}


/**
 * Generate new Context Elements for each new Entity, with the attributes of the original entity matching its
 * entity_name. It considers Ngsiv2.
 *
 * @param {Object} entity                   The original entity
 * @param {Array} newEntities               List of the new entities that will be generated
 * @param {Array} entityTypes               Map of the types for each entity ID
 * @param {Object} typeInformation          Object with all the data about the device type
 * @param {Array} multiEntityAttributes     List of attributes with multientity option
 * @return {Array}                          List of the new Context Entities
 */
function generateNewCEsNgsi2(entity, newEntities, entityTypes, typeInformation, multiEntityAttributes) {

    var result = [],
        newEntityAttributes,
        newEntityAttributeNames,
        newEntityAttributeObjectIds,
        entityName,
        ctx;

    function filterByEntityName(entityName) {
        return function(item) {
            return item.entity_name === entityName;
        };
    }

    function filterAttributes() {
        var result = {};
        var mappings = aliasPlugin.extractAllMappings(typeInformation);
        for (var att in entity) {
            if (entity.hasOwnProperty(att)) {
                if (_.contains(newEntityAttributeNames, att)) {
                    if (entity[att].multi && entity[att].multi.length > 0) {
                        // jshint maxdepth:7
                        if (mappings.inverse[att] && mappings.inverse[att].length > 0) {
                            for (var j in (mappings.inverse[att])) {
                                if (_.contains(newEntityAttributeObjectIds, mappings.inverse[att][j])) {
                                    result[att] =  _.clone(entity[att]);
                                    delete entity[att].object_id;
                                    delete result[att].multi;
                                }
                            }
                        }
                        // jshint maxdepth:7
                        for (var k in entity[att].multi) {
                            if (entity[att].multi[k].object_id && _.contains(newEntityAttributeObjectIds,
                                entity[att].multi[k].object_id)) {
                                result[att] = entity[att].multi[k];
                                delete entity[att].multi[k].object_id;
                            }                            
                        }
                    } else {
                        result[att] = entity[att];
                    }

                }
            }
        }

        return result;
    }

    function filterByAttributeObjectIds() {
        var result = {};
        for (var att in entity) {
            if (entity.hasOwnProperty(att)) {
                if (_.contains(newEntityAttributeNames, att)) {
                    if (entity[att].object_id && _.contains(newEntityAttributeObjectIds, entity[att].object_id )){
                        result[att] = entity[att];
                        delete entity[att].object_id;
                    } else {
                        // Check matches in rest of multientity attributes with same name (#635)
                        // jshint maxdepth:7
                        if (entity[att].multi) {
                            for (var j in entity[att].multi) {
                                if (entity[att].multi[j].object_id &&
                                    _.contains(newEntityAttributeObjectIds, entity[att].multi[j].object_id)) {
                                    result[att] = entity[att].multi[j];
                                    delete entity[att].multi[j].object_id;
                                }
                            }
                        }
                    }
                }
            }
        }
        return result;
    }

    var attsArray = utils.extractAttributesArrayFromNgsi2Entity(entity);
    ctx = parser.extractContext(attsArray);

    for (var i = 0; i < newEntities.length; i++) {
        newEntityAttributeNames = _.pluck(multiEntityAttributes.filter(filterByEntityName(newEntities[i])), 'name');
        newEntityAttributeObjectIds = _.pluck(multiEntityAttributes.filter(
            filterByEntityName(newEntities[i])), 'object_id');
        newEntityAttributes = filterByAttributeObjectIds();
        entityName = parser.applyExpression(newEntities[i], ctx, typeInformation);

        newEntityAttributes.type = entityTypes[newEntities[i]];
        newEntityAttributes.id = entityName;

        result.push(newEntityAttributes);
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

/**
 * Propagates the same timestamp used in entity to entities. This is needed given that timestamp processing
 * plugin runs before multientity plugin, so we could have issues as the one described here:
 * https://github.com/telefonicaid/iotagent-node-lib/issues/748
 *
 * Note that this kind of timestamp propagation only works for NGSIv2. That is intentional: NGSIv1 is
 * deprecated so we don't want to spend effort on it.
 *
 * @param entity entity which is the source of timestamp
 * @param entities array to adjust
 *
 */
function propagateTimestamp(entity, entities) {
    var ts = entity[constants.TIMESTAMP_ATTRIBUTE];
    if (!ts) {
        return;
    }

    entities.map(function(en) {
        // Set timestamp metadata in attributes (except TimeInstant attribute itself)
        for (var att in en && att !== constants.TIMESTAMP_ATTRIBUTE) {
            if (en.hasOwnProperty(att) && att !== 'id' && att !== 'type') {
                if (!en[att].metadata) {
                    en[att].metadata = {};
                }
                en[att].metadata[constants.TIMESTAMP_ATTRIBUTE] = ts;
            }
        }
        // Set timestamp attribute inm the entity itself
        en[constants.TIMESTAMP_ATTRIBUTE] = ts;
    });
}

function updateAttributeNgsi1(entity, typeInformation, callback) {
    if (typeInformation.active) {
        var multiEntityAttributes = typeInformation.active.filter(hasEntityName),
            newEntities = _.pluck(multiEntityAttributes, 'entity_name'),
            attributesList = _.pluck(multiEntityAttributes, 'name'),
            entityTypes = extractTypes(multiEntityAttributes, entity.contextElements[0].type),
            resultAttributes;

        resultAttributes = filterOutMultientitiesNgsi1(entity.contextElements[0].attributes, attributesList);

        entity.contextElements = entity.contextElements.concat(
            generateNewCEsNgsi1(entity, newEntities, entityTypes, typeInformation, multiEntityAttributes));

        entity.contextElements[0].attributes = resultAttributes;
    }

    callback(null, entity, typeInformation);
}

function updateAttributeNgsi2(entity, typeInformation, callback) {
    var entities = [];
    if (typeInformation.active) {
        entities.push(entity);

        var multiEntityAttributes = typeInformation.active.filter(hasEntityName),
            newEntities = _.pluck(multiEntityAttributes, 'entity_name'),
            attributesList = _.pluck(multiEntityAttributes, 'name'),
            entityTypes = extractTypes(multiEntityAttributes, typeInformation.type),
            resultAttributes;

        if (multiEntityAttributes.length > 0) {
            resultAttributes = filterOutMultientitiesNgsi2(entity, attributesList);
            var newCes = generateNewCEsNgsi2(entity, newEntities, entityTypes, typeInformation,
                multiEntityAttributes);
            entities = entities.concat(newCes);
            entities[0] = resultAttributes;
            propagateTimestamp(entity, entities);
        } else {
            entities = entity;
        }
    }
    callback(null, entities, typeInformation);
}

function updateAttribute(entity, typeInformation, callback) {
    if (config.checkNgsi2()) {
        updateAttributeNgsi2(entity, typeInformation, callback);
    } else {
        updateAttributeNgsi1(entity, typeInformation, callback);
    }
}

exports.update = updateAttribute;
