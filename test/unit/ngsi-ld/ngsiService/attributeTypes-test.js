/*
 * Copyright 2022 Telefonica Investigación y Desarrollo, S.A.U
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
const logger = require('logops');
const nock = require('nock');
let contextBrokerMock;
const iotAgentConfig = {
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'ld',
        jsonLdContext: 'http://context.json-ld'
    },
    server: {
        port: 4041,
        host: 'localhost'
    },
    types: {
        Light: {
            commands: [],
            type: 'Light',
            active: [
                {
                    name: 'name',
                    type: 'LanguageProperty'
                },
                {
                    name: 'locatedIn',
                    type: 'Relationship'
                },
                {
                    name: 'lightValues',
                    type: 'ListProperty'
                },
                {
                    name: 'placedIn',
                    type: 'ListRelationship'
                },
                {
                    name: 'categories',
                    type: 'VocabProperty'
                },
                {
                    name: 'config',
                    type: 'JsonProperty'
                }
            ]
        }
    },
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com'
};

describe('NGSI-LD: Attribute types test', function () {
    beforeEach(function () {
        logger.setLevel('FATAL');
    });

    afterEach(function (done) {
        iotAgentLib.deactivate(done);
    });

    describe('When the IoT Agent receives new exonym from a device name with LanguageProperty type and a JSON object', function () {
        const values = [
            {
                name: 'name',
                type: 'LanguageProperty',
                value: {
                    el: 'Κωνσταντινούπολις',
                    en: 'Constantinople',
                    tr: 'İstanbul'
                }
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextLanguageProperty.json'
                    )
                )
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should change the LanguageMap of the corresponding attribute in the context broker', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives new list from a device  with ListProperty type', function () {
        const values = [
            {
                name: 'lightValues',
                type: 'ListProperty',
                value: [0, 1]
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/updateContextListProperty.json')
                )
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should change the listValue of the corresponding attribute in the context broker', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives new list from a device with ListRelationship type', function () {
        const values = [
            {
                name: 'placedIn',
                type: 'ListRelationship',
                value: ['unr:ngsi-ld:xxx', 'unr:ngsi-ld:yyyy']
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextListRelationship.json'
                    )
                )
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should change the listObject of the corresponding attribute in the context broker', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives new list from a device with JsonProperty type', function () {
        const values = [
            {
                name: 'config',
                type: 'JsonProperty',
                value: { foo: 'bar' }
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/updateContextJsonProperty.json')
                )
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should change the json of the corresponding attribute in the context broker', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives new list from a device with VocabProperty type', function () {
        const values = [
            {
                name: 'category',
                type: 'VocabProperty',
                value: 'actuator'
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile(
                        './test/unit/ngsi-ld/examples/contextRequests/updateContextVocabProperty.json'
                    )
                )
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should change the vocab of the corresponding attribute in the context broker', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });

    describe('When the IoT Agent receives new urn from a device with Relationship type', function () {
        const values = [
            {
                name: 'locatedIn',
                type: 'Relationship',
                value: 'urn:ngsi-ld:XXX'
            }
        ];

        beforeEach(function (done) {
            nock.cleanAll();

            contextBrokerMock = nock('http://192.168.1.1:1026')
                .matchHeader('fiware-service', 'smartgondor')
                .post(
                    '/ngsi-ld/v1/entityOperations/upsert/?options=update',
                    utils.readExampleFile('./test/unit/ngsi-ld/examples/contextRequests/updateContextRelationship.json')
                )
                .reply(204);

            iotAgentLib.activate(iotAgentConfig, done);
        });

        it('should change the vocab of the corresponding attribute in the context broker', function (done) {
            iotAgentLib.update('light1', 'Light', '', values, function (error) {
                should.not.exist(error);
                contextBrokerMock.done();
                done();
            });
        });
    });
});
