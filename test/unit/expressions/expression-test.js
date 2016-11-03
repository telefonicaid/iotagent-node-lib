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
 * please contact with::[contacto@tid.es]
 */
'use strict';

var should = require('should'),
    expressionParser = require('../../../lib/plugins/expressionParser');

describe('Expression interpreter', function() {
    var arithmetic,
        scope = {
            value: 6,
            other: 3,
            theString: '12.6,   -19.4',
            spaces: '5 a b c d 5',
            big: 2000,
            number: 145,
            number2: 155,
            number3inside: 200
        };

    describe('When a expression with a single value is parsed', function() {
        it('should return that value', function(done) {
            expressionParser.parse('5 * @value', scope, 'Number', function(error, result) {
                should.not.exist(error);
                result.should.equal(30);
                done();
            });
        });
    });

    arithmetic = [
        ['5 * @value', 30],
        ['(6 + @value) * 3', 36],
        ['@value / 12 + 1', 1.5],
        ['(5 + 2) * (@value + 7)', 91],
        ['(5 - @other) * (@value + 7)', 26],
        ['3 * 5.2', 15.6],
        ['@value * 5.2', 31.2]
    ];

    function arithmeticUseCase(arithmeticExpr) {
        describe('When an expression with the arithmetic operation [' + arithmeticExpr[0] + '] is parsed', function() {
            it('should be interpreted appropriately', function(done) {
                expressionParser.parse(arithmeticExpr[0], scope, 'Number', function(error, result) {
                    should.not.exist(error);
                    result.should.approximately(arithmeticExpr[1], 0.000001);
                    done();
                });
            });
        });
    }

    for (var i = 0; i < arithmetic.length; i++) {
        arithmeticUseCase(arithmetic[i]);
    }

    describe('When an expression with two strings is concatenated', function() {
        it('should return the concatenation of both strings', function(done) {
            expressionParser.parse('"Pruebas" # "DeStrings"', scope, 'String', function(error, result) {
                should.not.exist(error);
                result.should.equal('PruebasDeStrings');
                done();
            });
        });
    });

    describe('When string transformation functions are executed', function() {
        it('should return the appropriate piece of the string', function(done) {
            expressionParser.parse(
                'trim(substr(@theString, indexOf(@theString, \",\") + 1, length(@theString)))',
                scope,
                'String',
                function(error, result) {
                    should.not.exist(error);
                    result.should.equal('-19.4');
                    done();
                });
        });
    });

    describe('When an expression contains variables with numbers', function() {
        it('should return the appropriate result', function(done) {
            expressionParser.parse('@number + @number2 + @number3inside',
                scope, 'String', function(error, result) {
                should.not.exist(error);
                result.should.equal(500);
                done();
            });
        });
    });

    describe('When an expression contains multiple parenthesis', function() {
        it('should return the appropriate result', function(done) {
            expressionParser.parse('((@number) * (@number2))',
                scope, 'String', function(error, result) {
                    should.not.exist(error);
                    result.should.equal(22475);
                    done();
                });
        });
    });

    describe('When trim() function is executed', function() {
        it('should return the appropriate piece of the string', function(done) {
            expressionParser.parse(
                'trim(@spaces)',
                scope,
                'String',
                function(error, result) {
                    should.not.exist(error);
                    result.should.equal('5 a b c d 5');
                    done();
                });
        });
    });

    describe('When an expression with strings containing spaces is concatenated', function() {
        it('should honour the whitespaces', function(done) {
            expressionParser.parse('"Pruebas " # "De Strings"', scope, 'String', function(error, result) {
                should.not.exist(error);
                result.should.equal('Pruebas De Strings');
                done();
            });
        });
    });

    describe('When an expression with strings with single quotation marks is parsed', function() {
        it('should accept the strings', function(done) {
            expressionParser.parse('\'Pruebas \' # \'De Strings\'', scope, 'String', function(error, result) {
                should.not.exist(error);
                result.should.equal('Pruebas De Strings');
                done();
            });
        });
    });

    describe('When a string is concatenated with a number', function() {
        it('should result in a string concatenation', function(done) {
            expressionParser.parse('"number " # 5', scope, 'String', function(error, result) {
                should.not.exist(error);
                result.should.equal('number 5');
                done();
            });
        });
    });

    describe('When an expression with a wrong type is parsed', function() {
        it('should raise a WRONG_EXPRESSION_TYPE error', function(done) {
            expressionParser.parse('"number " # 5', scope, 'Device', function(error, result) {
                should.exist(error);
                error.name.should.equal('WRONG_EXPRESSION_TYPE');
                done();
            });
        });
    });

    describe('When an expression with a parse error is parsed', function() {
        it('should raise an INVALID_EXPRESSION error', function(done) {
            expressionParser.parse('"numb+sd ññ ((', scope, 'Number', function(error, result) {
                should.exist(error);
                error.name.should.equal('INVALID_EXPRESSION');
                done();
            });
        });
    });

    describe('When an string function is used with an expression', function() {
        it('should work on the expression value', function(done) {
            expressionParser.parse('indexOf(24 * @big, "80")', scope, 'String', function(error, result) {
                should.not.exist(error);
                result.should.equal(1);
                done();
            });
        });
    });

});
