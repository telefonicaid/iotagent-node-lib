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

'use strict';

var iotAgentLib = require('../../../../lib/fiware-iotagent-lib'),
    utils = require('../../../tools/utils'),
    should = require('should'),
    logger = require('logops'),
    nock = require('nock'),
    request = require('request'),
    moment = require('moment'),
    contextBrokerMock,
    iotAgentConfig = {
        contextBroker: {
            host: '192.168.1.1',
            port: '1026',
            ngsiVersion: 'v2'
        },
        server: {
            port: 4041
        },
        types: {
        },
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        // As it can be seen in
        // https://github.com/telefonicaid/fiware-orion/blob/master/doc/manuals/user/walkthrough_apiv2.md#subscriptions,
        // in NGSIv2, the `expires` element of the payload to create a subscription must be specified
        // using the ISO 8601 standard format (e.g., 2016-04-05T14:00:00.00Z). However, in the IOTA,
        // this value is load from the `deviceRegistrationDuration` property of the configuration file,
        // which is expressed using ISO 8601 duration format (e.g., P1M). Therefore, in order to
        // maintain compatibility with previous versions, for NGSIv2, the expires field is calculated
        // adding the `deviceRegistrationDuration` property of the IOTA configuration file to the
        // current date. This implies that in order to assert the value of the payload in the CB mock,
        // we have to calculate dynamically the expected `expires` field.
        // Please check lines 101, 151, 210, 332 and 404.
        throttling: 'PT5S'
    };

