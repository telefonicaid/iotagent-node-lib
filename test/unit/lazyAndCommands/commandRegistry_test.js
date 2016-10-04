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
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 */
'use strict';

var iotAgentLib = require('../../../lib/fiware-iotagent-lib'),
    async = require('async'),
    should = require('should'),
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
        mongodb: {
            host: 'localhost',
            port: '27017',
            db: 'iotagent'
        },
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M',
        throttling: 'PT5S',
        pollingExpiration: 800,
        pollingDaemonFrequency: 20
    };

function testRegistry(registryType) {
    describe('Command registries test [' + registryType + ']', function() {
        var commandTemplate = {
            name: 'commandName',
            type: 'commandType',
            value: 'commandValue'
        };

        beforeEach(function(done) {
            iotAgentConfig.deviceRegistry.type = registryType;
            iotAgentLib.activate(iotAgentConfig, done);
        });

        afterEach(function(done) {
            iotAgentLib.clearAll(function() {
                iotAgentLib.deactivate(done);
            });
        });

        describe('When a new command is created in the command registry', function() {
            it('should not cause any error', function(done) {
                iotAgentLib.addCommand('smartGondor', 'gardens', 'devId', commandTemplate, function(error) {
                    should.not.exist(error);
                    done();
                });
            });

            it('should appear in the listings', function(done) {
                iotAgentLib.addCommand('smartGondor', 'gardens', 'devId', commandTemplate, function(error) {
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

        describe('When a new command has expired from the registry', function() {
            it('should not appear in the listings', function(done) {
                iotAgentLib.addCommand('smartGondor', 'gardens', 'devId', commandTemplate, function(error) {
                    setTimeout(function() {
                        iotAgentLib.commandQueue('smartGondor', 'gardens', 'devId', function(error, commandList) {
                            commandList.count.should.equal(0);
                            done();
                        });
                    }, 850);
                });
            });
        });

        describe('When an already existing command arrives to the registry', function() {
            var updatedCommand = {
                name: 'commandName',
                type: 'commandType',
                value: 'newValueForTheCommand'
            };

            beforeEach(function(done) {
                iotAgentLib.addCommand('smartGondor', 'gardens', 'devId', commandTemplate, done);
            });

            it('should not give any error', function(done) {
                iotAgentLib.addCommand('smartGondor', 'gardens', 'devId', updatedCommand, function(error) {
                    should.not.exist(error);
                    done();
                });
            });

            it('should override the old value, and change the expiration time', function(done) {
                iotAgentLib.addCommand('smartGondor', 'gardens', 'devId', updatedCommand, function(error) {
                    iotAgentLib.commandQueue('smartGondor', 'gardens', 'devId', function(error, list) {
                        list.count.should.equal(1);
                        list.commands[0].value.should.equal('newValueForTheCommand');
                        done();
                    });
                });
            });
        });

        describe('When a command listing is requested for a device', function() {
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

                async.series(commands, function(error) {
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
            beforeEach(function(done) {
                var commands = [];

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
                            'devId',
                            newCommand
                        )
                    );
                }

                async.series(commands, function(error) {
                    done();
                });
            });

            it('should not appear in the listings', function(done) {
                iotAgentLib.removeCommand('smartGondor', 'gardens', 'devId', 'commandName2', function(error) {
                    iotAgentLib.commandQueue('smartGondor', 'gardens', 'devId', function(error, commandList) {
                        commandList.commands.length.should.equal(4);

                        for (var i = 0; i < commandList.commands.length; i++) {
                            commandList.commands[i].name.should.not.equal('commandName2');
                        }

                        done();
                    });
                });
            });
        });
    });
}

testRegistry('memory');
testRegistry('mongodb');
