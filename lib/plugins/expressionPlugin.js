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
const context = {
    op: 'IoTAgentNGSI.expressionPlugin'
};
const utils = require('./pluginUtils');

//set the basic JEXL Transformation SET
setJEXLTransforms(null);

function setJEXLTransforms(transformationMap) {
    jexlParser.setTransforms(transformationMap);
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

function update(entity, typeInformation, callback) {
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
        const ctx = parser.extractContext(attributesCtxt);

        if (typeInformation.active) {
            expressionAttributes = parser.processExpressionAttributes(typeInformation, typeInformation.active, ctx);
        }

        attributes = mergeAttributes(attributes, expressionAttributes);
        return attributes;
    }

    try {
        logger.debug(context, 'expressionPlugin entity %j', entity);
        let attsArray = utils.extractAttributesArrayFromNgsi2Entity(entity);
        attsArray = processEntityUpdateNgsi2(attsArray);
        entity = utils.createNgsi2Entity(entity.id, entity.type, attsArray, true);

        callback(null, entity, typeInformation);
    } catch (e) {
        callback(e);
    }
}

exports.update = update;
exports.setJEXLTransforms = setJEXLTransforms;
