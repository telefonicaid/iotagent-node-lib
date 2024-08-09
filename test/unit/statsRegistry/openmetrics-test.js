/*
 * Copyright 2024 Telefonica Investigación y Desarrollo, S.A.U
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
 */

/* eslint-disable no-unused-vars */

const statsRegistry = require('../../../lib/services/stats/statsRegistry');
const should = require('should');

describe('statsRegistry - openmetrics endpoint', function () {

    const testCases = [
        {
            description: 'Should accept standard openmetrics 0.0.1 header',
            accept: 'application/openmetrics-text; version=0.0.1; charset=utf-8',
            contentType: {
                mediaType: 'application/openmetrics-text',
                version: '0.0.1',
                charset: 'utf-8'
            }
        },
        {
            description: 'Should accept standard openmetrics 1.0.0 header',
            accept: 'application/openmetrics-text; version=1.0.0; charset=utf-8',
            contentType: {
                mediaType: 'application/openmetrics-text',
                version: '1.0.0',
                charset: 'utf-8'
            }
        },
        {
            description: 'Should accept openmetrics with no version',
            accept: 'application/openmetrics-text',
            contentType: {
                mediaType: 'application/openmetrics-text',
                version: '1.0.0',
                charset: 'utf-8'
            }
        },
        {
            description: 'Should accept text/plain header with version',
            accept: 'text/plain; version=0.0.4',
            contentType: {
                mediaType: 'text/plain',
                version: '0.0.4',
                charset: 'utf-8'
            }
        },
        {
            description: 'Should accept wildcard header',
            accept: '*/*',
            contentType: {
                mediaType: 'text/plain',
                version: '0.0.4',
                charset: 'utf-8'
            }
        },
        {
            description: 'Should accept both openmetrics and text/plain, prefer openmetrics',
            accept: 'application/openmetrics-text; version=0.0.1; charset=utf-8,text/plain;version=0.0.4',
            contentType: {
                mediaType: 'application/openmetrics-text',
                version: '0.0.1',
                charset: 'utf-8'
            }
        },
        {
            description: 'Should accept both text/plain and openmetrics, prefer openmetrics',
            accept: 'text/plain,application/openmetrics-text; version=0.0.1; charset=utf-8',
            contentType: {
                mediaType: 'application/openmetrics-text',
                version: '0.0.1',
                charset: 'utf-8'
            }
        },
        {
            description: 'Should accept both openmetrics and text/plain, prefer text if preference set',
            accept: 'application/openmetrics-text; version=0.0.1; charset=utf-8;q=0.5,text/plain;q=0.7',
            contentType: {
                mediaType: 'text/plain',
                version: '0.0.4',
                charset: 'utf-8'
            }
        },
        {
            description: 'Should match version to content-type',
            accept: 'application/openmetrics-text; version=0.0.1; charset=utf-8, text/plain;version=1.0.0',
            contentType: {
                mediaType: 'application/openmetrics-text',
                version: '0.0.1',
                charset: 'utf-8'
            }
        },
        {
            description: 'Should set default q to 1.0',
            accept: 'application/openmetrics-text; version=0.0.1; q=0.5,text/plain;version=0.0.4',
            contentType: {
                mediaType: 'text/plain',
                version: '0.0.4',
                charset: 'utf-8'
            }
        },
        {
            description: 'Should accept mixture of content-types and q',
            accept: 'application/openmetrics-text; version=0.0.1,text/plain;version=0.0.4;q=0.5,*/*;q=0.1',
            contentType: {
                mediaType: 'application/openmetrics-text',
                version: '0.0.1',
                charset: 'utf-8'
            }
        },
        {
            description: 'Should reject Invalid charset',
            accept: '*/*; charset=utf-16',
            contentType: null
        },
        {
            description: 'Should reject Invalid openmetrics version',
            accept: 'application/openmetrics-text; version=0.0.5',
            contentType: null
        },
        {
            description: 'Should reject Invalid text/plain',
            accept: 'text/plain; version=0.0.2',
            contentType: null
        }
    ]

    for (const testCase of testCases) {
        describe(testCase.description, function () {
            const result = statsRegistry.matchContentType(testCase.accept);
            if (testCase.contentType) {
                it('should match', function (done) {
                    should.exist(result);
                    result.mediaType.should.equal(testCase.contentType.mediaType);
                    result.version.should.equal(testCase.contentType.version);
                    result.charset.should.equal(testCase.contentType.charset);
                    done();
                });
            } else {
                it('should not match', function (done) {
                    should.not.exist(result);
                    done();
                });
            }
        });
    }
});
