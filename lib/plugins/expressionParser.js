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
    grammar = {
        lex: {
            rules: [
                ['\\s+', '/* skip whitespace */'],
                ['[0-9]+(?:\\.[0-9]+)?\\b', 'return "NUMBER";'],
                ['\\*', 'return "*";'],
                ['\\/', 'return "/";'],
                ['-', 'return "-";'],
                ['\\+', 'return "+";'],
                ['\\^', 'return "^";'],
                ['\\(', 'return "(";'],
                ['\\)', 'return ")";'],
                ['@[a-zA-Z]+\\b', 'return "VARIABLE";'],
                ['"[a-zA-Z0-9\\s]+"', 'return "STRING";'],
                ['$', 'return "EOF";']
            ]
        },

        operators: [
            ['left', '+', '-'],
            ['left', '*', '/'],
            ['left', '^'],
            ['left', 'UMINUS']
        ],

        bnf: {
            expressions: [['e EOF', 'return $1;']],

            e: [
                ['e + e', '$$ = $1 + $3;'],
                ['e - e', '$$ = $1 - $3;'],
                ['e * e', '$$ = $1 * $3;'],
                ['e / e', '$$ = $1 / $3;'],
                ['e ^ e', '$$ = Math.pow($1, $3);'],
                ['- e', '$$ = -$2;', {'prec': 'UMINUS'}],
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
    var result;

    parser.yy = context;
    result = parser.parse(expression);

    callback(null, result);
}

exports.parse = parse;
