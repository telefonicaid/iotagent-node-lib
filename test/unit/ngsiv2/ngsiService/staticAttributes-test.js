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
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 *
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */

/* eslint-disable no-unused-vars */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const async = require('async');
const should = require('should');
const logger = require('logops');
const nock = require('nock');
let contextBrokerMock;
const iotAgentConfig = {
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'v2'
    },
    server: {
        port: 4041,
        host: 'localhost'
    },
    types: {
        Light: {
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
                }
            ]
        },
        Light_Explicit_True: {
            commands: [],
            type: 'Light_Explicit_True',
            explicitAttrs: true,
            timestamp: false,
            active: [
                {
                    name: 'pressure',
                    type: 'Number'
                }
            ],
            staticAttributes: [
                {
                    name: 'attr1',
                    type: 'Text',
                    value: 'Static Text'
                },
                {
                    name: 'attr2',
                    type: 'Number',
                    value: 123
                }
            ]
        },
        Light_Explicit_False: {
            commands: [],
            type: 'Light_Explicit_False',
            explicitAttrs: false,
            timestamp: false,
            active: [
                {
                    name: 'pressure',
                    type: 'Number'
                }
            ],
            staticAttributes: [
                {
                    name: 'attr1',
                    type: 'Text',
                    value: 'Static Text'
                },
                {
                    name: 'attr2',
                    type: 'Number',
                    value: 123
                }
            ]
        },
        Light_Explicit_Array: {
            commands: [],
            type: 'Light_Explicit_Array',
            explicitAttrs: '[ "pressure", "attr1" ]',
            timestamp: false,
            active: [
                {
                    name: 'pressure',
                    type: 'Number'
                }
            ],
            staticAttributes: [
                {
                    name: 'attr1',
                    type: 'Text',
                    value: 'Static Text'
                },
                {
                    name: 'attr2',
                    type: 'Number',
                    value: 123
                }
            ]
        },
        Light_Explicit_Expression: {
            commands: [],
            type: 'Light_Explicit_Expression',
            explicitAttrs: ' pressure ? [ "pressure", "attr1" ] : [ "attr2" ] ',
            timestamp: false,
            active: [
                {
                    name: 'pressure',
                    type: 'Number'
                }
            ],
            staticAttributes: [
                {
                    name: 'attr1',
                    type: 'Text',
                    value: 'Static Text'
                },
                {
                    name: 'attr2',
                    type: 'Number',
                    value: 123
                }
            ]
        }
    },
    timestamp: true,
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    useCBflowControl: true
};

describe('NGSI-v2 - Static attributes test', function () {
    const values = [
        {
            name: 'state',
            type: 'boolean',
            value: true
        },
        {
            name: 'dimming',
            type: 'number',
            value: 87
        }
    ];

    beforeEach(function () {
        logger.setLevel('FATAL');
    });

    afterEach(function (done) {
        iotAgentLib.deactivate(done);
    });

    describe('When information from a device with multiple static attributes and metadata is sent', function () {
        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl')
                .times(4)
                .reply(204)
                .post('/v2/entities?options=upsert,flowControl', function (body) {
                    let metadatas = 0;
                    for (const i in body) {
                        if (body[i].metadata) {
                            metadatas += Object.keys(body[i].metadata).length;
                        }
                    }
                    return metadatas === Object.keys(body).length - 1 - 2;
                })
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should send a single TimeInstant per attribute', function (done) {
            async.series(
                [
                    async.apply(iotAgentLib.update, 'light1', 'Light', '', values),
                    async.apply(iotAgentLib.update, 'light1', 'Light', '', values),
                    async.apply(iotAgentLib.update, 'light1', 'Light', '', values),
                    async.apply(iotAgentLib.update, 'light1', 'Light', '', values),
                    async.apply(iotAgentLib.update, 'light1', 'Light', '', values)
                ],
                function (error, results) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                }
            );
        });
    });

    describe('When using explicitAttrs true', function () {
        const newValues = [
            {
                name: 'pressure',
                type: 'Number',
                value: 321
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl', {
                    id: 'light2',
                    type: 'Light_Explicit_True',
                    pressure: {
                        value: 321,
                        type: 'Number'
                    },
                    attr1: {
                        value: 'Static Text',
                        type: 'Text'
                    },
                    attr2: {
                        value: 123,
                        type: 'Number'
                    }
                })
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should include all the statics', function (done) {
            iotAgentLib.update('light2', 'Light_Explicit_True', '', newValues, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When using explicitAttrs false', function () {
        const newValues = [
            {
                name: 'pressure',
                type: 'Number',
                value: 321
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl', {
                    id: 'light2',
                    type: 'Light_Explicit_True',
                    pressure: {
                        value: 321,
                        type: 'Number'
                    },
                    attr1: {
                        value: 'Static Text',
                        type: 'Text'
                    },
                    attr2: {
                        value: 123,
                        type: 'Number'
                    }
                })
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should include all the statics', function (done) {
            iotAgentLib.update('light2', 'Light_Explicit_True', '', newValues, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When using explicitAttrs as array', function () {
        const newValues = [
            {
                name: 'pressure',
                type: 'Number',
                value: 321
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl', {
                    id: 'light2',
                    type: 'Light_Explicit_Array',
                    pressure: {
                        value: 321,
                        type: 'Number'
                    },
                    attr1: {
                        value: 'Static Text',
                        type: 'Text'
                    }
                })
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should include only statics defined into the array', function (done) {
            iotAgentLib.update('light2', 'Light_Explicit_Array', '', newValues, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When using explicitAttrs as expression', function () {
        const newValues = [
            {
                name: 'pressure',
                type: 'Number',
                value: 321
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', 'gardens')
                .post('/v2/entities?options=upsert,flowControl', {
                    id: 'light2',
                    type: 'Light_Explicit_Expression',
                    pressure: {
                        value: 321,
                        type: 'Number'
                    },
                    attr1: {
                        value: 'Static Text',
                        type: 'Text'
                    }
                })
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should include statics as the result on the expression', function (done) {
            iotAgentLib.update('light2', 'Light_Explicit_Expression', '', newValues, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});
