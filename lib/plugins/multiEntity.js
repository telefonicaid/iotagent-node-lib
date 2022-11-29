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
const expressionPlugin = require('./expressionPlugin');
/* eslint-disable-next-line  no-unused-vars */
const logger = require('logops');
/* eslint-disable-next-line  no-unused-vars */
const context = {
    op: 'IoTAgentNGSI.MultiEntityPlugin'
};
const utils = require('./pluginUtils');
/* eslint-disable-next-line  no-unused-vars */
const aliasPlugin = require('./attributeAlias');

function hasEntityNameOrEntityType(item) {
    return item.entity_name || item.entity_type;
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
 * @param {Array} multiEntityAttributes     List of attributes with multientity option
 * @return {Array}                          List of the new Context Entities
 */
function generateNewCEsNgsi2(entity, newEntities, multiEntityAttributes) {
    const result = [];
    let newEntityAttributes;
    let newEntityAttributeNames;
    let newEntityAttributeObjectIds;
    function filterByEntityNameandType(entityNameType) {
        return function (item) {
            return (
                item.entity_name === entityNameType.entity_name &&
                (!item.entity_type || item.entity_type === entityNameType.entity_type)
            );
        };
    }

    function filterByAttributeObjectIds(entity, newEntityAttributeNames, newEntityAttributeObjectIds) {
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

    for (let i = 0; i < newEntities.length; i++) {
        newEntityAttributeNames = _.pluck(
            multiEntityAttributes.filter(filterByEntityNameandType(newEntities[i])),
            'name'
        );
        newEntityAttributeObjectIds = _.pluck(
            multiEntityAttributes.filter(filterByEntityNameandType(newEntities[i])),
            'object_id'
        );
        newEntityAttributes = filterByAttributeObjectIds(entity, newEntityAttributeNames, newEntityAttributeObjectIds);
        newEntityAttributes.type = newEntities[i].entity_type;
        newEntityAttributes.id = newEntities[i].entity_name;
        result.push(newEntityAttributes);
    }
    return result;
}

function extractNewEntities(multiEntityAttributes, defaultType) {
    let newEntitieswithDuplicates = multiEntityAttributes.map((elem) => {
        return { entity_name: elem.entity_name, entity_type: elem.entity_type || defaultType };
    });
    let auxOverwriteTree = {};
    for (let entityItem in newEntitieswithDuplicates) {
        if (!auxOverwriteTree[newEntitieswithDuplicates[entityItem].entity_name]) {
            auxOverwriteTree[newEntitieswithDuplicates[entityItem].entity_name] = {};
        }
        auxOverwriteTree[newEntitieswithDuplicates[entityItem].entity_name][
            newEntitieswithDuplicates[entityItem].entity_type
        ] = null;
    }
    let flatNewEntities = [];
    for (let entityItem in auxOverwriteTree) {
        for (let typeItem in auxOverwriteTree[entityItem]) {
            flatNewEntities.push({ entity_name: entityItem, entity_type: typeItem });
        }
    }
    return flatNewEntities;
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
    try {
        logger.debug(context, 'multiEntityPlugin entity %j', entity);
        let parser = jexlParser;
        if (!expressionPlugin.checkJexl(typeInformation)) {
            parser = legacyParser;
        }
        // The context for the JEXL expression should be the ID, TYPE, S, SS
        let attrList = utils.getIdTypeServSubServiceFromDevice(typeInformation);
        const attsArray = utils.extractAttributesArrayFromNgsi2Entity(entity);
        attrList = attrList.concat(attsArray);
        const ctx = parser.extractContext(attrList);
        let entities = [entity];
        if (typeInformation.active) {
            const multiEntityAttributes = typeInformation.active.filter(hasEntityNameOrEntityType);
            for (let i in multiEntityAttributes) {
                if (!multiEntityAttributes[i].entity_name) {
                    // Then hasEntityType and entity_name should be device.name
                    multiEntityAttributes[i].entity_name = typeInformation.name;
                }
                if (parser.contextAvailable(multiEntityAttributes[i].entity_name, ctx)) {
                    let entityName = parser.applyExpression(multiEntityAttributes[i].entity_name, ctx, typeInformation);
                    // An entity_name could not be null, but a result or expression could be null
                    if (entityName !== null) {
                        multiEntityAttributes[i].entity_name = entityName;
                    }
                }
            }
            const newEntities = extractNewEntities(multiEntityAttributes, typeInformation.type);

            if (multiEntityAttributes.length > 0) {
                let resultAttributes = filterOutMultientitiesNgsi2(entity, multiEntityAttributes);
                const newCes = generateNewCEsNgsi2(entity, newEntities, multiEntityAttributes);
                entities = [resultAttributes].concat(newCes);
                propagateTimestamp(entity, entities);
            } else {
                entities = entity;
            }
        }
        callback(null, entities, typeInformation);
    } catch (e) {
        logger.info(context, 'multiEntityPlugin error %j procesing entity %j', e, entity);
        callback(e);
        return;
    }
}

exports.update = updateAttribute;
