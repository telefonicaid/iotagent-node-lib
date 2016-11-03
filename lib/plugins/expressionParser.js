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

var Parser = require('jison').Parser,
    errors = require('../errors'),
    _ = require('underscore'),
    grammar = {
        lex: {
            rules: [
                ['\\s+', '/* skip whitespace */'],
                ['@[a-zA-Z0-9]+\\b', 'return "VARIABLE";'],
                ['[0-9]+(?:\\.[0-9]+)?\\b', 'return "NUMBER";'],
                ['\\*', 'return "*";'],
                ['\\/', 'return "/";'],
                ['-', 'return "-";'],
                ['\\+', 'return "+";'],
                ['\\^', 'return "^";'],
                ['\\(', 'return "(";'],
                ['\\)', 'return ")";'],
                [',', 'return ",";'],
                ['#', 'return "#";'],
                ['indexOf', 'return "INDEX";'],
                ['length', 'return "LENGTH";'],
                ['substr', 'return "SUBSTR";'],
                ['trim', 'return "TRIM";'],
                ['"[a-zA-Z0-9\\s,]+"', 'return "STRING";'],
                ['\'[a-zA-Z0-9\\s,]+\'', 'return "STRING";'],
                ['$', 'return "EOF";']
            ]
        },

        operators: [
            ['left', '#', '+', '-'],
            ['left', '*', '/'],
            ['left', '^'],
            ['left', 'UMINUS']
        ],

        bnf: {
            expressions: [['e EOF', 'return $1;']],

            e: [
                ['e + e', '$$ = Number($1) + Number($3);'],
                ['e - e', '$$ = $1 - $3;'],
                ['e * e', '$$ = $1 * $3;'],
                ['e / e', '$$ = $1 / $3;'],
                ['e ^ e', '$$ = Math.pow($1, $3);'],
                ['e # e', '$$ = String($1) + String($3);'],
                ['- e', '$$ = -$2;', {'prec': 'UMINUS'}],
                ['INDEX ( e , e )', '$$ = String($3).indexOf($5)'],
                ['SUBSTR ( e , e , e )', '$$ = String($3).substr($5, $7)'],
                ['LENGTH ( e )', '$$ = String($3).length'],
                ['TRIM ( e )', '$$ = String($3).trim()'],
                ['( e )', '$$ = $2;'],
                ['NUMBER', '$$ = Number(yytext);'],
                ['VARIABLE', '$$ = yy[yytext.substr(1)];'],
                ['STRING', '$$ = yytext.substr(1, yytext.length -2);'],
                ['E', '$$ = Math.E;'],
                ['PI', '$$ = Math.PI;']]
        }
    },
    parser = new Parser(grammar);

function parse(expression, context, type, callback) {
    var result,
        error;

    if (type !== 'String' && type !== 'Number') {
        error = new errors.WrongExpressionType(type);
        if (callback) {
            callback(error);
        } else {
            throw error;
        }
    } else {
        parser.yy = context;

        try {
            result = parser.parse(expression);
        } catch (e) {
            error = new errors.InvalidExpression(expression);

            if (callback) {
                return callback(error);
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
}

function extractContext(attributeList) {
    var context = {};

    for (var i = 0; i < attributeList.length; i++) {
        context[attributeList[i].name] = attributeList[i].value;
    }

    return context;
}


function processExpression(context) {
    return function(expression) {
        var result,
            cleanedExpression = expression.substr(2, expression.length - 3);

        result = parse(cleanedExpression, context, 'String');

        return {
            original: expression,
            value: result
        };
    };
}

function applyExpression(expression, context, typeInformation) {
    var expressionList = expression.match(/\$\{.*?\}/g) || [],
        substitutions = expressionList.map(processExpression(context)),
        expressionResult = expression;

    for (var i = 0; i < substitutions.length; i++) {
        expressionResult = expressionResult.replace(substitutions[i].original, substitutions[i].value);
    }

    return expressionResult;
}

function expressionApplier(context, typeInformation) {
    return function(attribute) {
        var newAttribute = {
            name: attribute.name,
            type: attribute.type
        };

        newAttribute.value = applyExpression(attribute.expression, context, typeInformation);

        return newAttribute;
    };
}

function contextAvailable(expression, context) {
    var variables = expression.match(/@[a-zA-Z0-9]+/g).map(function(item) {
            return item.substr(1);
        }),
        keys = Object.keys(context);

    return _.difference(variables, keys).length === 0;
}

function processExpressionAttributes(typeInformation, list, context) {
    return list
        .filter(function(item) {
            return item.expression && contextAvailable(item.expression, context);
        })
        .map(expressionApplier(context, typeInformation));
}

exports.parse = parse;
exports.extractContext = extractContext;
exports.processExpressionAttributes = processExpressionAttributes;
exports.applyExpression = applyExpression;
