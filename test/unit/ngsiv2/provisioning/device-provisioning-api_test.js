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
const utils = require('../../../tools/utils');
const request = utils.request;
const should = require('should');
const nock = require('nock');

const moment = require('moment');
let contextBrokerMock;
const iotAgentConfig = {
    logLevel: 'FATAL',
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'v2'
    },
    server: {
        port: 4041,
        host: 'localhost',
        baseRoot: '/'
    },
    types: {},
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    explicitAttrs: false,
    useCBflowControl: true
};

describe('NGSI-v2 - Device provisioning API: Provision devices', function () {
    beforeEach(function (done) {
        nock.cleanAll();

        iotAgentLib.activate(iotAgentConfig, function () {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerProvisionedDevice.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(204);

            iotAgentLib.clearAll(done);
        });
    });

    afterEach(function (done) {
        nock.cleanAll();
        iotAgentLib.setProvisioningHandler();
        iotAgentLib.deactivate(done);
    });

    describe('When a device provisioning request with all the required data arrives to the IoT Agent', function () {
        beforeEach(function () {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post(
                    '/v2/registrations',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerProvisionedDevice.json'
                    )
                )
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });
        });

        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice.json'),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        it('should add the device to the devices list', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(201);

                iotAgentLib.listDevices('smartgondor', '/gardens', function (error, results) {
                    results.devices.length.should.equal(1);
                    done();
                });
            });
        });

        it('should call the device provisioning handler if present', function (done) {
            let handlerCalled = false;

            iotAgentLib.setProvisioningHandler(function (device, callback) {
                handlerCalled = true;
                callback(null, device);
            });

            request(options, function (error, response, body) {
                handlerCalled.should.equal(true);
                done();
            });
        });

        it('should store the device with the provided entity id, name and type', function (done) {
            request(options, function (error, response, body) {
                response.statusCode.should.equal(201);
                iotAgentLib.listDevices('smartgondor', '/gardens', function (error, results) {
                    results.devices[0].id.should.equal('Light1');
                    results.devices[0].name.should.equal('TheFirstLight');
                    results.devices[0].type.should.equal('TheLightType');
                    done();
                });
            });
        });
        it('should store the device with the per device information', function (done) {
            request(options, function (error, response, body) {
                response.statusCode.should.equal(201);
                iotAgentLib.listDevices('smartgondor', '/gardens', function (error, results) {
                    should.exist(results.devices[0].timezone);
                    results.devices[0].timezone.should.equal('America/Santiago');
                    should.exist(results.devices[0].endpoint);
                    results.devices[0].endpoint.should.equal('http://fakedEndpoint:1234');
                    should.exist(results.devices[0].transport);
                    results.devices[0].transport.should.equal('MQTT');
                    should.exist(results.devices[0].lazy);
                    results.devices[0].lazy.length.should.equal(1);
                    results.devices[0].lazy[0].name.should.equal('luminance');
                    should.exist(results.devices[0].staticAttributes);
                    results.devices[0].commands.length.should.equal(1);
                    results.devices[0].commands[0].name.should.equal('commandAttr');
                    should.exist(results.devices[0].staticAttributes);
                    results.devices[0].staticAttributes.length.should.equal(1);
                    results.devices[0].staticAttributes[0].name.should.equal('hardcodedAttr');
                    should.exist(results.devices[0].active);
                    results.devices[0].active.length.should.equal(1);
                    results.devices[0].active[0].name.should.equal('attr_name');
                    should.exist(results.devices[0].internalAttributes);
                    results.devices[0].internalAttributes.length.should.equal(1);
                    results.devices[0].internalAttributes[0].customField.should.equal('customValue');
                    done();
                });
            });
        });

        it('should store fill the device ID in case only the name is provided', function (done) {
            /* jshint camelcase:false */
            request(options, function (error, response, body) {
                response.statusCode.should.equal(201);
                iotAgentLib.listDevices('smartgondor', '/gardens', function (error, results) {
                    results.devices[0].lazy[0].object_id.should.equal('luminance');
                    results.devices[0].commands[0].object_id.should.equal('commandAttr');
                    results.devices[0].active[0].object_id.should.equal('attr_name');
                    done();
                });
            });
        });

        it('should store service and subservice info from the headers along with the device data', function (done) {
            request(options, function (error, response, body) {
                response.statusCode.should.equal(201);
                iotAgentLib.listDevices('smartgondor', '/gardens', function (error, results) {
                    should.exist(results.devices[0].service);
                    results.devices[0].service.should.equal('smartgondor');
                    should.exist(results.devices[0].subservice);
                    results.devices[0].subservice.should.equal('/gardens');
                    done();
                });
            });
        });

        it('should not create the initial entity in the Context Broker', function (done) {
            request(options, function (error, response, body) {
                response.statusCode.should.equal(201);
                iotAgentLib.listDevices('smartgondor', '/gardens', function (error, results) {
                    contextBrokerMock.done();
                    done();
                });
            });
        });
    });
    describe('When a device provisioning request with a TimeInstant attribute arrives to the IoTA', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionTimeInstant.json'),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function (done) {
            iotAgentLib.deactivate(function () {
                iotAgentConfig.timestamp = true;
                iotAgentLib.activate(iotAgentConfig, done);
            });
        });

        afterEach(function () {
            iotAgentConfig.timestamp = false;
        });

        beforeEach(function (done) {
            nock.cleanAll();
            done();
        });

        it('should send the appropriate requests to the Context Broker', function (done) {
            request(options, function (error, response, body) {
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When a device provisioning request with a timestamp provision attribute arrives to the IoTA', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionTimeInstant2.json'),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function (done) {
            iotAgentLib.deactivate(function () {
                iotAgentConfig.timestamp = false;
                iotAgentLib.activate(iotAgentConfig, done);
            });
        });

        afterEach(function () {
            iotAgentConfig.timestamp = false;
        });

        beforeEach(function (done) {
            nock.cleanAll();
            done();
        });

        it('should send the appropriate requests to the Context Broker', function (done) {
            request(options, function (error, response, body) {
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When a device provisioning request with explicitAttrs provision attribute arrives to the IoTA', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionExplicitAttrs.json'),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function (done) {
            iotAgentLib.deactivate(function () {
                iotAgentConfig.explicitAttrs = false;
                iotAgentLib.activate(iotAgentConfig, done);
            });
        });

        afterEach(function () {
            iotAgentConfig.explicitAttrs = false;
        });

        beforeEach(function (done) {
            nock.cleanAll();
            done();
        });
        it('should send the appropriate requests to the Context Broker', function (done) {
            request(options, function (error, response, body) {
                contextBrokerMock.done();
                done();
            });
        });
        it('should store the device with explicitAttrs:true device information', function (done) {
            request(options, function (error, response, body) {
                iotAgentLib.listDevices('smartgondor', '/gardens', function (error, results) {
                    should.exist(results.devices[0].explicitAttrs);
                    results.devices[0].explicitAttrs.should.equal(true);
                    done();
                });
            });
        });
    });

    describe(
        'When a device provisioning request without explicitAttrs provision attribute arrives to the IoTA' +
            ' and explicitAttrs is not configured at group level',
        function () {
            const options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                json: utils.readExampleFile(
                    './test/unit/examples/deviceProvisioningRequests/provisionMinimumDevice.json'
                ),
                headers: {
                    'fiware-service': 'smartgondor',
                    'fiware-servicepath': '/gardens'
                }
            };

            beforeEach(function (done) {
                iotAgentLib.deactivate(function () {
                    iotAgentConfig.explicitAttrs = false;
                    iotAgentLib.activate(iotAgentConfig, done);
                });
            });

            afterEach(function () {
                iotAgentConfig.explicitAttrs = false;
            });

            beforeEach(function (done) {
                nock.cleanAll();
                done();
            });

            it('should send the appropriate requests to the Context Broker', function (done) {
                request(options, function (error, response, body) {
                    contextBrokerMock.done();
                    done();
                });
            });
            it('should store the device without explicitAttrs', function (done) {
                request(options, function (error, response, body) {
                    iotAgentLib.listDevices('smartgondor', '/gardens', function (error, results) {
                        should.not.exist(results.devices[0].explicitAttrs);
                        done();
                    });
                });
            });
        }
    );

    describe(
        'When a device provisioning request without explicitAttrs provision attribute arrives to the IoTA' +
            ' and explicitAttrs is configured at group level',
        function () {
            const options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                json: utils.readExampleFile(
                    './test/unit/examples/deviceProvisioningRequests/provisionMinimumDevice.json'
                ),
                headers: {
                    'fiware-service': 'smartgondor',
                    'fiware-servicepath': '/gardens'
                }
            };
            const groupCreation = {
                url: 'http://localhost:4041/iot/services',
                method: 'POST',
                json: {
                    services: [
                        {
                            resource: '/Thing',
                            apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732',
                            /*jshint camelcase: false */
                            entity_type: 'MicroLights',
                            cbHost: 'http://192.168.1.1:1026',
                            explicitAttrs: true
                        }
                    ]
                },
                headers: {
                    'fiware-service': 'smartgondor',
                    'fiware-servicepath': '/gardens'
                }
            };

            beforeEach(function (done) {
                nock.cleanAll();
                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartgondor')
                    .matchHeader('fiware-servicepath', '/gardens')
                    .post(
                        '/v2/entities?options=upsert,flowControl',
                        utils.readExampleFile(
                            './test/unit/ngsiv2/examples/contextRequests/createMinimumProvisionedDevice.json'
                        )
                    )
                    .reply(204);

                done();
            });

            it('should store the device without explicitAttrs value', function (done) {
                request(groupCreation, function (error, response, body) {
                    request(options, function (error, response, body) {
                        iotAgentLib.listDevices('smartgondor', '/gardens', function (error, results) {
                            should.not.exist(results.devices[0].explicitAttrs);
                            done();
                        });
                    });
                });
            });
        }
    );

    describe(
        'When a device provisioning request without static attributes arrives to the IoTA' +
            ' and static attribute is configured at group level',
        function () {
            const options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                json: utils.readExampleFile(
                    './test/unit/examples/deviceProvisioningRequests/provisionMinimumDevice.json'
                ),
                headers: {
                    'fiware-service': 'smartgondor',
                    'fiware-servicepath': '/gardens'
                }
            };
            const groupCreation = {
                url: 'http://localhost:4041/iot/services',
                method: 'POST',
                json: {
                    services: [
                        {
                            resource: '/Thing',
                            apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732',
                            /*jshint camelcase: false */
                            entity_type: 'MicroLights',
                            cbHost: 'http://192.168.1.1:1026',
                            explicitAttrs: true,
                            static_attributes: [
                                {
                                    name: 'bootstrapServer',
                                    type: 'Address',
                                    value: '127.0.0.1'
                                }
                            ]
                        }
                    ]
                },
                headers: {
                    'fiware-service': 'smartgondor',
                    'fiware-servicepath': '/gardens'
                }
            };

            beforeEach(function (done) {
                nock.cleanAll();
                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartgondor')
                    .matchHeader('fiware-servicepath', '/gardens')
                    .post(
                        '/v2/entities?options=upsert,flowControl',
                        utils.readExampleFile(
                            './test/unit/ngsiv2/examples/' +
                                'contextRequests/createStaticAttributesProvisionDevice.json'
                        )
                    )
                    .reply(204);

                done();
            });

            it('should not store the device with static attributes provided in configuration', function (done) {
                request(groupCreation, function (error, response, body) {
                    request(options, function (error, response, body) {
                        iotAgentLib.listDevices('smartgondor', '/gardens', function (error, results) {
                            should.exist(results.devices[0].staticAttributes);
                            results.devices[0].staticAttributes.length.should.equal(0);
                            done();
                        });
                    });
                });
            });
        }
    );
    describe(
        'When a device provisioning request with static attributes arrives to the IoTA' +
            ' and static attribute is not configured at group level',
        function () {
            const options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                json: utils.readExampleFile(
                    './test/unit/examples/deviceProvisioningRequests/provisionStaticAttrsDevice.json'
                ),
                headers: {
                    'fiware-service': 'smartgondor',
                    'fiware-servicepath': '/gardens'
                }
            };
            const groupCreation = {
                url: 'http://localhost:4041/iot/services',
                method: 'POST',
                json: {
                    services: [
                        {
                            resource: '/Thing',
                            apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732',
                            /*jshint camelcase: false */
                            entity_type: 'MicroLights',
                            cbHost: 'http://192.168.1.1:1026',
                            explicitAttrs: true
                        }
                    ]
                },
                headers: {
                    'fiware-service': 'smartgondor',
                    'fiware-servicepath': '/gardens'
                }
            };

            beforeEach(function (done) {
                nock.cleanAll();
                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartgondor')
                    .matchHeader('fiware-servicepath', '/gardens')
                    .post(
                        '/v2/entities?options=upsert,flowControl',
                        utils.readExampleFile(
                            './test/unit/ngsiv2/examples/' +
                                'contextRequests/createStaticAttributesProvisionDevice.json'
                        )
                    )
                    .reply(204);

                done();
            });

            it('should store the device with static attributes provided in device', function (done) {
                request(groupCreation, function (error, response, body) {
                    request(options, function (error, response, body) {
                        iotAgentLib.listDevices('smartgondor', '/gardens', function (error, results) {
                            should.exist(results.devices[0].staticAttributes);
                            results.devices[0].staticAttributes[0].name.should.equal('bootstrapServer');
                            done();
                        });
                    });
                });
            });
        }
    );

    describe(
        'When a device provisioning request with static attributes arrives to the IoTA' +
            ' and static attribute is also configured at group level',
        function () {
            const options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                json: utils.readExampleFile(
                    './test/unit/examples/deviceProvisioningRequests/provisionStaticAttrsDevice2.json'
                ),
                headers: {
                    'fiware-service': 'smartgondor',
                    'fiware-servicepath': '/gardens'
                }
            };
            const groupCreation = {
                url: 'http://localhost:4041/iot/services',
                method: 'POST',
                json: {
                    services: [
                        {
                            resource: '/Thing',
                            apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732',
                            /*jshint camelcase: false */
                            entity_type: 'MicroLights',
                            cbHost: 'http://192.168.1.1:1026',
                            explicitAttrs: true,
                            static_attributes: [
                                {
                                    name: 'bootstrapServer',
                                    type: 'Address',
                                    value: '127.0.0.1'
                                }
                            ]
                        }
                    ]
                },
                headers: {
                    'fiware-service': 'smartgondor',
                    'fiware-servicepath': '/gardens'
                }
            };

            beforeEach(function (done) {
                nock.cleanAll();
                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartgondor')
                    .matchHeader('fiware-servicepath', '/gardens')
                    .post(
                        '/v2/entities?options=upsert,flowControl',
                        utils.readExampleFile(
                            './test/unit/ngsiv2/examples/' +
                                'contextRequests/createStaticAttributesProvisionDevice2.json'
                        )
                    )
                    .reply(204);

                done();
            });

            it('should store the device with static attributes provided in device but no in configuration', function (done) {
                request(groupCreation, function (error, response, body) {
                    request(options, function (error, response, body) {
                        iotAgentLib.listDevices('smartgondor', '/gardens', function (error, results) {
                            should.exist(results.devices[0].staticAttributes);
                            results.devices[0].staticAttributes.length.should.equal(1);
                            done();
                        });
                    });
                });
            });
        }
    );

    describe('When a device provisioning request arrives to the IoTA and entityNameExp was configured at group level', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionMinimumDevice4.json'),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };
        const groupCreation = {
            url: 'http://localhost:4041/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/Thing',
                        apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732',
                        /*jshint camelcase: false */
                        entity_type: 'MicroLights',
                        entityNameExp: "id + '__' + suffix_st",
                        cbHost: 'http://192.168.1.1:1026',
                        static_attributes: [
                            {
                                name: 'suffix_st',
                                type: 'Text',
                                value: 'SUFFIX'
                            }
                        ]
                    }
                ]
            },
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function (done) {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/createMinimumProvisionedDevice4.json'
                    )
                )
                .reply(204);

            done();
        });

        it('should store the entity name defined by expression', function (done) {
            request(groupCreation, function (error, response, body) {
                request(options, function (error, response, body) {
                    iotAgentLib.listDevices('smartgondor', '/gardens', function (error, results) {
                        should.exist(results.devices[0].name);
                        results.devices[0].name.should.equal('MicroLight1__SUFFIX');
                        done();
                    });
                });
            });
        });
    });

    describe(
        'When a device provisioning request with static attributes arrives to the IoTA' +
            ' and same static attribute is also configured at group level',
        function () {
            const options = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                json: utils.readExampleFile(
                    './test/unit/examples/deviceProvisioningRequests/provisionStaticAttrsDevice3.json'
                ),
                headers: {
                    'fiware-service': 'smartgondor',
                    'fiware-servicepath': '/gardens'
                }
            };
            const groupCreation = {
                url: 'http://localhost:4041/iot/services',
                method: 'POST',
                json: {
                    services: [
                        {
                            resource: '/Thing',
                            apikey: '801230BJKL23Y9090DSFL123HJK09H324HV8732',
                            /*jshint camelcase: false */
                            entity_type: 'MicroLights',
                            cbHost: 'http://192.168.1.1:1026',
                            explicitAttrs: true,
                            static_attributes: [
                                {
                                    name: 'bootstrapServer',
                                    type: 'Address',
                                    value: '127.0.0.1'
                                }
                            ]
                        }
                    ]
                },
                headers: {
                    'fiware-service': 'smartgondor',
                    'fiware-servicepath': '/gardens'
                }
            };

            beforeEach(function (done) {
                nock.cleanAll();
                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartgondor')
                    .matchHeader('fiware-servicepath', '/gardens')
                    .post(
                        '/v2/entities?options=upsert,flowControl',
                        utils.readExampleFile(
                            './test/unit/ngsiv2/examples/' +
                                'contextRequests/createStaticAttributesProvisionDevice3.json'
                        )
                    )
                    .reply(204);

                done();
            });

            it('should store the device with static attributes provided in device', function (done) {
                request(groupCreation, function (error, response, body) {
                    request(options, function (error, response, body) {
                        iotAgentLib.listDevices('smartgondor', '/gardens', function (error, results) {
                            should.exist(results.devices[0].staticAttributes);
                            results.devices[0].staticAttributes[0].value.should.equal('127.0.0.2');
                            done();
                        });
                    });
                });
            });
        }
    );

    describe('When a device provisioning request with a autoprovision attribute arrives to the IoTA', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionAutoprovision.json'),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function (done) {
            iotAgentLib.deactivate(function () {
                iotAgentLib.activate(iotAgentConfig, done);
            });
        });

        afterEach(function () {});

        beforeEach(function (done) {
            nock.cleanAll();
            done();
        });

        it('should should not appropriate requests to the Context Broker', function (done) {
            request(options, function (error, response, body) {
                done();
            });
        });
    });

    describe('When a device provisioning request arrives to the IoTAand timestamp is enabled in configuration', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionMinimumDevice.json'),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function (done) {
            iotAgentLib.deactivate(function () {
                iotAgentConfig.timestamp = true;
                iotAgentLib.activate(iotAgentConfig, done);
            });
        });

        afterEach(function () {
            iotAgentConfig.timestamp = false;
        });

        beforeEach(function (done) {
            nock.cleanAll();
            done();
        });

        it('should not send any requests to the Context Broker', function (done) {
            request(options, function (error, response, body) {
                done();
            });
        });
    });

    describe('When a device provisioning request with the minimum required data arrives to the IoT Agent', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionMinimumDevice.json'),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function (done) {
            nock.cleanAll();
            done();
        });

        it('should not send any requests to the Context Broker', function (done) {
            request(options, function (error, response, body) {
                done();
            });
        });

        it('should add the device to the devices list', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(201);

                iotAgentLib.listDevices('smartgondor', '/gardens', function (error, results) {
                    results.devices.length.should.equal(1);
                    done();
                });
            });
        });

        it('should store the device with the provided entity id, name and type', function (done) {
            request(options, function (error, response, body) {
                response.statusCode.should.equal(201);
                iotAgentLib.listDevices('smartgondor', '/gardens', function (error, results) {
                    results.devices[0].id.should.equal('MicroLight1');
                    results.devices[0].name.should.equal('FirstMicroLight');
                    results.devices[0].type.should.equal('MicroLights');
                    done();
                });
            });
        });
    });

    describe('When a device provisioning request with geo:point attributes arrives', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionGeopointDevice.json'),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function (done) {
            nock.cleanAll();
            done();
        });
        it('should not send any initial values to the Context Broker', function (done) {
            request(options, function (error, response, body) {
                done();
            });
        });
    });

    describe('When a device provisioning request with DateTime attributes arrives', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionDatetimeDevice.json'),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function (done) {
            nock.cleanAll();
            done();
        });
        it('should not send any initial values to the Context Broker', function (done) {
            request(options, function (error, response, body) {
                done();
            });
        });
    });

    describe('When two devices with the same ID but different services arrive to the agent', function () {
        const options1 = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionMinimumDevice.json'),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };
        const options2 = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionMinimumDevice.json'),
            headers: {
                'fiware-service': 'smartMordor',
                'fiware-servicepath': '/electricity'
            }
        };

        beforeEach(function (done) {
            nock.cleanAll();
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/createMinimumProvisionedDevice.json'
                    )
                )
                .reply(204);

            contextBrokerMock
                .post(
                    '/v2/entities?options=upsert,flowControl',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/createMinimumProvisionedDevice.json'
                    )
                )
                .reply(204);

            done();
        });

        it('should accept both creations', function (done) {
            request(options1, function (error, response, body) {
                response.statusCode.should.equal(201);

                request(options2, function (error, response, body) {
                    response.statusCode.should.equal(201);
                    done();
                });
            });
        });

        it('should show the new device in each list', function (done) {
            request(options1, function (error, response, body) {
                request(options2, function (error, response, body) {
                    iotAgentLib.listDevices('smartgondor', '/gardens', function (error, results) {
                        results.devices.length.should.equal(1);
                        results.devices[0].id.should.equal('MicroLight1');

                        iotAgentLib.listDevices('smartMordor', '/electricity', function (error, results) {
                            results.devices.length.should.equal(1);
                            results.devices[0].id.should.equal('MicroLight1');
                            done();
                        });
                    });
                });
            });
        });
    });

    describe('When there is a connection error with a String code connecting the CB', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionMinimumDevice.json'),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/registrations')
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });
            done();
        });

        it('should return a valid return code', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(201);

                done();
            });
        });
    });

    describe('When there is a connection error with a Number code connecting the CB', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionMinimumDevice.json'),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/registrations')
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            done();
        });

        it('should return a valid return code (three character number)', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(201);

                done();
            });
        });
    });

    describe('When a device provisioning request with missing data arrives to the IoT Agent', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile(
                './test/unit/examples/deviceProvisioningRequests/provisionDeviceMissingParameters.json'
            )
        };

        it('should raise a MISSING_ATTRIBUTES error, indicating the missing attributes', function (done) {
            request(options, function (error, response, body) {
                should.exist(body);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_ATTRIBUTES');
                body.message.should.match(/.*device_id.*/);
                done();
            });
        });
    });
    describe('When two device provisioning requests with the same service and Device ID arrive', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice.json'),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function (done) {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/registrations')
                .reply(201, null, { Location: '/v2/registrations/6319a7f5254b05844116584d' });

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/entities?options=upsert,flowControl')
                .reply(204);

            done();
        });

        it('should raise a DUPLICATE_ID error, indicating the ID was already in use', function (done) {
            request(options, function (error, response, body) {
                request(options, function (error, response, body) {
                    should.exist(body);
                    response.statusCode.should.equal(409);
                    body.name.should.equal('DUPLICATE_DEVICE_ID');
                    done();
                });
            });
        });
    });
    describe('When a device provisioning request is malformed', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile(
                './test/unit/examples/deviceProvisioningRequests/provisionNewDeviceMalformed1.json'
            ),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        it('should raise a WRONG_SYNTAX exception', function (done) {
            request(options, function (error, response, body) {
                request(options, function (error, response, body) {
                    should.exist(body);
                    response.statusCode.should.equal(400);
                    body.name.should.equal('WRONG_SYNTAX');
                    done();
                });
            });
        });
    });
    describe('When an agent is activated with a different base root', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/newBaseRoot/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice.json')
        };

        beforeEach(function (done) {
            iotAgentLib.deactivate(function () {
                iotAgentConfig.server.baseRoot = '/newBaseRoot';
                iotAgentLib.activate(iotAgentConfig, done);
            });
        });

        afterEach(function () {
            iotAgentConfig.server.baseRoot = '/';
        });

        it('should listen to requests in the new root', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(201);

                iotAgentLib.listDevices('smartgondor', '/gardens', function (error, results) {
                    results.devices.length.should.equal(1);
                    done();
                });
            });
        });
    });
    describe('When a device provisioning request without the mandatory headers arrives to the Agent', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {},
            json: utils.readExampleFile(
                './test/unit/examples/deviceProvisioningRequests/provisionDeviceMissingParameters.json'
            )
        };

        it('should raise a MISSING_HEADERS error, indicating the missing attributes', function (done) {
            request(options, function (error, response, body) {
                should.exist(body);
                response.statusCode.should.equal(400);
                body.name.should.equal('MISSING_HEADERS');
                done();
            });
        });
    });
    describe('When a device delete request arrives to the Agent for a not existing device', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/Light84',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'DELETE'
        };

        it('should return a 404 error', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(404);
                done();
            });
        });
    });
    describe('When a device provisioning request arrives to the Agent without device_id', function () {
        const options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            },
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDeviceEmpty.json')
        };

        it('should return a 400 error', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                done();
            });
        });
    });
});
