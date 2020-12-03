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

/* eslint-disable consistent-return */

/*
    FIXME PR: pending from issue #687

    if(cond,then,else) function
    Comparison operators: <, <=, >, <=, ==, !=
    Logical operators: and, or, not
    Bitwise operations: <<, >>, and, or, not

 */

const Parser = require('jison').Parser;
const errors = require('../errors');
const config = require('../commonConfig');
const _ = require('underscore');
const grammar = {
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

            // String functions
            ['indexOf', 'return "INDEX";'],
            ['length', 'return "LENGTH";'],
            ['substr', 'return "SUBSTR";'],
            ['trim', 'return "TRIM";'],
            ['uppercase', 'return "UPPERCASE";'],
            ['lowercase', 'return "LOWERCASE";'],
            ['replace', 'return "REPLACE";'],
            ['slice', 'return "SLICE";'],
            ['"[a-zA-Z0-9\\s,]+"', 'return "STRING";'],
            ["'[a-zA-Z0-9\\s,]+'", 'return "STRING";'],

            // Math functions
            ['cos', 'return "COS";'],
            ['sin', 'return "SIN";'],
            ['abs', 'return "ABS";'],
            ['min', 'return "MIN";'],
            ['max', 'return "MAX";'],
            ['random', 'return "RANDOM";'],
            ['mod', 'return "MOD";'],
            ['floor', 'return "FLOOR";'],
            ['ceiling', 'return "CEILING";'],
            ['round', 'return "ROUND";'],

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
            ['- e', '$$ = -$2;', { prec: 'UMINUS' }],

            // String
            ['INDEX ( e , e )', '$$ = String($3).indexOf($5)'],
            ['SUBSTR ( e , e , e )', '$$ = String($3).substr($5, $7)'],
            ['LENGTH ( e )', '$$ = String($3).length'],
            ['TRIM ( e )', '$$ = String($3).trim()'],
            ['( e )', '$$ = $2;'],
            ['NUMBER', '$$ = Number(yytext);'],
            ['VARIABLE', '$$ = yy[yytext.substr(1)];'],
            ['STRING', '$$ = yytext.substr(1, yytext.length -2);'],
            ['UPPERCASE ( e )', '$$ = String($3).toUpperCase()'],
            ['LOWERCASE ( e )', '$$ = String($3).toLowerCase'],
            ['REPLACE ( e , e , e )', '$$ = String($3).replace($5, $7)'],
            ['SLICE ( e , e , e )', '$$ = String($3).replace($5, $7)'],

            // Math
            ['E', '$$ = Math.E;'],
            ['PI', '$$ = Math.PI;'],
            ['SIN ( e )', '$$ = Math.sin($3)'],
            ['COS ( e )', '$$ = Math.cos($3)'],
            ['ABS ( e )', '$$ = Math.abs($3)'],
            ['MIN ( e , e )', '$$ = Math.min($3, $5)'],
            ['MAX ( e , e )', '$$ = Math.max($3, $5)'],
            ['RANDOM', '$$ = Math.random()'],
            ['MOD ( e , e )', '$$ = $3 % $5'],
            ['FLOOR ( e )', '$$ = Math.floor($3)'],
            ['CEILING', '$$ = Math.ceil($3)'],
            ['ROUND', '$$ = Math.round($3)']
        ]
    }
};

const parser = new Parser(grammar);

function parse(expression, context, type, callback) {
    let result;
    let error;

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
    const context = {};

    for (let i = 0; i < attributeList.length; i++) {
        context[attributeList[i].name] = attributeList[i].value;
    }

    return context;
}

function processExpression(context) {
    return function (expression) {
        const cleanedExpression = expression.substr(2, expression.length - 3);
        // Note that parse() function allows both String way processing and Number way processing
        // (have a look to  expression-test.js). However, here we only use one of the possibilities, i.e. String
        const result = parse(cleanedExpression, context, 'String');

        return {
            original: expression,
            value: result
        };
    };
}

/* eslint-disable-next-line no-unused-vars */
function applyExpression(expression, context, typeInformation) {
    const expressionList = expression.match(/\$\{.*?\}/g) || [];
    const substitutions = expressionList.map(processExpression(context));
    let expressionResult = expression;

    for (let i = 0; i < substitutions.length; i++) {
        expressionResult = expressionResult.replace(substitutions[i].original, substitutions[i].value);
    }

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

        if (attribute.type === 'Number' && isFloat(newAttribute.value)) {
            newAttribute.value = Number.parseFloat(newAttribute.value);
        } else if (attribute.type === 'Number' && Number.parseInt(newAttribute.value)) {
            newAttribute.value = Number.parseInt(newAttribute.value);
        } else if (attribute.type === 'Boolean') {
            newAttribute.value = newAttribute.value === 'true' || newAttribute.value === '1';
        } else if (attribute.type === 'None') {
            newAttribute.value = null;
        }

        return newAttribute;
    };
}

function contextAvailable(expression, context) {
    const variables = expression.match(/@[a-zA-Z0-9]+/g).map(function (item) {
        return item.substr(1);
    });
    const keys = Object.keys(context);

    return _.difference(variables, keys).length === 0;
}

function processExpressionAttributes(typeInformation, list, context) {
    return list
        .filter(function (item) {
            return item.expression && contextAvailable(item.expression, context);
        })
        .map(expressionApplier(context, typeInformation));
}

exports.parse = parse;
exports.extractContext = extractContext;
exports.processExpressionAttributes = processExpressionAttributes;
exports.applyExpression = applyExpression;
