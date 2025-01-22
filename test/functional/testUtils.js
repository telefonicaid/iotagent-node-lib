/*
 * Copyright 2023 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of iotagent-json
 *
 * iotagent-json is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * iotagent-json is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with iotagent-json.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 *
 * Modified by: Miguel Angel Pedraza
 */

/* eslint-disable no-unused-vars*/
/* eslint-disable no-unused-expressions*/

const nock = require('nock');
const utils = require('../tools/utils');
const request = utils.request;
const async = require('async');
const chai = require('chai');
const MQTT = require('async-mqtt');
const iotAgentLib = require('../../lib/fiware-iotagent-lib');

var chaiMatchPattern = require('chai-match-pattern');
chai.use(chaiMatchPattern);
var _ = chaiMatchPattern.getLodashModule();
var expect = chai.expect;
chai.config.truncateThreshold = 0;

// Error messages
const ERR_CB_EXPECTATION_DIFFER = 'Assertion Error - Context Broker received payload differs from expectation';
const ERR_MEAS_BODY = 'Assertion Error - Measure response is not empty';
const ERR_MEAS_CODE = 'Assertion Error - Measure response status code differs from 200';
const ERR_MQTT = 'Error with MQTT: ';
const ERR_CB_NOT_EMPTY = 'Assertion Error - unexpected Context Broker request received (no request expected)';
const DEF_TYPE = 'TestType';
/**
 * @brief Sends a measure to the IoT Agent and returns a promise with the response
 *
 * @param {Object} measure      Measure to be sent to the IoT Agent
 */
function sendMeasureHttp(measure) {
    return new Promise((resolve, reject) => {
        request(measure, function (error, result, body) {
            error ? reject(error) : resolve(result);
        });
    });
}

/**
 * @brief Sends a measure to the IoT Agent and returns a promise with the response
 *
 * @param {Object} measure      Measure to be sent to the IoT Agent
 */
function sendMeasureIotaLib(measure, provision) {
    return new Promise((resolve, reject) => {
        /**
         *  WARNING: This is kind of a hack, only required for the tests using Lib, since the method iotAgentLib.update
         *  requires a type and does not check the type of the group. For this purpose, this function uses the
         *  provision type, setting the measure type to the same type as the provision.
         *  This is not a problem for the tests using other transports than Lib, in that case, the type will be retrieved
         *  from the real provision.
         */
        let type;
        if (Array.isArray(provision.json.services) && provision.json.services.length > 0) {
            type = provision.json.services[0].entity_type;
        } else {
            type = DEF_TYPE;
        }
        iotAgentLib.update(
            type + ':' + measure.qs.i,
            type,
            '',
            jsonToIotaMeasures(measure.json),
            function (error, result, body) {
                error ? reject(error) : resolve(result);
            }
        );
    });
}

/**
 * @brief Converts a IOTA JSON object to an array of measures as expected by the IOTA Lib
 *
 * @param {Object} json
 * @returns {Array} measures
 */
function jsonToIotaMeasures(originJson) {
    // FIXME: maybe this could be refactored to use less code
    if (originJson && originJson[0]) {
        // multimeasure case
        let finalMeasures = [];

        for (let json of originJson) {
            let measures = [];
            for (let key in json) {
                /* eslint-disable-next-line  no-prototype-builtins */
                if (json.hasOwnProperty(key)) {
                    let measure = {
                        name: key,
                        value: json[key]
                    };
                    // A bit of Magic. If the key is TimeInstant, we set the type to DateTime.
                    // When sending the data through iot
                    if (key === 'TimeInstant') {
                        measure.type = 'DateTime';
                    } else {
                        // Although the type is not meaningfull and we could have picked any string for this,
                        // we have aligned with DEFAULT_ATTRIBUTE_TYPE constant in IOTA-JSON and IOTA-UL repositories
                        measure.type = 'Text';
                    }
                    measures.push(measure);
                }
            }
            finalMeasures.push(measures);
        }
        return finalMeasures;
    } else {
        let json = originJson;

        let measures = [];
        for (let key in json) {
            /* eslint-disable-next-line  no-prototype-builtins */
            if (json.hasOwnProperty(key)) {
                let measure = {
                    name: key,
                    value: json[key]
                };
                // A bit of Magic. If the key is TimeInstant, we set the type to DateTime.
                // When sending the data through iot
                if (key === 'TimeInstant') {
                    measure.type = 'DateTime';
                } else {
                    // Although the type is not meaningfull and we could have picked any string for this,
                    // we have aligned with DEFAULT_ATTRIBUTE_TYPE constant in IOTA-JSON and IOTA-UL repositories
                    measure.type = 'Text';
                }
                measures.push(measure);
            }
        }
        return measures;
    }
}

/**
 * @brief Delays the execution of the code for the specified time in ms
 *
 * @param {Number} time in ms
 * @returns
 */
const delay = (time) => new Promise((res) => setTimeout(res, time));

