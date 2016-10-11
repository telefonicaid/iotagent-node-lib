
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

var _ = require('underscore'),
    parser = require('./expressionParser');

function processExpression(context) {
    return function(expression) {
        var result,
            cleanedExpression = expression.substr(2, expression.length - 3);

        result = parser.parse(cleanedExpression, context, 'String');

        return {
            original: expression,
            value: result
        };
    };
}

function extractContext(entity) {
    var context = {};

    for (var i = 0; i < entity.attributes.length; i++) {
        context[entity.attributes[i].name] = entity.attributes[i].value;
    }

    return context;
}

function applyExpression(expression, entity, typeInformation) {
    var expressionList = expression.match(/\$\{.*?\}/g),
        context = extractContext(entity),
        substitutions = expressionList.map(processExpression(context)),
        expressionResult = expression;

    for (var i = 0; i < substitutions.length; i++) {
        expressionResult = expressionResult.replace(substitutions[i].original, substitutions[i].value);
    }

    return expressionResult;
}

function expressionApplier(entity, typeInformation) {
    return function(attribute) {
        var newAttribute = {
            name: attribute.name,
            type: attribute.type
        };

        newAttribute.value = applyExpression(attribute.expression, entity, typeInformation);

        return newAttribute;
    };
}

function mergeAttributes(attrList1, attrList2) {
    var finalCollection = _.clone(attrList1),
        additionalItems = [],
        found;

    for (var i = 0; i < attrList2.length; i++) {
        found = false;

        for (var j = 0; j < finalCollection.length; j++) {
            if (finalCollection[i].name === attrList2[i].name) {
                finalCollection[i].value = attrList2[i].value;
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
    function processEntityUpdate(entity) {
        var expressionAttributes = [];

        if (typeInformation.active) {
            expressionAttributes = typeInformation.active
                .filter(function(item) {
                    return item.expression;
                })
                .map(expressionApplier(entity, typeInformation));
        }

        entity.attributes = mergeAttributes(entity.attributes, expressionAttributes);

        return entity;
    }

    entity.contextElements = entity.contextElements.map(processEntityUpdate);

    callback(null, entity, typeInformation);
}

exports.update = update;
