/*
 * Copyright 2020 Telefonica Investigación y Desarrollo, S.A.U
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
 * Modified by: Jason Fox - FIWARE Foundation
 */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const utils = require('../../../tools/utils');
const should = require('should');
const logger = require('logops');
const nock = require('nock');
let contextBrokerMock;
const iotAgentConfig = {
    autocast: true,
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'ld',
        jsonLdContext: 'http://context.json-ld'
    },
    server: {
        port: 4041
    },
    types: {
        Light: {
            commands: [],
            type: 'Light',
            active: [
                {
                    name: 'pressure',
                    type: 'Number'
                },
                {
                    name: 'temperature',
                    type: 'Number'
                },
                {
                    name: 'id',
                    type: 'String'
                },
                {
                    name: 'status',
                    type: 'Boolean'
                },
                {
                    name: 'keep_alive',
                    type: 'None'
                },
                {
                    name: 'tags',
                    type: 'Array'
                },
                {
                    name: 'configuration',
                    type: 'Object'
                }
            ]
        }
    },
    service: 'smartGondor',
    subservice: 'gardens',
    providerUrl: 'http://smartGondor.com'
};

describe('NGSI-LD - JSON native types autocast test', function() {
    beforeEach(function() {
        logger.setLevel('FATAL');
    });

    afterEach(function(done) {
        iotAgentLib.deactivate(done);
    });

    describe(
        'When the IoT Agent receives new information from a device.' + 'Observation with Number type and Integer value',
        function() {
            const values = [
                {
                    name: 'pressure',
                    type: 'Number',
                    value: '23'
                }
            ];

            beforeEach(function(done) {
                nock.cleanAll();

                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartGondor')
                    .post(
                        '/ngsi-ld/v1/entityOperations/upsert/',
                        utils.readExampleFile(
                            './test/unit/ngsi-ld/examples/contextRequests/updateContextAutocast1.json'
                        )
                    )

                    .reply(204);

                iotAgentLib.activate(iotAgentConfig, done);
            });

            it('should change the value of the corresponding attribute in the context broker', function(done) {
                iotAgentLib.update('light1', 'Light', '', values, function(error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        }
    );

    describe(
        'When the IoT Agent receives new information from a device.' + 'Observation with Number type and Float value',
        function() {
            const values = [
                {
                    name: 'temperature',
                    type: 'Number',
                    value: '14.4'
                }
            ];

            beforeEach(function(done) {
                nock.cleanAll();

                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartGondor')
                    .post(
                        '/ngsi-ld/v1/entityOperations/upsert/',
                        utils.readExampleFile(
                            './test/unit/ngsi-ld/examples/contextRequests/updateContextAutocast2.json'
                        )
                    )

                    .reply(204);

                iotAgentLib.activate(iotAgentConfig, done);
            });

            it('should change the value of the corresponding attribute in the context broker', function(done) {
                iotAgentLib.update('light1', 'Light', '', values, function(error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        }
    );

    describe(
        'When the IoT Agent receives new information from a device.' + 'Observation with Boolean type and True value',
        function() {
            const values = [
                {
                    name: 'status',
                    type: 'Boolean',
                    value: 'true'
                }
            ];

            beforeEach(function(done) {
                nock.cleanAll();

                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartGondor')
                    .post(
                        '/ngsi-ld/v1/entityOperations/upsert/',
                        utils.readExampleFile(
                            './test/unit/ngsi-ld/examples/contextRequests/updateContextAutocast3.json'
                        )
                    )

                    .reply(204);

                iotAgentLib.activate(iotAgentConfig, done);
            });

            it('should change the value of the corresponding attribute in the context broker', function(done) {
                iotAgentLib.update('light1', 'Light', '', values, function(error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        }
    );

    describe(
        'When the IoT Agent receives new information from a device.' + 'Observation with Boolean type and False value',
        function() {
            const values = [
                {
                    name: 'status',
                    type: 'Boolean',
                    value: 'false'
                }
            ];

            beforeEach(function(done) {
                nock.cleanAll();

                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartGondor')
                    .post(
                        '/ngsi-ld/v1/entityOperations/upsert/',
                        utils.readExampleFile(
                            './test/unit/ngsi-ld/examples/contextRequests/updateContextAutocast4.json'
                        )
                    )

                    .reply(204);

                iotAgentLib.activate(iotAgentConfig, done);
            });

            it('should change the value of the corresponding attribute in the context broker', function(done) {
                iotAgentLib.update('light1', 'Light', '', values, function(error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        }
    );

    describe('When the IoT Agent receives new information from a device. Observation with None type', function() {
        const values = [
            {
                name: 'keep_alive',
                type: 'None',
                value: 'null'
            }
        ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/updateContextAutocast5.json')
                )

                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should change the value of the corresponding attribute in the context broker', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives new information from a device. Observation with Array type', function() {
        const values = [
            {
                name: 'tags',
                type: 'Array',
                value: '["iot","device"]'
            }
        ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/updateContextAutocast6.json')
                )

                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should change the value of the corresponding attribute in the context broker', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives new information from a device. Observation with Object type', function() {
        const values = [
            {
                name: 'configuration',
                type: 'Object',
                value: '{"firmware": {"version": "1.1.0","hash": "cf23df2207d99a74fbe169e3eba035e633b65d94"}}'
            }
        ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/updateContextAutocast7.json')
                )

                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should change the value of the corresponding attribute in the context broker', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives new information from a device. Observation with Time type', function() {
        const values = [
            {
                name: 'configuration',
                type: 'Time',
                value: '2016-04-30T14:59:46.000Z'
            }
        ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/updateContextAutocast8.json')
                )

                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should change the value of the corresponding attribute in the context broker', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives new information from a device. Observation with DateTime type', function() {
        const values = [
            {
                name: 'configuration',
                type: 'DateTime',
                value: '2016-04-30Z'
            }
        ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/updateContextAutocast9.json')
                )

                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should change the value of the corresponding attribute in the context broker', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives new information from a device. Observation with Date type', function() {
        const values = [
            {
                name: 'configuration',
                type: 'Date',
                value: '2016-04-30T14:59:46.000Z'
            }
        ];

        beforeEach(function(done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/updateContextAutocast10.json')
                )

                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should change the value of the corresponding attribute in the context broker', function(done) {
            iotAgentLib.update('light1', 'Light', '', values, function(error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});
