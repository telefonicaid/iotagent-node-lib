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

/* eslint-disable no-unused-vars */

const iotAgentLib = require('../../../../lib/fiware-iotagent-lib');
const utils = require('../../../tools/utils');
const request = utils.request;
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
    types: {},
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com'
};

describe('NGSI-v2 - Bidirectional data plugin', function () {
    const options = {
        url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
        method: 'POST',
        json: utils.readExampleFile(
            './test/unit/examples/deviceProvisioningRequests/provisionBidirectionalDevice.json'
        ),
        headers: {
            'fiware-service': 'smartgondor',
            'fiware-servicepath': '/gardens'
        }
    };

    beforeEach(function (done) {
        logger.setLevel('FATAL');

        iotAgentLib.activate(iotAgentConfig, function () {
            iotAgentLib.clearAll(function () {
                iotAgentLib.addDeviceProvisionMiddleware(iotAgentLib.dataPlugins.bidirectionalData.deviceProvision);
                iotAgentLib.addConfigurationProvisionMiddleware(
                    iotAgentLib.dataPlugins.bidirectionalData.groupProvision
                );
                iotAgentLib.addNotificationMiddleware(iotAgentLib.dataPlugins.bidirectionalData.notification);
                done();
            });
        });
    });

    afterEach(function (done) {
        iotAgentLib.clearAll(function () {
            iotAgentLib.deactivate(done);
        });
    });

    describe('When a new provisioning request arrives to the IoTA with bidirectionality', function () {
        beforeEach(function () {
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post(
                    '/v2/subscriptions',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json'
                    )
                )
                .reply(201, null, { Location: '/v2/subscriptions/51c0ac9ed714fb3b37d7d5a8' });
        });

        it('should subscribe to the modification of the combined attribute with all the variables', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When a device with bidirectionality subscriptions is removed', function () {
        const deleteRequest = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices/Light1',
            method: 'DELETE',
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function () {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post(
                    '/v2/subscriptions',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json'
                    )
                )
                .reply(201, null, { Location: '/v2/subscriptions/51c0ac9ed714fb3b37d7d5a8' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .delete('/v2/subscriptions/51c0ac9ed714fb3b37d7d5a8', '')
                .reply(204);
        });

        it('should remove its subscriptions from the Context Broker', function (done) {
            request(options, function (error, response, body) {
                request(deleteRequest, function (error, response, body) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        });
    });

    describe('When a notification arrives for a bidirectional attribute', function () {
        const notificationOptions = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/notify',
            method: 'POST',
            json: utils.readExampleFile(
                './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalNotification.json'
            ),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };
        let executedHandler = false;

        beforeEach(function () {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post(
                    '/v2/subscriptions',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json'
                    )
                )
                .reply(201, null, { Location: '/v2/subscriptions/51c0ac9ed714fb3b37d7d5a8' });
        });

        afterEach(function () {
            iotAgentLib.setNotificationHandler();
        });

        it('should execute the original handler', function (done) {
            function mockedHandler(device, notification, callback) {
                executedHandler = true;
                callback();
            }

            iotAgentLib.setNotificationHandler(mockedHandler);

            request(options, function (error, response, body) {
                request(notificationOptions, function (error, response, body) {
                    executedHandler.should.equal(true);
                    contextBrokerMock.done();
                    done();
                });
            });
        });

        it('should return a 200 OK', function (done) {
            function mockedHandler(device, notification, callback) {
                executedHandler = true;
                callback();
            }

            iotAgentLib.setNotificationHandler(mockedHandler);

            request(options, function (error, response, body) {
                request(notificationOptions, function (error, response, body) {
                    response.statusCode.should.equal(200);
                    contextBrokerMock.done();
                    done();
                });
            });
        });

        it('should return the transformed values', function (done) {
            let transformedHandler = false;

            function mockedHandler(device, values, callback) {
                let latitudeFound = false;
                let longitudeFound = false;

                for (let i = 0; i < values.length; i++) {
                    if (values[i].name === 'latitude' && values[i].type === 'Number' && values[i].value === -9.6) {
                        latitudeFound = true;
                    }

                    if (values[i].name === 'longitude' && values[i].type === 'Number' && values[i].value === 12.4) {
                        longitudeFound = true;
                    }
                }

                transformedHandler = values.length >= 2 && longitudeFound && latitudeFound;
                callback();
            }

            iotAgentLib.setNotificationHandler(mockedHandler);

            request(options, function (error, response, body) {
                request(notificationOptions, function (error, response, body) {
                    contextBrokerMock.done();
                    transformedHandler.should.equal(true);
                    done();
                });
            });
        });
    });
    //FIXME: this test will be removed if at the end /iot/services API (now Deprecated) is removed
    describe('When a notification with metadata arrives for a bidirectional attribute', function () {
        const notificationOptions = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/notify',
            method: 'POST',
            json: utils.readExampleFile(
                './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalNotificationWithMetadata.json'
            ),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };
        let executedHandler = false;

        beforeEach(function () {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post(
                    '/v2/subscriptions',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json'
                    )
                )
                .reply(201, null, { Location: '/v2/subscriptions/51c0ac9ed714fb3b37d7d5a8' });
        });

        afterEach(function () {
            iotAgentLib.setNotificationHandler();
        });

        it('should execute the original handler', function (done) {
            function mockedHandler(device, notification, callback) {
                notification[0].name.should.equal('location');
                notification[0].value.should.equal('12.4, -9.6');
                notification[0].metadata.qos.value.should.equal(1);

                executedHandler = true;
                callback();
            }

            iotAgentLib.setNotificationHandler(mockedHandler);

            request(options, function (error, response, body) {
                request(notificationOptions, function (error, response, body) {
                    executedHandler.should.equal(true);
                    contextBrokerMock.done();
                    done();
                });
            });
        });

        it('should return a 200 OK', function (done) {
            function mockedHandler(device, notification, callback) {
                executedHandler = true;
                callback();
            }

            iotAgentLib.setNotificationHandler(mockedHandler);

            request(options, function (error, response, body) {
                request(notificationOptions, function (error, response, body) {
                    response.statusCode.should.equal(200);
                    contextBrokerMock.done();
                    done();
                });
            });
        });

        it('should return the transformed values', function (done) {
            let transformedHandler = false;

            function mockedHandler(device, values, callback) {
                let latitudeFound = false;
                let longitudeFound = false;

                for (let i = 0; i < values.length; i++) {
                    if (values[i].name === 'latitude' && values[i].type === 'Number' && values[i].value === -9.6) {
                        latitudeFound = true;
                    }

                    if (values[i].name === 'longitude' && values[i].type === 'Number' && values[i].value === 12.4) {
                        longitudeFound = true;
                    }
                }

                transformedHandler = values.length >= 2 && longitudeFound && latitudeFound;
                callback();
            }

            iotAgentLib.setNotificationHandler(mockedHandler);

            request(options, function (error, response, body) {
                request(notificationOptions, function (error, response, body) {
                    contextBrokerMock.done();
                    transformedHandler.should.equal(true);
                    done();
                });
            });
        });
    });
    //FIXME: this test will be removed if at the end /iot/services API (now Deprecated) is removed

    describe('When a new Group provisioning request arrives with bidirectional attributes', function () {
        const provisionGroup = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/services',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/bidirectionalGroup.json'),
            headers: {
                'fiware-service': 'smartgondor',
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
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function () {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post(
                    '/v2/subscriptions',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json'
                    )
                )
                .reply(201, null, { Location: '/v2/subscriptions/51c0ac9ed714fb3b37d7d5a8' });
        });
        it('should subscribe to the modification of the combined attribute with all the variables', function (done) {
            request(provisionGroup, function (error, response, body) {
                request(provisionDevice, function (error, response, body) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        });
    });

    describe('When a new configGroup provisioning request arrives with bidirectional attributes', function () {
        const provisionGroup = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/configGroups',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/bidirectionalConfigGroup.json'),
            headers: {
                'fiware-service': 'smartgondor',
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
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function () {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post(
                    '/v2/subscriptions',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json'
                    )
                )
                .reply(201, null, { Location: '/v2/subscriptions/51c0ac9ed714fb3b37d7d5a8' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post(
                    '/v2/entities?options=upsert',
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextRequests/createBidirectionalDevice.json')
                )
                .reply(204);
        });
        it('should subscribe to the modification of the combined attribute with all the variables', function (done) {
            request(provisionGroup, function (error, response, body) {
                request(provisionDevice, function (error, response, body) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        });
    });

    //FIXME: this test will be removed if at the end /iot/services API (now Deprecated) is removed
    describe('When a notification arrives for a bidirectional attribute in a Configuration Group', function () {
        const provisionGroup = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/services',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/bidirectionalGroup.json'),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };
        const notificationOptions = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/notify',
            method: 'POST',
            json: utils.readExampleFile(
                './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalNotification.json'
            ),
            headers: {
                'fiware-service': 'smartgondor',
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
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function () {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post(
                    '/v2/subscriptions',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json'
                    )
                )
                .reply(201, null, { Location: '/v2/subscriptions/51c0ac9ed714fb3b37d7d5a8' });
        });

        afterEach(function () {
            iotAgentLib.setNotificationHandler();
        });

        it('should return the transformed values', function (done) {
            let transformedHandler = false;

            function mockedHandler(device, values, callback) {
                let latitudeFound = false;
                let longitudeFound = false;

                for (let i = 0; i < values.length; i++) {
                    if (values[i].name === 'latitude' && values[i].type === 'Number' && values[i].value === -9.6) {
                        latitudeFound = true;
                    }

                    if (values[i].name === 'longitude' && values[i].type === 'Number' && values[i].value === 12.4) {
                        longitudeFound = true;
                    }
                }

                transformedHandler = values.length >= 2 && longitudeFound && latitudeFound;
                callback();
            }

            iotAgentLib.setNotificationHandler(mockedHandler);

            request(provisionGroup, function (error, response, body) {
                request(provisionDevice, function (error, response, body) {
                    request(notificationOptions, function (error, response, body) {
                        transformedHandler.should.equal(true);
                        done();
                    });
                });
            });
        });
    });
    describe('When a notification arrives for a bidirectional attribute in a Configuration Group', function () {
        const provisionGroup = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/configGroups',
            method: 'POST',
            json: utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/bidirectionalConfigGroup.json'),
            headers: {
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };
        const notificationOptions = {
            url: 'http://localhost:' + iotAgentConfig.server.port + '/notify',
            method: 'POST',
            json: utils.readExampleFile(
                './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalNotification.json'
            ),
            headers: {
                'fiware-service': 'smartgondor',
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
                'fiware-service': 'smartgondor',
                'fiware-servicepath': '/gardens'
            }
        };

        beforeEach(function () {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post(
                    '/v2/subscriptions',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json'
                    )
                )
                .reply(201, null, { Location: '/v2/subscriptions/51c0ac9ed714fb3b37d7d5a8' });

            contextBrokerMock
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post(
                    '/v2/entities?options=upsert',
                    utils.readExampleFile('./test/unit/ngsiv2/examples/contextRequests/createBidirectionalDevice.json')
                )
                .reply(204);
        });

        afterEach(function () {
            iotAgentLib.setNotificationHandler();
        });

        it('should return the transformed values', function (done) {
            let transformedHandler = false;

            function mockedHandler(device, values, callback) {
                let latitudeFound = false;
                let longitudeFound = false;

                for (let i = 0; i < values.length; i++) {
                    if (values[i].name === 'latitude' && values[i].type === 'Number' && values[i].value === -9.6) {
                        latitudeFound = true;
                    }

                    if (values[i].name === 'longitude' && values[i].type === 'Number' && values[i].value === 12.4) {
                        longitudeFound = true;
                    }
                }

                transformedHandler = values.length >= 2 && longitudeFound && latitudeFound;
                callback();
            }

            iotAgentLib.setNotificationHandler(mockedHandler);

            request(provisionGroup, function (error, response, body) {
                request(provisionDevice, function (error, response, body) {
                    request(notificationOptions, function (error, response, body) {
                        transformedHandler.should.equal(true);
                        done();
                    });
                });
            });
        });
    });
});

