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

const jexlParser = require('./jexlParser');
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
    return jexlParser.applyExpression(expression, context, typeInformation);
}

function extractContext(attributeList) {
    return jexlParser.extractContext(attributeList);
}

function parse(expression, context) {
    return jexlParser.parse(expression, context);
}

function contextAvailable(expression, context, typeInformation) {
    return jexlParser.contextAvailable(expression, context);
}

exports.parse = parse;
exports.setJEXLTransforms = setJEXLTransforms;
exports.applyExpression = applyExpression;
exports.extractContext = extractContext;
exports.contextAvailable = contextAvailable;
