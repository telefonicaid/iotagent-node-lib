
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

function getExpression(attribute, type) {
    var expression;

    if (type.active) {
        for (var i = 0; i < type.active.length; i++) {
            if (attribute.name === type.active[i].name && type.active[i].expression) {
                expression = type.active[i].expression;
            }
        }
    }

    return expression;
}

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

function applyExpression(attribute, expression, entity, typeInformation) {
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
        var expression = getExpression(attribute, typeInformation),
            newAttribute = _.clone(attribute);

        if (expression) {
            newAttribute.value = applyExpression(attribute, expression, entity, typeInformation);
        }

        return newAttribute;
    };
}

function update(entity, typeInformation, callback) {
    function processEntityUpdate(entity) {
        entity.attributes = entity.attributes.map(expressionApplier(entity, typeInformation));

        return entity;
    }

    entity.contextElements = entity.contextElements.map(processEntityUpdate);

    callback(null, entity, typeInformation);
}

exports.update = update;
