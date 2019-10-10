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
'use strict';

var iotAgentLib = require('../../../../lib/fiware-iotagent-lib'),
    utils = require('../../../tools/utils'),
    should = require('should'),
    nock = require('nock'),
    async = require('async'),
    request = require('request'),
    contextBrokerMock,
    iotAgentConfig = {
        logLevel: 'FATAL',
        contextBroker: {
            host: '192.168.1.1',
            port: '1026',
            ngsiVersion: 'v2'
        },
        server: {
            port: 4041,
            baseRoot: '/'
        },
        types: {},
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    };

describe('Device provisioning API: Update provisioned devices', function() {
    var provisioning1Options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionNewDevice.json')
        },
        provisioning2Options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionAnotherDevice.json')
        },
        provisioning3Options = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionMinimumDevice2.json')
        };

    beforeEach(function(done) {
        nock.cleanAll();
        iotAgentLib.activate(iotAgentConfig, function() {
            var nockBody = utils.readExampleFile(
                './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerProvisionedDevice.json');
            nockBody.expires = /.+/i;
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/registrations', nockBody)
                .reply(201, null, {'Location': '/v2/registrations/6319a7f5254b05844116584d'});

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/entities?options=upsert')
                .reply(204);

            var nockBody2 = utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextAvailabilityRequests/registerProvisionedDevice2.json');
            nockBody2.expires = /.+/i;
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/registrations', nockBody2)
                .reply(201, null, {'Location': '/v2/registrations/6719a7f5254b058441165849'});

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                 .post('/v2/entities?options=upsert')
                .reply(204);

            // FIXME: When https://github.com/telefonicaid/fiware-orion/issues/3007 is merged into master branch,
            // this function should use the new API. This is just a temporary solution which implies deleting the
            // registration and creating a new one.
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .delete('/v2/registrations/6719a7f5254b058441165849')
                .reply(204);

            var nockBody3 = utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextAvailabilityRequests/updateIoTAgent2.json');
            nockBody3.expires = /.+/i;
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/registrations', nockBody3)
                .reply(201, null, {'Location': '/v2/registrations/4419a7f5254b058441165849'});

            async.series([
                iotAgentLib.clearAll,
                async.apply(request, provisioning1Options),
                async.apply(request, provisioning2Options)
            ], done);
        });
    });

    afterEach(function(done) {
        iotAgentLib.clearAll(function() {
            iotAgentLib.deactivate(done);
        });
    });

    describe('When a request to update a provision device arrives', function() {
        var optionsUpdate = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/Light1',
            method: 'PUT',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/updateProvisionDevice.json')
        };

        beforeEach(function() {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/entities/TheFirstLight/attrs?type=TheLightType', {})
                .reply(204);

            // FIXME: When https://github.com/telefonicaid/fiware-orion/issues/3007 is merged into master branch,
            // this function should use the new API. This is just a temporary solution which implies deleting the
            // registration and creating a new one.

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .delete('/v2/registrations/6319a7f5254b05844116584d')
                .reply(204);

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/registrations',
                utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextAvailabilityRequests/updateIoTAgent2.json'))
                .reply(201, null, {'Location': '/v2/registrations/4419a7f5254b058441165849'});

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/registrations',
                utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextAvailabilityRequests/updateIoTAgent3.json'))
                .reply(201, null, {'Location': '/v2/registrations/4419a7f52546658441165849'});
        });

        it('should return a 200 OK and no errors', function(done) {
            request(optionsUpdate, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(204);
                done();
            });
        });

        it('should have updated the data when asking for the particular device', function(done) {
            request(optionsUpdate, function(error, response, body) {
                var options = {
                    url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/Light1',
                    headers: {
                        'fiware-service': 'smartGondor',
                        'fiware-servicepath': '/gardens'
                    },
                    method: 'GET'
                };

                request(options, function(error, response, body) {
                    /* jshint camelcase:false */

                    var parsedBody = JSON.parse(body);
                    parsedBody.entity_name.should.equal('ANewLightName');
                    parsedBody.timezone.should.equal('Europe/Madrid');
                    done();
                });
            });
        });

        it('should not modify the attributes not present in the update request', function(done) {
            request(optionsUpdate, function(error, response, body) {
                var options = {
                    url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/Light1',
                    headers: {
                        'fiware-service': 'smartGondor',
                        'fiware-servicepath': '/gardens'
                    },
                    method: 'GET'
                };

                request(options, function(error, response, body) {
                    /* jshint camelcase:false */

                    var parsedBody = JSON.parse(body);
                    parsedBody.entity_type.should.equal('TheLightType');
                    parsedBody.service.should.equal('smartGondor');
                    done();
                });
            });
        });
    });
    describe('When an update request arrives with a new Device ID', function() {
        var optionsUpdate = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/Light1',
            method: 'PUT',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile(
                './test/unit/examples/deviceProvisioningRequests/updateProvisionDeviceWithId.json')
        };

        it('should raise a 400 error', function(done) {
            request(optionsUpdate, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                done();
            });
        });
    });
    describe('When a wrong update request payload arrives', function() {
        var optionsUpdate = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/Light1',
            method: 'PUT',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            },
            json: utils.readExampleFile(
                './test/unit/examples/deviceProvisioningRequests/updateProvisionDeviceWrong.json')
        };

        it('should raise a 400 error', function(done) {
            request(optionsUpdate, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(400);
                done();
            });
        });
    });

    describe('When a device is provisioned without attributes and new ones are added through an update', function() {
        var optionsUpdate = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/MicroLight2',
                method: 'PUT',
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': '/gardens'
                },
                json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/updateMinimumDevice.json')
            },
            optionsGetDevice = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/MicroLight2',
                method: 'GET',
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': '/gardens'
                }
            };

        beforeEach(function(done) {
            nock.cleanAll();

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/entities?options=upsert')
                .reply(204);

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/entities/SecondMicroLight/attrs?type=MicroLights', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateProvisionMinimumDevice.json'))
                .reply(204);

            async.series([
                iotAgentLib.clearAll,
                async.apply(request, provisioning3Options)
            ], done);
        });

        it('should not raise any error', function(done) {
            request(optionsUpdate, function(error, response, body) {
                should.not.exist(error);
                response.statusCode.should.equal(204);
                done();
            });
        });
        it('should provision the attributes appropriately', function(done) {
            request(optionsUpdate, function(error, response, body) {
                request(optionsGetDevice, function(error, response, body) {
                    var parsedBody;
                    should.not.exist(error);
                    response.statusCode.should.equal(200);

                    parsedBody = JSON.parse(body);

                    parsedBody.attributes.length.should.equal(1);
                    parsedBody.attributes[0].name.should.equal('newAttribute');
                    done();
                });
            });
        });
        it('should create the initial values for the attributes in the Context Broker', function(done) {
            request(optionsUpdate, function(error, response, body) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When a device is updated to add static attributes', function() {
        /* jshint camelcase: false */

        var optionsUpdate = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/MicroLight2',
                method: 'PUT',
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': '/gardens'
                },
                json: utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/updateDeviceStatic.json')
            },
            optionsGetDevice = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/MicroLight2',
                method: 'GET',
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': '/gardens'
                }
            };

        beforeEach(function(done) {
            nock.cleanAll();

            // This mock does not check the payload since the aim of the test is not to verify
            // device provisioning functionality. Appropriate verification is done in tests under
            // provisioning folder
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/entities?options=upsert')
                .reply(204);

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/entities/SecondMicroLight/attrs?type=MicroLights', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/updateProvisionDeviceStatic.json'))
                .reply(204);

            async.series([
                iotAgentLib.clearAll,
                async.apply(request, provisioning3Options)
            ], done);
        });

        it('should provision the attributes appropriately', function(done) {
            request(optionsUpdate, function(error, response, body) {
                request(optionsGetDevice, function(error, response, body) {
                    var parsedBody;
                    should.not.exist(error);
                    response.statusCode.should.equal(200);

                    parsedBody = JSON.parse(body);

                    parsedBody.static_attributes.length.should.equal(3);
                    parsedBody.static_attributes[0].name.should.equal('cellID');
                    done();
                });
            });
        });
    });
});
