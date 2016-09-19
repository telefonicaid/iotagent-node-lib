/*
 * Copyright 2015 Telefonica Investigación y Desarrollo, S.A.U
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
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 */
'use strict';

var iotAgentLib = require('../../../lib/fiware-iotagent-lib'),
    async = require('async'),
    should = require('should'),
    nock = require('nock'),
    utils = require('../../tools/utils'),
    iotAgentConfig = {
        logLevel: 'FATAL',
        contextBroker: {
            host: '192.168.1.1',
            port: '1026'
        },
        server: {
            name: 'testAgent',
            port: 4041,
            baseRoot: '/'
        },
        types: {},
        deviceRegistry: {
            type: 'memory'
        },
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S'
    },
    contextBrokerMock;

describe.only('In memory command registry', function() {
    beforeEach(function(done) {
        iotAgentLib.activate(iotAgentConfig, done);
    });

    afterEach(function(done) {
        iotAgentLib.clearAll(function() {
            iotAgentLib.deactivate(done);
        });
    });

    describe('When a new command is created in the command registry', function() {
        var command = {
            name: 'commandName',
            type: 'commandType',
            value: 'commandValue'
        };

        it('should not cause any error', function(done) {
            iotAgentLib.addCommand('smartGondor', 'gardens', 'devId', command, function(error) {
                should.not.exist(error);
                done();
            });
        });

        it('should appear in the listings', function(done) {
            iotAgentLib.addCommand('smartGondor', 'gardens', 'devId', command, function(error) {
                iotAgentLib.commandQueue('smartGondor', 'gardens', 'devId', function(error, commandList) {
                    commandList.count.should.equal(1);
                    commandList.commands[0].name.should.equal('commandName');
                    commandList.commands[0].type.should.equal('commandType');
                    commandList.commands[0].value.should.equal('commandValue');
                    done();
                });
            });
        });
    });

    describe('When an already existing command arrives to the registry', function() {
        it('should override the old value, and change the expiration time');
    });

    describe('When a command listing is requested for a device', function() {
        var commandTemplate = {
            name: 'commandName',
            type: 'commandType',
            value: 'commandValue'
        };

        beforeEach(function(done) {
            var commands = [];

            for (var i = 0; i < 3; i++) {
                for (var j = 0; j < 5; j++) {
                    var newCommand = {
                        name: commandTemplate.name + j,
                        type: commandTemplate.type + j,
                        value: commandTemplate.value + j
                    };

                    commands.push(
                        async.apply(
                            iotAgentLib.addCommand,
                            'smartGondor',
                            'gardens',
                            'devId' + i,
                            newCommand
                        )
                    );
                }
            }

            async.series(commands, function (error) {
                done();
            });
        });

        it('should not return any command for other devices', function(done) {
            iotAgentLib.commandQueue('smartGondor', 'gardens', 'devId1', function(error, commandList) {
                commandList.count.should.equal(5);

                for (var i = 0; i < 5; i++) {
                    commandList.commands[i].deviceId.should.equal('devId1');
                }

                done();
            });
        });

        it('should return all the fields for each command', function(done) {
            iotAgentLib.commandQueue('smartGondor', 'gardens', 'devId1', function(error, commandList) {
                commandList.count.should.equal(5);

                for (var i = 0; i < 5; i++) {
                    commandList.commands[i].name.should.equal('commandName' + i);
                    commandList.commands[i].type.should.equal('commandType' + i);
                    commandList.commands[i].value.should.equal('commandValue' + i);
                    commandList.commands[i].service.should.equal('smartGondor');
                    commandList.commands[i].subservice.should.equal('gardens');

                    should.exist(commandList.commands[i].creationDate);
                }

                done();
            });
        });
    });

    describe('When a command is removed from the queue', function() {
        it('should not appear in the listings');
    });

    describe('When a command has expired', function() {
        it('should not appear in the listings');
    });

    describe('When a command is updated', function() {
        it('should appear updated in the command list');
    });
});