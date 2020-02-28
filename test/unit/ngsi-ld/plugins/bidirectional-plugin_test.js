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
 * please contact with::daniel.moranjimenez@telefonica.com
 *
 * Modified by: Jason Fox - FIWARE Foundation
 */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const utils = require('../../../tools/utils');
const should = require('should');
const logger = require('logops');
const nock = require('nock');
const request = require('request');
let contextBrokerMock;
const iotAgentConfig = {
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'ld',
        jsonLdContext: 'http://context.json-ld'
    },
    server: {
        port: 4041
    },
    types: {},
    service: 'smartGondor',
    subservice: 'gardens',
    providerUrl: 'http://smartGondor.com'
};

describe('NGSI-LD - Bidirectional data plugin', function() {
    const options = {
        url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
        method: 'POST',
        json: utils.readExampleFile(
            './test/unit/examples/deviceProvisioningRequests/provisionBidirectionalDevice.json'
        ),
        headers: {
            'fiware-service': 'smartGondor',
            'fiware-servicepath': '/gardens'
        }
    };

    beforeEach(function(done) {
        iotAgentLib.activate(iotAgentConfig, function() {
            iotAgentLib.clearAll(function() {
                iotAgentLib.addDeviceProvisionMiddleware(iotAgentLib.dataPlugins.bidirectionalData.deviceProvision);
                iotAgentLib.addConfigurationProvisionMiddleware(
                    iotAgentLib.dataPlugins.bidirectionalData.groupProvision
                );
                iotAgentLib.addNotificationMiddleware(iotAgentLib.dataPlugins.bidirectionalData.notification);
                done();
            });
        });
    });

    afterEach(function(done) {
        iotAgentLib.clearAll(function() {
            iotAgentLib.deactivate(done);
        });
    });

    describe('When a new provisioning request arrives to the IoTA with bidirectionality', function() {
        beforeEach(function() {
            logger.setLevel('FATAL');

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/subscriptions/',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json'
                    )
                )
                .reply(201, null, { Location: '/ngsi-ld/v1/subscriptions/51c0ac9ed714fb3b37d7d5a8' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/createBidirectionalDevice.json')
                )
                .reply(204);
        });

        it('should subscribe to the modification of the combined attribute with all the variables', function(done) {
            request(options, function(error, response, body) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When a device with bidirectionality subscriptions is removed', function() {
        const deleteRequest = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/Light1',
            method: 'DELETE',
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function() {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/subscriptions/',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json'
                    )
                )
                .reply(201, null, { Location: '/ngsi-ld/v1/subscriptions/51c0ac9ed714fb3b37d7d5a8' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/createBidirectionalDevice.json')
                )
                .reply(204);

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .delete('/ngsi-ld/v1/subscriptions/51c0ac9ed714fb3b37d7d5a8')
                .reply(204);
        });

        it('should remove its subscriptions from the Context Broker', function(done) {
            request(options, function(error, response, body) {
                request(deleteRequest, function(error, response, body) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        });
    });

    describe('When a notification arrives for a bidirectional attribute', function() {
        const notificationOptions = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/notify',
            method: 'POST',
            json: utils.readExampleFile(
                './test/unit/ngsi-ld/examples/subscriptionRequests/' + 'bidirectionalNotification.json'
            ),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };
        let executedHandler = false;

        beforeEach(function() {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/subscriptions/',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json'
                    )
                )
                .reply(201, null, { Location: '/ngsi-ld/v1/subscriptions/51c0ac9ed714fb3b37d7d5a8' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/createBidirectionalDevice.json')
                )
                .reply(204);
        });

        afterEach(function() {
            iotAgentLib.setNotificationHandler();
        });

        it('should execute the original handler', function(done) {
            function mockedHandler(device, notification, callback) {
                executedHandler = true;
                callback();
            }

            iotAgentLib.setNotificationHandler(mockedHandler);

            request(options, function(error, response, body) {
                request(notificationOptions, function(error, response, body) {
                    executedHandler.should.equal(true);
                    contextBrokerMock.done();
                    done();
                });
            });
        });

        it('should return a 200 OK', function(done) {
            function mockedHandler(device, notification, callback) {
                executedHandler = true;
                callback();
            }

            iotAgentLib.setNotificationHandler(mockedHandler);

            request(options, function(error, response, body) {
                request(notificationOptions, function(error, response, body) {
                    response.statusCode.should.equal(200);
                    contextBrokerMock.done();
                    done();
                });
            });
        });

        it('should return the transformed values', function(done) {
            let transformedHandler = false;

            function mockedHandler(device, values, callback) {
                let latitudeFound = false;
                let longitudeFound = false;

                for (let i = 0; i < values.length; i++) {
                    if (values[i].name === 'latitude' && values[i].type === 'string' && values[i].value === '-9.6') {
                        latitudeFound = true;
                    }

                    if (values[i].name === 'longitude' && values[i].type === 'string' && values[i].value === '12.4') {
                        longitudeFound = true;
                    }
                }

                transformedHandler = values.length >= 2 && longitudeFound && latitudeFound;
                callback();
            }

            iotAgentLib.setNotificationHandler(mockedHandler);

            request(options, function(error, response, body) {
                request(notificationOptions, function(error, response, body) {
                    contextBrokerMock.done();
                    transformedHandler.should.equal(true);
                    done();
                });
            });
        });
    });

    describe('When a new Group provisioning request arrives with bidirectional attributes', function() {
        const provisionGroup = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/services',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/bidirectionalGroup.json'),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };
        const provisionDevice = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile(
                './test/unit/examples/deviceProvisioningRequests/provisionDeviceBidirectionalGroup.json'
            ),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function() {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/subscriptions/',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json'
                    )
                )
                .reply(201, null, { Location: '/ngsi-ld/v1/subscriptions/51c0ac9ed714fb3b37d7d5a8' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/createBidirectionalDevice.json')
                )
                .reply(204);
        });
        it('should subscribe to the modification of the combined attribute with all the variables', function(done) {
            request(provisionGroup, function(error, response, body) {
                request(provisionDevice, function(error, response, body) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        });
    });

    describe('When a notification arrives for a bidirectional attribute in a Configuration Group', function() {
        const provisionGroup = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/services',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/bidirectionalGroup.json'),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };
        const notificationOptions = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/notify',
            method: 'POST',
            json: utils.readExampleFile(
                './test/unit/ngsi-ld/examples/subscriptionRequests/' + 'bidirectionalNotification.json'
            ),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };
        const provisionDevice = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
            method: 'POST',
            json: utils.readExampleFile(
                './test/unit/examples/deviceProvisioningRequests/provisionDeviceBidirectionalGroup.json'
            ),
            headers: {
                'fiware-service': 'smartGondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function() {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/subscriptions/',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json'
                    )
                )
                .reply(201, null, { Location: '/ngsi-ld/v1/subscriptions/51c0ac9ed714fb3b37d7d5a8' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/createBidirectionalDevice.json')
                )
                .reply(204);
        });

        afterEach(function() {
            iotAgentLib.setNotificationHandler();
        });

        it('should return the transformed values', function(done) {
            let transformedHandler = false;

            function mockedHandler(device, values, callback) {
                let latitudeFound = false;
                let longitudeFound = false;

                for (let i = 0; i < values.length; i++) {
                    if (values[i].name === 'latitude' && values[i].type === 'string' && values[i].value === '-9.6') {
                        latitudeFound = true;
                    }

                    if (values[i].name === 'longitude' && values[i].type === 'string' && values[i].value === '12.4') {
                        longitudeFound = true;
                    }
                }

                transformedHandler = values.length >= 2 && longitudeFound && latitudeFound;
                callback();
            }

            iotAgentLib.setNotificationHandler(mockedHandler);

            request(provisionGroup, function(error, response, body) {
                request(provisionDevice, function(error, response, body) {
                    request(notificationOptions, function(error, response, body) {
                        transformedHandler.should.equal(true);
                        done();
                    });
                });
            });
        });
    });
});