describe('NGSI-v2 - Bidirectional data plugin and CB is defined using environment variables', function () {
    const options = {
        url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
        method: 'POST',
        json: utils.readExampleFile(
            './test/unit/examples/deviceProvisioningRequests/provisionBidirectionalDevice.json'
        ),
        headers: {
            'fiware-service': 'smartgondor',
            'fiware-servicepath': '/gardens'
        }
    };

    beforeEach(function (done) {
        logger.setLevel('FATAL');
        process.env.IOTA_CB_HOST = 'cbhost';
        iotAgentLib.activate(iotAgentConfig, function () {
            iotAgentLib.clearAll(function () {
                iotAgentLib.addDeviceProvisionMiddleware(iotAgentLib.dataPlugins.bidirectionalData.deviceProvision);
                iotAgentLib.addConfigurationProvisionMiddleware(
                    iotAgentLib.dataPlugins.bidirectionalData.groupProvision
                );
                iotAgentLib.addNotificationMiddleware(iotAgentLib.dataPlugins.bidirectionalData.notification);
                done();
            });
        });
    });

    afterEach(function (done) {
        process.env.IOTA_CB_HOST = '';
        iotAgentLib.clearAll(function () {
            iotAgentLib.deactivate(done);
        });
    });

    describe('When a new provisioning request arrives to the IoTA with bidirectionality', function () {
        beforeEach(function () {
            contextBrokerMock = nock('http://cbhost:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post(
                    '/v2/subscriptions',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json'
                    )
                )
                .reply(201, null, { Location: '/v2/subscriptions/51c0ac9ed714fb3b37d7d5a8' });
        });

        it('should subscribe to the modification of the combined attribute with all the variables', function (done) {
            request(options, function (error, response, body) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});
