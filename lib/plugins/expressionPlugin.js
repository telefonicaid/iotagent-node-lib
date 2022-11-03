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
 * Modified by: Federico M. Facca - Martel Innovate
 */

const _ = require('underscore');
const legacyParser = require('./expressionParser');
const jexlParser = require('./jexlParser');
const config = require('../commonConfig');
/* eslint-disable no-unused-vars */
const logger = require('logops');
const errors = require('../errors');
const constants = require('../constants');
const context = {
    op: 'IoTAgentNGSI.expressionPlugin'
};
const utils = require('./pluginUtils');

//set the basic JEXL Transformation SET
setJEXLTransforms(null);

function setJEXLTransforms(transformationMap) {
    jexlParser.setTransforms(transformationMap);
}

function applyExpression(expression, context, typeInformation) {
    let parser = jexlParser;
    if (!checkJexl(typeInformation)) {
        parser = legacyParser;
    }
    return parser.applyExpression(expression, context, typeInformation);
}

function extractContext(attributeList, typeInformation) {
    let parser = jexlParser;
    if (!checkJexl(typeInformation)) {
        parser = legacyParser;
    }
    return parser.extractContext(attributeList);
}

function parse(expression, context, type, typeInformation) {
    if (!checkJexl(typeInformation)) {
        return legacyParser.parse(expression, context, type);
    }
    return jexlParser.parse(expression, context);
}

function mergeAttributes(attrList1, attrList2) {
    const finalCollection = _.clone(attrList1);
    const additionalItems = [];
    let found;

    for (let i = 0; i < attrList2.length; i++) {
        found = false;

        for (let j = 0; j < finalCollection.length; j++) {
            if (finalCollection[j].name === attrList2[i].name && attrList2[i].object_id) {
                if (finalCollection[j].object_id === attrList2[i].object_id) {
                    finalCollection[j].value = attrList2[i].value;
                    found = true;
                }
            } else if (finalCollection[j].name === attrList2[i].name && !attrList2[i].object_id) {
                finalCollection[j].value = attrList2[i].value;
                found = true;
            }
        }

        if (!found) {
            additionalItems.push(attrList2[i]);
        }
    }

    return finalCollection.concat(additionalItems);
}

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

function update(entity, typeInformation, callback) {
    function processEntityUpdateNgsi2(attributes) {
        let parser = legacyParser;
        if (checkJexl(typeInformation)) {
            parser = jexlParser;
        }
        let expressionAttributes = [];
        let attributesCtxt = [...attributes]; // just copy
        if (typeInformation.static) {
            typeInformation.static.forEach(function (att) {
                attributesCtxt.push(att);
            });
        }
        let idTypeSSSList = utils.getIdTypeServSubServiceFromDevice(typeInformation);
        attributesCtxt = attributesCtxt.concat(idTypeSSSList);
        const ctx = parser.extractContext(attributesCtxt);

        if (typeInformation.active) {
            expressionAttributes = parser.processExpressionAttributes(typeInformation, typeInformation.active, ctx);
        }

        attributes = mergeAttributes(attributes, expressionAttributes);
        return attributes;
    }

    try {
        logger.debug(context, 'expressionPlugin entity %j', entity);
        const attsArray = utils.extractAttributesArrayFromNgsi2Entity(entity);
        // Exclude processing all attr expressions when current attr is of type 'commandStatus' or 'commandResult'
        const attsArrayFiltered = attsArray.filter((obj) => {
            return ![constants.COMMAND_STATUS, constants.COMMAND_RESULT].includes(obj.type);
        });
        const attsArrayCmd = attsArray.filter((obj) => {
            // just attr of type 'commandStatus' or 'commandResult'
            return [constants.COMMAND_STATUS, constants.COMMAND_RESULT].includes(obj.type);
        });
        let attsArrayFinal = [];
        if (attsArrayFiltered.length > 0) {
            attsArrayFinal = processEntityUpdateNgsi2(attsArrayFiltered);
        }
        attsArrayFinal = attsArrayFinal.concat(attsArrayCmd);
        entity = utils.createNgsi2Entity(entity.id, entity.type, attsArrayFinal, true);

        callback(null, entity, typeInformation);
    } catch (e) {
        logger.info(context, 'expressionPlugin error %j procesing entity %j', e, entity);
        callback(e);
        return;
    }
}

exports.parse = parse;
exports.update = update;
exports.setJEXLTransforms = setJEXLTransforms;
exports.applyExpression = applyExpression;
exports.extractContext = extractContext;
exports.checkJexl = checkJexl;
