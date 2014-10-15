#!/usr/bin/env node

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
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 */

var readline = require('readline'),
    iotAgentLib = require('../lib/fiware-iotagent-lib'),
    config = require('../config'),
    async = require('async'),
    separator = '\n\n\t';

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var commands = {
    'start': {
        parameters: [],
        description: '\tStart the IoT Agent',
        handler: startApp
    },
    'stop': {
        parameters: [],
        description: '\tStop the IoT Agent',
        handler: stopApp
    },
    'register': {
        parameters: ['id', 'type', 'attributes'],
        description: '\tRegister a new device in the IoT Agent. The attributes should be triads with the following\n' +
            '\tformat: "name/type/value" sepparated by commas.',
        handler: registerDevice
    },
    'unregister': {
        parameters: ['id', 'type'],
        description: '\tUnregister the selected device',
        handler: unregisterDevice
    },
    'updatevalue': {
        parameters: ['deviceId', 'deviceType', 'attributes'],
        description: '\tUpdate a device value in the Context Broker. The attributes should be triads with the following\n' +
            '\tformat: "name/type/value" sepparated by commas.',
        handler: updateDeviceValue
    }
};

function handleError(message) {
    return function (error) {
        if (error) {
            console.log('\n\033[31mERROR:\033[0m %s', error);
        } else {
            console.log(message)
        }

        rl.prompt();
    };
}

function extractAttributes(attributeString, callback) {
    var attributes = attributeString.split(','),
        attributesResult = [];

    for (var i = 0; i < attributes.length; i++) {
        var fields = attributes[i].split('/'),
            attribute = {
                name: fields[0],
                type: fields[1]
            };


        if (fields[2]) {
            attribute.value = fields[2];
        }

        attributesResult.push(attribute);
    }

    callback(null, attributesResult);
}

function startApp(command) {
    iotAgentLib.activate(config, handleError('Application started'));
}

function stopApp(command) {
    iotAgentLib.activate(handleError('Application stopped'));
}

function registerDevice(command) {
    console.log('Registering device');
    async.waterfall([
        async.apply(extractAttributes, command[2]),
        async.apply(iotAgentLib.register, command[0], command[1])
    ], handleError('Device value updated'));
}

function unregisterDevice(command) {
    console.log('Unregistering device');
}

function updateDeviceValue(command) {
    async.waterfall([
        async.apply(extractAttributes, command[2]),
        async.apply(iotAgentLib.update, command[0], command[1])
    ], handleError('Device value updated'));
}

function showHelp() {
    var keyList = Object.keys(commands);

    console.log('\n');

    for (var i = 0; i < keyList.length; i++) {
        var parameters = '';

        for (var j = 0; j < commands[keyList[i]].parameters.length; j++) {
            parameters += '<' + commands[keyList[i]].parameters[j] + '> ';
        }

        console.log("%s %s \n\n%s\n", keyList[i], parameters, commands[keyList[i]].description);
    }

    rl.prompt();
}

function executeCommander(command) {
    if (command[0]=='help') {
        showHelp();
    } else if (commands[command[0]]) {
        commands[command[0]].handler(command.slice(1));
    } else if (command[0].length == 0) {
        rl.prompt();
    } else {
        console.log('Unrecognized command');
        rl.prompt();
    }
}

function queryHandler() {

}

function updateHandler(id, type, attributes, callback) {

}

function initialize() {
    iotAgentLib.setDataQueryHandler(queryHandler);
    iotAgentLib.setDataUpdateHandler(updateHandler);

    rl.setPrompt('\033[36mIoTAgent> \033[0m');
    rl.prompt();

    rl.on('line', function (cmd) {
        executeCommander(cmd.split(' '));
    });
}

initialize();
