/*
 * Copyright 2014 Telefonica Investigación y Desarrollo, S.A.U
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

var iotAgentLib = require('../../../lib/fiware-iotagent-lib'),
    async = require('async'),
    utils = require('../../tools/utils'),
    should = require('should'),
    logger = require('logops'),
    nock = require('nock'),
    contextBrokerMock,
    iotAgentConfig = {
        contextBroker: {
            host: '192.168.1.1',
            port: '1026'
        },
        server: {
            port: 4041
        },
        types: {
            'Light': {
                commands: [],
                type: 'Light',
                lazy: [
                    {
                        name: 'temperature',
                        type: 'centigrades'
                    }
                ],
                active: [
                    {
                        name: 'pressure',
                        type: 'Hgmm'
                    }
                ],
                staticAttributes: [
                    {
                        name: 'attr1',
                        type: 'type1'
                    },
                    {
                        name: 'attr2',
                        type: 'type2'
                    },
                    {
                        name: 'attr3',
                        type: 'type3'
                    },
                    {
                        name: 'attr4',
                        type: 'type4'
                    },
                ]
            }
        },
        timestamp: true,
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    };


describe('Static attributes test', function() {
    var values = [
        {
            name: 'state',
            type: 'Boolean',
            value: 'true'
        },
        {
            name: 'dimming',
            type: 'Percentage',
            value: '87'
        }
    ];

    beforeEach(function() {
        logger.setLevel('FATAL');
    });

    afterEach(function(done) {
        iotAgentLib.deactivate(done);
    });

    describe('When information from a device with multiple static attributes and metadata is sent', function() {
        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v1/updateContext')
                .times(4)
                .reply(200,
                    utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'))
                .post('/v1/updateContext', function(body) {
                    var metadatas = 0;

                    for (var i = 0; i < body.contextElements[0].attributes.length; i++) {
                        if (body.contextElements[0].attributes[i].metadatas) {
                            metadatas += body.contextElements[0].attributes[i].metadatas.length;
                        }
                    }
                    return metadatas === body.contextElements[0].attributes.length - 1;
                })
                .reply(200,
                    utils.readExampleFile('./test/unit/examples/contextResponses/updateContext1Success.json'));

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should send a single TimeInstant per attribute', function(done) {
            async.series([
                async.apply(iotAgentLib.update, 'light1', 'Light', '', values),
                async.apply(iotAgentLib.update, 'light1', 'Light', '', values),
                async.apply(iotAgentLib.update, 'light1', 'Light', '', values),
                async.apply(iotAgentLib.update, 'light1', 'Light', '', values),
                async.apply(iotAgentLib.update, 'light1', 'Light', '', values)
            ], function(error, results) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});
