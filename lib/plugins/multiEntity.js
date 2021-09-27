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

/* eslint-disable no-prototype-builtins */
/* eslint-disable array-callback-return */

const _ = require('underscore');
const constants = require('../constants');
const legacyParser = require('./expressionParser');
const jexlParser = require('./jexlParser');
const config = require('../commonConfig');
/* eslint-disable-next-line  no-unused-vars */
const logger = require('logops');
/* eslint-disable-next-line  no-unused-vars */
const context = {
    op: 'IoTAgentNGSI.MultiEntityPlugin'
};
const utils = require('./pluginUtils');
/* eslint-disable-next-line  no-unused-vars */
const aliasPlugin = require('./attributeAlias');

function checkJexl(typeInformation) {
    if (
        config.getConfig().defaultExpressionLanguage === 'jexl' &&
        typeInformation.expressionLanguage &&
        typeInformation.expressionLanguage !== 'legacy'
    ) {
        return true;
    } else if (config.getConfig().defaultExpressionLanguage === 'jexl' && !typeInformation.expressionLanguage) {
        return true;
    } else if (
        config.getConfig().defaultExpressionLanguage === 'legacy' &&
        typeInformation.expressionLanguage &&
        typeInformation.expressionLanguage === 'jexl'
    ) {
        return true;
    }
    return false;
}

function hasEntityName(item) {
    return item.entity_name;
}

function ensureEntityId(entityName, originalEntityName) {
    // ensure no return null, 0, false, NaN and other invalids entityIDs
    return entityName ? entityName : originalEntityName;
}

/**
 * Return a list of all the attributes that don't have a multientity option. It considers NGSIv2.
 *
 * @param {Array} originalAttrs        Array of original attributes coming from the single-entity device.
 * @param {Array} meAttributes         Array of all the multientity attributes.
 * @return {Array}                     List of all the attrbiutes without multientity flag.
 */
function filterOutMultientitiesNgsi2(originalAttrs, meAttributes) {
    const result = {};
    const meNamesList = _.pluck(meAttributes, 'name');
    const meObjectsList = _.pluck(meAttributes, 'object_id');
    let toBeFilteredByObj = [];

    for (const att in originalAttrs) {
        if (originalAttrs.hasOwnProperty(att)) {
            if (!_.contains(meNamesList, att)) {
                result[att] = originalAttrs[att];
            }
            if (originalAttrs[att].hasOwnProperty('multi')) {
                let cleanAttributes = _.union([_.clone(originalAttrs[att])], originalAttrs[att].multi);
                delete cleanAttributes[0].multi;
                cleanAttributes = _.map(cleanAttributes, function (val) {
                    val['name'] = att;
                    return val;
                });
                toBeFilteredByObj = _.union(toBeFilteredByObj, cleanAttributes);
            }
        }
    }

    for (const att in toBeFilteredByObj) {
        if (!_.contains(meObjectsList, toBeFilteredByObj[att].object_id)) {
            result[toBeFilteredByObj[att].name] = toBeFilteredByObj[att];
        }
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
    const result = [];
    let newEntityAttributes;
    let newEntityAttributeNames;
    let newEntityAttributeObjectIds;
    let entityName;
    let parser = legacyParser;
    if (checkJexl(typeInformation)) {
        parser = jexlParser;
    }
    function filterByEntityName(entityName) {
        return function (item) {
            return item.entity_name === entityName;
        };
    }

    function filterByAttributeObjectIds() {
        const result = {};
        for (const att in entity) {
            if (entity.hasOwnProperty(att)) {
                if (_.contains(newEntityAttributeNames, att)) {
                    if (entity[att].object_id && _.contains(newEntityAttributeObjectIds, entity[att].object_id)) {
                        result[att] = entity[att];
                        delete entity[att].object_id;
                    } else if (entity[att].multi) {
                        for (const j in entity[att].multi) {
                            if (
                                entity[att].multi[j].object_id &&
                                _.contains(newEntityAttributeObjectIds, entity[att].multi[j].object_id)
                            ) {
                                result[att] = entity[att].multi[j];
                                delete entity[att].multi[j].object_id;
                                break; // stop in first ocurrence (#635)
                            }
                        }
                    }
                }
            }
        }
        return result;
    }

    const attsArray = utils.extractAttributesArrayFromNgsi2Entity(entity);
    const ctx = parser.extractContext(attsArray);

    for (let i = 0; i < newEntities.length; i++) {
        newEntityAttributeNames = _.pluck(multiEntityAttributes.filter(filterByEntityName(newEntities[i])), 'name');
        newEntityAttributeObjectIds = _.pluck(
            multiEntityAttributes.filter(filterByEntityName(newEntities[i])),
            'object_id'
        );
        newEntityAttributes = filterByAttributeObjectIds();

        if (parser.contextAvailable(newEntities[i], ctx)) {
            entityName = parser.applyExpression(newEntities[i], ctx, typeInformation);
        }

        newEntityAttributes.type = entityTypes[newEntities[i]];
        newEntityAttributes.id = ensureEntityId(entityName, newEntities[i]);

        result.push(newEntityAttributes);
    }

    return result;
}

function extractTypes(attributeList, defaultType) {
    const typeMap = {};

    for (let i = 0; i < attributeList.length; i++) {
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
    const ts = entity[constants.TIMESTAMP_ATTRIBUTE];
    if (!ts) {
        return;
    }

    entities.map(function (en) {
        let att;
        // Set timestamp metadata in attributes (except TimeInstant attribute itself)
        for (att in en && att !== constants.TIMESTAMP_ATTRIBUTE) {
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

function updateAttribute(entity, typeInformation, callback) {
    let entities = [];
    entities.push(entity);
    if (typeInformation.active) {
        const multiEntityAttributes = typeInformation.active.filter(hasEntityName);
        const newEntities = _.uniq(_.pluck(multiEntityAttributes, 'entity_name'));
        const entityTypes = extractTypes(multiEntityAttributes, typeInformation.type);
        let resultAttributes;

        if (multiEntityAttributes.length > 0) {
            resultAttributes = filterOutMultientitiesNgsi2(entity, multiEntityAttributes);
            const newCes = generateNewCEsNgsi2(
                entity,
                newEntities,
                entityTypes,
                typeInformation,
                multiEntityAttributes
            );
            entities = entities.concat(newCes);
            entities[0] = resultAttributes;
            propagateTimestamp(entity, entities);
        } else {
            entities = entity;
        }
    }
    callback(null, entities, typeInformation);
}

exports.update = updateAttribute;
