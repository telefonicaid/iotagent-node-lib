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

const Parser = require('jison').Parser;
const errors = require('../errors');
const logger = require('logops');
const fillService = require('../services/common/domain').fillService;
const _ = require('underscore');
let logContext = {
    op: 'IoTAgentNGSI.Expression'
};
const grammar = {
    lex: {
        rules: [
            ['\\s+', '/* skip whitespace */'],
            ['@[a-zA-Z0-9_]+\\b', 'return "VARIABLE";'],
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
            ["'[a-zA-Z0-9\\s,]+'", 'return "STRING";'],
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
            ['INDEX ( e , e )', '$$ = String($3).indexOf($5)'],
            ['SUBSTR ( e , e , e )', '$$ = String($3).substr($5, $7)'],
            ['LENGTH ( e )', '$$ = String($3).length'],
            ['TRIM ( e )', '$$ = String($3).trim()'],
            ['( e )', '$$ = $2;'],
            ['NUMBER', '$$ = Number(yytext);'],
            ['VARIABLE', '$$ = yy[yytext.substr(1)];'],
            ['STRING', '$$ = yytext.substr(1, yytext.length -2);'],
            ['E', '$$ = Math.E;'],
            ['PI', '$$ = Math.PI;']
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
            logger.debug(logContext, 'parse expression "[%j]" over "[%j]" result "[%j]" ', expression, context, result);
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
        if (attributeList[i].name) {
            context[attributeList[i].name] = attributeList[i].value;
        }
        if (attributeList[i].object_id) {
            context[attributeList[i].object_id] = attributeList[i].value;
        }
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
    logContext = fillService(logContext, typeInformation);
    const expressionList = expression.match(/\$\{.*?\}/g) || [];
    const substitutions = expressionList.map(processExpression(context));
    let expressionResult = expression;

    for (let i = 0; i < substitutions.length; i++) {
        expressionResult = expressionResult.replace(substitutions[i].original, substitutions[i].value);
    }
    logger.debug(
        logContext,
        'applyExpression "[%j]" over "[%j]" result "[%j]" ',
        expression,
        context,
        expressionResult
    );
    return expressionResult;
}

function contextAvailable(expression, context) {
    let error;
    try {
        const variablesList = expression.match(/@[a-zA-Z0-9_]+/g) || [];
        const variables = variablesList.map(function (item) {
            return item.substr(1);
        });
        const keys = Object.keys(context);
        let validContext = _.difference(variables, keys).length === 0;
        if (!validContext) {
            logger.info(
                logContext,
                'For expression "[%s]" context "[%j]" does not have element to match',
                expression,
                context
            );
        }
        return validContext;
    } catch (e) {
        error = new errors.InvalidExpression(expression);
        throw error;
    }
}

exports.parse = parse;
exports.extractContext = extractContext;
exports.contextAvailable = contextAvailable;
exports.applyExpression = applyExpression;
