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
 *
 * Developed by: Federico M. Facca - Martel Innovate
 */

/* eslint-disable consistent-return */
/* eslint-disable no-self-assign */
/* eslint-disable no-unused-vars */

const jexl = require('jexl');
const errors = require('../errors');
const logger = require('logops');
const config = require('../commonConfig');
const logContext = {
    op: 'IoTAgentNGSI.JEXL'
};

jexl.addTransform('indexOf', (val, char) => String(val).indexOf(char));
jexl.addTransform('length', (val) => String(val).length);
jexl.addTransform('trim', (val) => String(val).trim());
jexl.addTransform('substr', (val, int1, int2) => String(val).substr(int1, int2));
jexl.addTransform('sumaarray', (arr) => arr.reduce((i, v) => i + v));
jexl.addTransform('lengtharray', (arr) => arr.length);
jexl.addTransform('typeof', (val) => typeof val);
jexl.addTransform('isarray', (arr) => Array.isArray(arr));
jexl.addTransform('isnan', (val) => isNaN(val));
jexl.addTransform('parseint', (val) => parseInt(val));
jexl.addTransform('parsefloat', (val) => parseFloat(val));
jexl.addTransform('toisodate', (val) => new Date(val).toISOString());
jexl.addTransform('tostring', (val) => val.toString());
jexl.addTransform('urlencode', (val) => encodeURI(val));
jexl.addTransform('urldecode', (val) => decodeURI(val));
jexl.addTransform('replacestr', (str, from, to) => str.replace(from, to));
jexl.addTransform('replaceregexp', (str, reg, to) => str.replace(new RegExp(reg), to));
jexl.addTransform('replaceallstr', (str, from, to) => str.replaceAll(from, to));
jexl.addTransform('replaceallregexp', (str, reg, to) => str.replaceAll(new RegExp(reg,"g"), to));
jexl.addTransform('split', (str, ch) => str.split(ch));
jexl.addTransform('mapper', (val, values, choices) => choices[values.findIndex((target) => target === val)]);
jexl.addTransform(
    'thmapper',
    (val, values, choices) =>
        choices[values.reduce((acc,curr,i,arr) => (acc==0)||acc?acc:val<=curr?acc=i:acc=null,null)],
);
jexl.addTransform(
    'bitwisemask',
    (i,mask,op) => op==="&"?parseInt(i)&mask: op==="|"?parseInt(i)|mask: op==="^"?parseInt(i)^mask:i
);

    
function parse(expression, context, callback) {
    let result;
    let error;

    try {
        result = jexl.evalSync(expression, context);
        logger.debug(logContext, 'parse expression "[%j]" over "[%j]" result "[%j]" ', expression, context, result);
    } catch (e) {
        error = new errors.InvalidExpression(expression);
        if (callback) {
            callback(error);
        } else {
            throw error;
        }
    }

    if (callback) {
        callback(null, result);
    } else {
        return result;
    }
}

function extractContext(attributeList) {
    const context = {};
    let value;

    for (let i = 0; i < attributeList.length; i++) {
        if (
            !Number.isNaN(Number.parseFloat(attributeList[i].value)) &&
            !Number.isInteger(Number.parseFloat(attributeList[i].value))
        ) {
            value = Number.parseFloat(attributeList[i].value);
        } else if (!Number.isNaN(Number.parseInt(attributeList[i].value))) {
            value = Number.parseInt(attributeList[i].value);
        } else if (String(attributeList[i].value) === 'true') {
            value = true;
        } else if (String(attributeList[i].value) === 'false') {
            value = false;
        } else {
            value = attributeList[i].value;
        }
        if (attributeList[i].name) {
            context[attributeList[i].name] = value;
        }
        /*jshint camelcase: false */
        if (attributeList[i].object_id) {
            context[attributeList[i].object_id] = value;
        }
        /*jshint camelcase: true */
    }

    return context;
}

function applyExpression(expression, context, typeInformation) {
    const result = jexl.evalSync(expression, context);
    logger.debug(logContext, 'applyExpression "[%j]" over "[%j]" result "[%j]" ', expression, context, result);
    let expressionResult = result !== undefined ? result : expression;
    return expressionResult;
}

function expressionApplier(context, typeInformation) {
    return function (attribute) {
        /**
         * Determines if a value is of type float
         *
         * @param      {String}   value       Value to be analyzed
         * @return     {boolean}              True if float, False otherwise.
         */
        function isFloat(value) {
            return !isNaN(value) && value.toString().indexOf('.') !== -1;
        }

        const newAttribute = {
            name: attribute.name,
            type: attribute.type
        };

        /*jshint camelcase: false */
        if (config.isCurrentNgsi() && attribute.object_id) {
            newAttribute.object_id = attribute.object_id;
        }

        newAttribute.value = applyExpression(attribute.expression, context, typeInformation);
        return newAttribute;
    };
}

function isTransform(identifier) {
    return jexl.getTransform(identifier) !== (null || undefined);
}

function contextAvailable(expression, context) {
    let error;
    try {
        const lexer = jexl._getLexer();
        const identifiers = lexer.tokenize(expression).filter(function (token) {
            return token.type === 'identifier';
        });
        const keys = Object.keys(context);
        let validContext = true;
        identifiers.some(function (element) {
            if (!keys.includes(element.value) && !isTransform(element.value)) {
                validContext = false;
                logger.warn(
                    logContext,
                    'For expression "[%s]" context "[%j]" does not have element %s',
                    expression,
                    context,
                    element.value
                );
            }
            // FIXME: Workaround to allow keys of JSON geopoints
            if (element.value === 'type' || element.value === 'coordinates') {
                validContext = true;
            }
            return validContext === false;
        });
        if (validContext) {
            jexl.evalSync(expression, context);
        }
        return validContext;
    } catch (e) {
        error = new errors.InvalidExpression(expression);
        throw error;
    }
}

function processExpressionAttributes(typeInformation, list, context) {
    return list
        .filter(function (item) {
            return item.expression && contextAvailable(item.expression, context);
        })
        .map(expressionApplier(context, typeInformation));
}

exports.extractContext = extractContext;
exports.processExpressionAttributes = processExpressionAttributes;
exports.contextAvailable = contextAvailable;
exports.applyExpression = applyExpression;
exports.parse = parse;