describe('Bidirectional data plugin', function() {
    var options = {
        url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
        method: 'POST',
        json:
            utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionBidirectionalDevice.json'),
        headers: {
            'fiware-service': 'smartGondor',
            'fiware-servicepath': '/gardens'
        }
    };

    beforeEach(function(done) {
        logger.setLevel('FATAL');

        iotAgentLib.activate(iotAgentConfig, function() {
            iotAgentLib.clearAll(function() {
                iotAgentLib.addDeviceProvisionMiddleware(
                    iotAgentLib.dataPlugins.bidirectionalData.deviceProvision);
                iotAgentLib.addConfigurationProvisionMiddleware(
                    iotAgentLib.dataPlugins.bidirectionalData.groupProvision);
                iotAgentLib.addNotificationMiddleware(
                    iotAgentLib.dataPlugins.bidirectionalData.notification);
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
            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/subscriptions', function(body) {

                    var expectedBody = utils.readExampleFile(
                    './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json');
                    // Note that expired field is not included in the json used by this mock as it is a dynamic
                    // field. The following code performs such calculation and adds the field to the subscription
                    // payload of the mock.
                    if (!body.expires)
                    {
                        return false;
                    }
                    else if (moment(body.expires, 'YYYY-MM-DDTHH:mm:ss.SSSZ').isValid())
                    {
                        expectedBody.expires = moment().add(moment.duration(iotAgentConfig.deviceRegistrationDuration));
                        var expiresDiff = moment(expectedBody.expires).diff(body.expires, 'milliseconds');
                        if (expiresDiff < 500) {
                            delete expectedBody.expires;
                            delete body.expires;

                            return JSON.stringify(body) === JSON.stringify(expectedBody);
                        }

                        return false;
                    }
                    else {
                        return false;
                    }
                })
                .reply(201, null, {'Location': '/v2/subscriptions/51c0ac9ed714fb3b37d7d5a8'});

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/entities?options=upsert', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/createBidirectionalDevice.json'))
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
        var deleteRequest = {
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
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/subscriptions', function(body) {
                    var expectedBody = utils.readExampleFile(
                    './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json');
                    // Note that expired field is not included in the json used by this mock as it is a dynamic
                    // field. The following code performs such calculation and adds the field to the subscription
                    // payload of the mock.
                    if (!body.expires)
                    {
                        return false;
                    }
                    else if (moment(body.expires, 'YYYY-MM-DDTHH:mm:ss.SSSZ').isValid())
                    {
                        expectedBody.expires = moment().add(moment.duration(iotAgentConfig.deviceRegistrationDuration));
                        var expiresDiff = moment(expectedBody.expires).diff(body.expires, 'milliseconds');
                        if (expiresDiff < 500) {
                            delete expectedBody.expires;
                            delete body.expires;

                            return JSON.stringify(body) === JSON.stringify(expectedBody);
                        }

                        return false;
                    }
                    else {
                        return false;
                    }
                })
                .reply(201, null, {'Location': '/v2/subscriptions/51c0ac9ed714fb3b37d7d5a8'});

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/entities?options=upsert', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/createBidirectionalDevice.json'))
                .reply(204);

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .delete('/v2/subscriptions/51c0ac9ed714fb3b37d7d5a8')
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
        var notificationOptions = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/notify',
                method: 'POST',
                json: utils.readExampleFile('./test/unit/ngsiv2/examples/subscriptionRequests/' +
                    'bidirectionalNotification.json'),
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': '/gardens'
                }
            },
            executedHandler = false;

        beforeEach(function() {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/subscriptions', function(body) {
                    var expectedBody = utils.readExampleFile(
                    './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json');
                    // Note that expired field is not included in the json used by this mock as it is a dynamic
                    // field. The following code performs such calculation and adds the field to the subscription
                    // payload of the mock.
                    if (!body.expires)
                    {
                        return false;
                    }
                    else if (moment(body.expires, 'YYYY-MM-DDTHH:mm:ss.SSSZ').isValid())
                    {
                        expectedBody.expires = moment().add(moment.duration(iotAgentConfig.deviceRegistrationDuration));
                        var expiresDiff = moment(expectedBody.expires).diff(body.expires, 'milliseconds');
                        if (expiresDiff < 500) {
                            delete expectedBody.expires;
                            delete body.expires;

                            return JSON.stringify(body) === JSON.stringify(expectedBody);
                        }

                        return false;
                    }
                    else {
                        return false;
                    }
                })
                .reply(201, null, {'Location': '/v2/subscriptions/51c0ac9ed714fb3b37d7d5a8'});

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/entities?options=upsert', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/createBidirectionalDevice.json'))
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
            var transformedHandler = false;

            function mockedHandler(device, values, callback) {
                var latitudeFound = false,
                    longitudeFound = false;

                for (var i = 0; i < values.length; i++) {
                    if (values[i].name === 'latitude' && values[i].type === 'string' && values[i].value === '-9.6') {
                        latitudeFound = true;
                    }

                    if (values[i].name === 'longitude' && values[i].type === 'string' && values[i].value === '12.4') {
                        longitudeFound = true;
                    }
                }

                transformedHandler = (values.length >= 2 && longitudeFound && latitudeFound);
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
        var provisionGroup = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/services',
                method: 'POST',
                json:
                    utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/bidirectionalGroup.json'),
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': '/gardens'
                }
            },
            provisionDevice = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                json: utils.readExampleFile(
                    './test/unit/examples/deviceProvisioningRequests/provisionDeviceBidirectionalGroup.json'),
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': '/gardens'
                }
            };

        beforeEach(function() {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/subscriptions', function(body) {
                    var expectedBody = utils.readExampleFile(
                    './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json');
                    // Note that expired field is not included in the json used by this mock as it is a dynamic
                    // field. The following code performs such calculation and adds the field to the subscription
                    // payload of the mock.
                    if (!body.expires)
                    {
                        return false;
                    }
                    else if (moment(body.expires, 'YYYY-MM-DDTHH:mm:ss.SSSZ').isValid())
                    {
                        expectedBody.expires = moment().add(moment.duration(iotAgentConfig.deviceRegistrationDuration));
                        var expiresDiff = moment(expectedBody.expires).diff(body.expires, 'milliseconds');
                        if (expiresDiff < 500) {
                            delete expectedBody.expires;
                            delete body.expires;

                            return JSON.stringify(body) === JSON.stringify(expectedBody);
                        }

                        return false;
                    }
                    else {
                        return false;
                    }
                })
                .reply(201, null, {'Location': '/v2/subscriptions/51c0ac9ed714fb3b37d7d5a8'});

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/entities?options=upsert', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/createBidirectionalDevice.json'))
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
        var provisionGroup = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/services',
                method: 'POST',
                json:
                    utils.readExampleFile('./test/unit/examples/groupProvisioningRequests/bidirectionalGroup.json'),
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': '/gardens'
                }
            },
            notificationOptions = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/notify',
                method: 'POST',
                json: utils.readExampleFile('./test/unit/ngsiv2/examples/subscriptionRequests/' +
                    'bidirectionalNotification.json'),
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': '/gardens'
                }
            },
            provisionDevice = {
                url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
                method: 'POST',
                json: utils.readExampleFile(
                    './test/unit/examples/deviceProvisioningRequests/provisionDeviceBidirectionalGroup.json'),
                headers: {
                    'fiware-service': 'smartGondor',
                    'fiware-servicepath': '/gardens'
                }
            };

        beforeEach(function() {
            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/subscriptions', function(body) {
                    var expectedBody = utils.readExampleFile(
                    './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json');
                    // Note that expired field is not included in the json used by this mock as it is a dynamic
                    // field. The following code performs such calculation and adds the field to the subscription
                    // payload of the mock.
                    if (!body.expires)
                    {
                        return false;
                    }
                    else if (moment(body.expires, 'YYYY-MM-DDTHH:mm:ss.SSSZ').isValid())
                    {
                        expectedBody.expires = moment().add(moment.duration(iotAgentConfig.deviceRegistrationDuration));
                        var expiresDiff = moment(expectedBody.expires).diff(body.expires, 'milliseconds');
                        if (expiresDiff < 500) {
                            delete expectedBody.expires;
                            delete body.expires;

                            return JSON.stringify(body) === JSON.stringify(expectedBody);
                        }

                        return false;
                    }
                    else {
                        return false;
                    }
                })
                .reply(201, null, {'Location': '/v2/subscriptions/51c0ac9ed714fb3b37d7d5a8'});

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/entities?options=upsert', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/createBidirectionalDevice.json'))
                .reply(204);
        });

        afterEach(function() {
            iotAgentLib.setNotificationHandler();
        });

        it('should return the transformed values', function(done) {
            var transformedHandler = false;

            function mockedHandler(device, values, callback) {
                var latitudeFound = false,
                    longitudeFound = false;

                for (var i = 0; i < values.length; i++) {
                    if (values[i].name === 'latitude' && values[i].type === 'string' && values[i].value === '-9.6') {
                        latitudeFound = true;
                    }

                    if (values[i].name === 'longitude' && values[i].type === 'string' && values[i].value === '12.4') {
                        longitudeFound = true;
                    }
                }

                transformedHandler = (values.length >= 2 && longitudeFound && latitudeFound);
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

describe('Bidirectional data plugin and CB is defined using environment variables', function() {
    var options = {
        url: 'http://localhost:' + iotAgentConfig.server.port + '/iot/devices',
        method: 'POST',
        json:
            utils.readExampleFile('./test/unit/examples/deviceProvisioningRequests/provisionBidirectionalDevice.json'),
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
                iotAgentLib.addDeviceProvisionMiddleware(
                    iotAgentLib.dataPlugins.bidirectionalData.deviceProvision);
                iotAgentLib.addConfigurationProvisionMiddleware(
                    iotAgentLib.dataPlugins.bidirectionalData.groupProvision);
                iotAgentLib.addNotificationMiddleware(
                    iotAgentLib.dataPlugins.bidirectionalData.notification);
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
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/subscriptions', function(body) {

                    var expectedBody = utils.readExampleFile(
                    './test/unit/ngsiv2/examples/subscriptionRequests/bidirectionalSubscriptionRequest.json');
                    // Note that expired field is not included in the json used by this mock as it is a dynamic
                    // field. The following code performs such calculation and adds the field to the subscription
                    // payload of the mock.
                    if (!body.expires)
                    {
                        return false;
                    }
                    else if (moment(body.expires, 'YYYY-MM-DDTHH:mm:ss.SSSZ').isValid())
                    {
                        expectedBody.expires = moment().add(moment.duration(iotAgentConfig.deviceRegistrationDuration));
                        var expiresDiff = moment(expectedBody.expires).diff(body.expires, 'milliseconds');
                        if (expiresDiff < 500) {
                            delete expectedBody.expires;
                            delete body.expires;

                            return JSON.stringify(body) === JSON.stringify(expectedBody);
                        }

                        return false;
                    }
                    else {
                        return false;
                    }
                })
                .reply(201, null, {'Location': '/v2/subscriptions/51c0ac9ed714fb3b37d7d5a8'});

            contextBrokerMock
                .matchHeader('fiware-service', 'smartGondor')
                .matchHeader('fiware-servicepath', '/gardens')
                .post('/v2/entities?options=upsert', utils.readExampleFile(
                    './test/unit/ngsiv2/examples/contextRequests/createBidirectionalDevice.json'))
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