function groupToIoTAConfigType(group, service, subservice) {
    let type = {};
    for (var key in group) {
        /* eslint-disable-next-line  no-prototype-builtins */
        if (group.hasOwnProperty(key)) {
            if (key === 'attributes') {
                type.active = group.attributes;
            } else if (key === 'entity_type') {
                type.type = group.entity_type;
            } else if (key === 'static_attributes') {
                type.staticAttributes = group.static_attributes;
            } else if (key === 'commands') {
                type.commands = group.commands;
            } else if (key !== 'resource') {
                type[key] = group[key];
            }
        }
    }
    type.service = service;
    type.subservice = subservice;
    return { name: group.entity_type, type: type };
}

/**
 * Test Case function
 * @brief Sends a measure to the IoT Agent and validates the response
 * and validates the Context Broker expectation
 *
 * @param {Object} measure      Measure to be sent to the IoT Agent
 * @param {Object} expectation  Expectation for the Context Broker
 * @param {Object} env          Environment variables
 * @param {Object} config       IoTA Configuration object
 * @param {String} type         Type of test (multientity or multimeasure)
 * @param {String} transport    Transport to be used (Lib, HTTP or MQTT). If not specified, Lib is used.
 * @param {Boolean} regex       If true, the expectation is treated as a regex
 */
async function testCase(measure, expectation, provision, env, config, type, transport, regex) {
    let receivedContext = [];
    let cbMockRoute = '';
    // Set the correct route depending if the test is multientity or not
    if (type === 'multientity' || type === 'multimeasure') {
        cbMockRoute = '/v2/op/update?options=flowControl';
    } else {
        cbMockRoute = '/v2/entities?options=upsert,flowControl';
    }

    // Set the correct mock times depending if the test is multimeasure or not
    // based on the length of the expectation array
    let mockTimes = 1;
    if (expectation.length > 1) {
        mockTimes = expectation.length;
    }

    let contextBrokerMock = nock('http://192.168.1.1:1026')
        .matchHeader('fiware-service', env.service)
        .matchHeader('fiware-servicepath', env.servicePath)
        .post(cbMockRoute, function (body) {
            mockTimes === 1 ? (receivedContext = body) : receivedContext.push(body); // Save the received body for later comparison
            return true;
        })
        .times(mockTimes)
        .reply(204);

    // Send a measure to the IoT Agent and wait for the response
    if (transport === 'MQTT') {
        try {
            let client = await MQTT.connectAsync('mqtt://' + config.mqtt.host);
            await client.publish('/' + measure.qs.k + '/' + measure.qs.i + '/attrs', JSON.stringify(measure.json));
            await client.end();
        } catch (error) {
            expect.fail(ERR_MQTT + error);
        }
    } else if (transport === 'HTTP') {
        // HTTP
        const response = await sendMeasureHttp(measure);
        // Validate the response status code and the response body
        expect(response.statusCode, ERR_MEAS_CODE).to.equal(200);
        expect(response.body, ERR_MEAS_BODY).to.be.empty;
    } else {
        const response = await sendMeasureIotaLib(measure, provision);
    }

    // Validate Context Broker Expectation
    if ((Array.isArray(expectation) && expectation.length > 0) || !Array.isArray(expectation)) {
        // Filter empty expectations
        regex && regex === true
            ? expect(receivedContext, ERR_CB_EXPECTATION_DIFFER).to.matchPattern(expectation)
            : expect(receivedContext, ERR_CB_EXPECTATION_DIFFER).to.deep.equal(expectation);
        contextBrokerMock.done(); // Ensure the request was made, no matter the body content
    } else {
        // If empty expectation, ensure no request was made
        expect(contextBrokerMock.isDone(), ERR_CB_NOT_EMPTY).to.be.false;
        expect(receivedContext, ERR_CB_NOT_EMPTY).to.be.empty;
    }
}

/**
 *
 * @param {*} skip skip string from test case. I.E: "lib, !json"
 * @param {*} matchPattern skip pattern to check. I.E: "lib"
 * @returns true if the test should be skipped. False otherwise
 */
function checkSkip(skip, matchPattern) {
    var isMatch = false;
    // Separate tokens by comma or space, and remove empty tokens
    var tokens = skip.split(/[ , ]+/).filter(function (value, index, arr) {
        return value !== '' && !value.match(/[* ]+/);
    });
    // Check if the skip pattern is in the tokens array, or there is a token starting with ! without the pattern (negative match -!b)
    tokens.forEach((element) => {
        if (element === matchPattern || (element[0] === '!' && element.substr(1) !== matchPattern)) {
            isMatch = true;
        }
    });
    return isMatch;
}

exports.checkSkip = checkSkip;
exports.sendMeasureHttp = sendMeasureHttp;
exports.sendMeasureIotaLib = sendMeasureIotaLib;
exports.delayMs = delay;
exports.testCase = testCase;
exports.groupToIoTAConfigType = groupToIoTAConfigType;
