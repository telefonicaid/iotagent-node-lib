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
       ngsiVersion: 'v2'
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
                   name: 'location',
                   type: 'geo:json'
               }
           ]
       }
   },
   service: 'smartGondor',
   subservice: 'gardens',
   providerUrl: 'http://smartGondor.com'
};

// No autoCast
const iotAgentConfig2 = {
   autocast: true,
   contextBroker: {
       host: '192.168.1.1',
       port: '1026',
       ngsiVersion: 'v2'
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
                   name: 'location',
                   type: 'geo:json'
               }
           ]
       }
   },
   service: 'smartGondor',
   subservice: 'gardens',
   providerUrl: 'http://smartGondor.com'
};

describe('NGSI-v2 - Geo-JSON types autocast test', function () {
    beforeEach(function () {
        logger.setLevel('FATAL');
    });

    afterEach(function (done) {
        iotAgentLib.deactivate(done);
    });

    describe(
        'When the IoT Agent receives new geo-information from a device.' +
            'Location with geo:json type and String value',
        function () {
            const values = [
                {
                    name: 'location',
                    type: 'geo:json',
                    value: '23,12.5'
                }
            ];

            beforeEach(function (done) {
                nock.cleanAll();

                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartGondor')
                    .patch(
                        '/v2/entities/light1/attrs',
                        utils.readExampleFile(
                            './test/unit/ngsiv2/examples/contextRequests/updateContextGeoproperties1.json'
                        )
                    )
                    .query({ type: 'Light' })
                    .reply(204);

                iotAgentLib.activate(iotAgentConfig, done);
            });

            it('should change the value of the corresponding attribute as a GeoJSON Point in the context broker', function (done) {
                iotAgentLib.update('light1', 'Light', '', values, function (error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        }
    );


    describe(
        'When the IoT Agent receives new geo-information from a device.' +
            'Location with Point type and String value and Point is not autocast',
        function () {
            const values = [
                {
                    name: 'location',
                    type: 'Point',
                    value: '23,12.5'
                }
            ];

            beforeEach(function (done) {
                nock.cleanAll();

                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartGondor')
                    .patch(
                        '/v2/entities/light1/attrs',
                        utils.readExampleFile(
                            './test/unit/ngsiv2/examples/contextRequests/updateContextGeopropertiesAsString.json'
                        )
                    )
                    .query({ type: 'Light' })
                    .reply(204);

                iotAgentLib.activate(iotAgentConfig2, done);
            });

            it('should change the value of the corresponding attribute as a String in the context broker', function (done) {
                iotAgentLib.update('light1', 'Light', '', values, function (error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        }
    );

    describe(
        'When the IoT Agent receives new geo-information from a device.' +
            'Location with geo:json type and GeoJSON object value',
        function () {
            const values = [
                {
                    name: 'location',
                    type: 'geo:json',
                    value: {
                        type: 'Point',
                        coordinates: [23, 12.5]
                    }
                }
            ];

            beforeEach(function (done) {
                nock.cleanAll();

                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartGondor')
                    .patch(
                        '/v2/entities/light1/attrs',
                        utils.readExampleFile(
                            './test/unit/ngsiv2/examples/contextRequests/updateContextGeoproperties1.json'
                        )
                    )
                    .query({ type: 'Light' })
                    .reply(204);
                iotAgentConfig.types.Light.active[0].autocast = true;
                iotAgentLib.activate(iotAgentConfig, done);
            });

            it('should change the value of the corresponding attribute as a GeoJSON Point in the context broker', function (done) {
                iotAgentLib.update('light1', 'Light', '', values, function (error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        }
    );

    describe('When the IoT Agent receives new geo-information from a device. Location with Point type and Array value', function () {
        const values = [
            {
                name: 'location',
                type: 'Point',
                value: [23, 12.5]
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .patch(
                    '/v2/entities/light1/attrs',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextGeoproperties1.json'
                    )
                )
                .query({ type: 'Light' })
                .reply(204);
            iotAgentConfig.types.Light.active[0].autocast = true;
            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should change the value of the corresponding attribute as a GeoJSON Point in the context broker', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe(
        'When the IoT Agent receives new geo-information from a device.' +
            'Location with LineString type and Array value',
        function () {
            const values = [
                {
                    name: 'location',
                    type: 'LineString',
                    value: [
                        [23, 12.5],
                        [22, 12.5]
                    ]
                }
            ];

            beforeEach(function (done) {
                nock.cleanAll();

                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartGondor')
                    .patch(
                        '/v2/entities/light1/attrs',
                        utils.readExampleFile(
                            './test/unit/ngsiv2/examples/contextRequests/updateContextGeoproperties2.json'
                        )
                    )
                    .query({ type: 'Light' })
                    .reply(204);

                iotAgentConfig.types.Light.active[0].autocast = true;
                iotAgentLib.activate(iotAgentConfig, done);
            });

            it('should change the value of the corresponding attribute as a GeoJSON LineString in the context broker', function (done) {
                iotAgentLib.update('light1', 'Light', '', values, function (error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        }
    );

    describe(
        'When the IoT Agent receives new geo-information from a device.' +
            'Location with LineString type and Array of Strings',
        function () {
            const values = [
                {
                    name: 'location',
                    type: 'LineString',
                    value: ['23,12.5', '22,12.5']
                }
            ];

            beforeEach(function (done) {
                nock.cleanAll();

                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartGondor')
                    .patch(
                        '/v2/entities/light1/attrs',
                        utils.readExampleFile(
                            './test/unit/ngsiv2/examples/contextRequests/updateContextGeoproperties2.json'
                        )
                    )
                    .query({ type: 'Light' })
                    .reply(204);

                iotAgentConfig.types.Light.active[0].autocast = 'LineString';
                iotAgentLib.activate(iotAgentConfig, done);
            });

            it('should change the value of the corresponding attribute as a GeoJSON LineString in the context broker', function (done) {
                iotAgentLib.update('light1', 'Light', '', values, function (error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        }
    );

    describe('When the IoT Agent receives new geo-information from a device. Location with None type', function () {
        const values = [
            {
                name: 'location',
                type: 'None',
                value: 'null'
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartGondor')
                .patch(
                    '/v2/entities/light1/attrs',
                    utils.readExampleFile(
                        './test/unit/ngsiv2/examples/contextRequests/updateContextGeoproperties3.json'
                    )
                )
                .query({ type: 'Light' })
                .reply(204);
            iotAgentConfig.types.Light.active[0].autocast = true;
            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should change the value of the corresponding attribute as a None type in the context broker', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe(
        'When the IoT Agent receives new geo-information from a device.' +
            'Location with Polygon type - Array of coordinates',
        function () {
            const values = [
                {
                    name: 'location',
                    type: 'Polygon',
                    value: [
                        [23, 12.5],
                        [22, 13.5],
                        [22, 13.5]
                    ]
                }
            ];

            beforeEach(function (done) {
                nock.cleanAll();

                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartGondor')
                    .patch(
                        '/v2/entities/light1/attrs',
                        utils.readExampleFile(
                            './test/unit/ngsiv2/examples/contextRequests/updateContextGeoproperties4.json'
                        )
                    )
                    .query({ type: 'Light' })
                    .reply(204);

                iotAgentConfig.types.Light.active[0].autocast = true;
                iotAgentLib.activate(iotAgentConfig, done);
            });

            it('should change the value of the corresponding attribute as a GeoJSON Polygon in the context broker', function (done) {
                iotAgentLib.update('light1', 'Light', '', values, function (error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        }
    );

    describe(
        'When the IoT Agent receives new geo-information from a device.' +
            'Location with Polygon type - list of coordinates',
        function () {
            const values = [
                {
                    name: 'location',
                    type: 'Polygon',
                    value: '23,12.5,22,13.5,22,13.5'
                }
            ];

            beforeEach(function (done) {
                nock.cleanAll();

                contextBrokerMock = nock('http://192.168.1.1:1026')
                    .matchHeader('fiware-service', 'smartGondor')
                    .patch(
                        '/v2/entities/light1/attrs',
                        utils.readExampleFile(
                            './test/unit/ngsiv2/examples/contextRequests/updateContextGeoproperties4.json'
                        )
                    )
                    .query({ type: 'Light' })
                    .reply(204);
            iotAgentConfig.types.Light.active[0].autocast = true;
                iotAgentConfig.types.Light.active[0].autocast = true;
                iotAgentLib.activate(iotAgentConfig, done);
            });

            it('should change the value of the corresponding attribute as a GeoJSON Polygon in the context broker', function (done) {
                iotAgentLib.update('light1', 'Light', '', values, function (error) {
                    should.not.exist(error);
                    contextBrokerMock.done();
                    done();
                });
            });
        }
    );

    describe('When the IoT Agent receives new geo-information from a device. Location with a missing latitude', function () {
        const values = [
            {
                name: 'location',
                type: 'Point',
                value: '23,12.5,22,13.5,22'
            }
        ];

        beforeEach(function (done) {
            iotAgentConfig.types.Light.active[0].autocast = true;
            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should throw a BadGeocoordinates Error', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.exist(error);
                done();
            });
        });
    });

    describe('When the IoT Agent receives new geo-information from a device. Location invalid coordinates', function () {
        const values = [
            {
                name: 'location',
                type: 'Point',
                value: '2016-04-30Z'
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();
            iotAgentConfig.types.Light.active[0].autocast = true;
            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should throw a BadGeocoordinates Error', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.exist(error);
                done();
            });
        });
    });
});
