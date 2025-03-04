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

const config = require('./config-test.js');
const nock = require('nock');
const chai = require('chai');
const expect = chai.expect;
const iotAgentLib = require('../../lib/fiware-iotagent-lib');
const testUtils = require('./testUtils');
const logger = require('logops');
chai.config.truncateThreshold = 0;

const baseTestCases = require('./testCases.js').testCases;

const env = {
    service: 'smartgondor',
    servicePath: '/gardens'
};

// You can add here your own test cases to be executed in addition to the base ones
// It is useful to test new features or to test specific scenarios. If you are going
// to add a new test case, please, add it to the testCases.js file instead of adding
// it here.
let testCases = [];

// If you want to execute only the test cases defined above, you can comment
// the following line. Otherwise, the tests defined in testCases.js will be
// executed as well.
testCases = testCases.concat(baseTestCases);

describe('FUNCTIONAL TESTS AUTO', function () {
    testCases.forEach((testCase) => {
        describe(testCase.describeName, function () {
            beforeEach(function (done) {
                if (testCase.skip && testUtils.checkSkip(testCase.skip, 'lib')) {
                    this.skip();
                }
                if (testCase.loglevel) {
                    logger.setLevel(testCase.loglevel);
                }
                let confType = testUtils.groupToIoTAConfigType(
                    testCase.provision.json.services[0],
                    testCase.provision.headers['fiware-service'],
                    testCase.provision.headers['fiware-servicepath']
                );
                // Inject device id into config as real typeInformation
                if (testCase.should[0] && testCase.should[0].measure.qs.i) {
                    confType.type['id'] = testCase.should[0].measure.qs.i;
                }
                config.iota.types[confType.name] = confType.type;

                iotAgentLib.activate(config.iota, function (error) {
                    done(error);
                });
            });

            afterEach(function (done) {
                logger.setLevel('FATAL');
                nock.cleanAll();
                iotAgentLib.clearAll(function () {
                    iotAgentLib.deactivate(function () {
                        iotAgentLib.setDataUpdateHandler();
                        iotAgentLib.setCommandHandler();
                        done();
                    });
                });
            });

            testCase.should.forEach((should) => {
                it(should.shouldName, async function () {
                    if (should.skip && testUtils.checkSkip(should.skip, 'lib')) {
                        this.skip();
                    }
                    // Skip the test if the transport is specified (IoTA Lib does not support any transport)
                    if (
                        should.transport &&
                        (should.transport === 'MQTT' || should.transport === 'AMQP' || should.transport === 'HTTP')
                    ) {
                        this.skip();
                    }

                    this.retries(2); // Retry if the test fails

                    if (should.loglevel) {
                        // You can use this line to set a breakpoint in the test in order to debug it
                        // You just need to add a loglevel element to the test case with the desired log level
                        // and then set a breakpoint in the next line. By default, the log level is FATAL and
                        // the following line will never be executed
                        logger.setLevel(should.loglevel);
                    } else {
                        await testUtils.testCase(
                            should.measure,
                            should.expectation,
                            testCase.provision,
                            env,
                            config,
                            should.type ? should.type : 'single',
                            should.transport,
                            should.isRegex ? should.isRegex : false
                        );
                    }
                });
            });
        });
    });
});