describe('NGSI-LD - Bidirectional data plugin and CB is defined using environment variables', function() {
    const options = {
        url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
        method: 'POST',
        json: utils.readExampleFile(
            './test/unit/examples/deviceProvisioningRequests/provisionBidirectionalDevice.json'
        ),
        headers: {
            'fiware-service': 'smartGondor',
            'fiware-servicepath': '/gardens'
        }
    };

    beforeEach(function(done) {
        logger.setLevel('FATAL');
        process.env.IOTA_CB_HOST = 'cbhost';
        iotAgentLib.activate(iotAgentConfig, function() {
            iotAgentLib.clearAll(function() {
                iotAgentLib.addDeviceProvisionMiddleware(iotAgentLib.dataPlugins.bidirectionalData.deviceProvision);
                iotAgentLib.addConfigurationProvisionMiddleware(
                    iotAgentLib.dataPlugins.bidirectionalData.groupProvision
                );
                iotAgentLib.addNotificationMiddleware(iotAgentLib.dataPlugins.bidirectionalData.notification);
                done();
            });
        });
    });

    afterEach(function(done) {
        process.env.IOTA_CB_HOST = '';
        iotAgentLib.clearAll(function() {
            iotAgentLib.deactivate(done);
        });
    });

    describe('When a new provisioning request arrives to the IoTA with bidirectionality', function() {
        beforeEach(function() {
            contextBrokerMock = nock('http://cbhost:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/subscriptions/',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json'
                    )
                )
                .reply(201, null, { Location: '/ngsi-ld/v1/subscriptions/51c0ac9ed714fb3b37d7d5a8' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/createBidirectionalDevice.json')
                )
                .reply(204);
        });

        it('should subscribe to the modification of the combined attribute with all the variables', function(done) {
            request(options, function(error, response, body) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});
