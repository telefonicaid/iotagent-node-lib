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
    logger = require('fiware-node-logger'),
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
            '\tformat: "name/type" sepparated by commas.',
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
    },
    'listdevices': {
        parameters: [],
        description: '\tList all the devices that have been registered in this IoT Agent session\n',
        handler: listDevices
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


function listDevices() {
    var devices = iotAgentLib.listDevices(),
        keys = Object.keys(devices);

    for (var i = 0; i < keys.length; i++) {
        console.log('\n\n%s\n', JSON.stringify(devices[keys[i]], null, 4));
    }

    rl.prompt();
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
    ], handleError('Device registered in the Context Broker'));
}

function unregisterDevice(command) {
    console.log('Unregistering device');
    iotAgentLib.unregister(command[0], command[1], handleError('Device unregistered'));
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

function queryHandler(id, type, attributes, callback) {
    var sensorData = [
        {
            id: 'light1',
            type: 'Light',
            attributes: [
                {
                    name: 'dimming',
                    type: 'Percentage',
                    value: 19
                }
            ]
        }
    ];

    callback(null, sensorData);
}

function updateHandler(id, type, attributes, callback) {
    console.log("Update message received for device with id [%s] and type [%s]", id, type);

    callback(null);
}

function initialize() {
    logger.setLevel(config.logLevel);

    iotAgentLib.setDataQueryHandler(queryHandler);
    iotAgentLib.setDataUpdateHandler(updateHandler);

    rl.setPrompt('\033[36mIoTAgent> \033[0m');
    rl.prompt();

    rl.on('line', function (cmd) {
        executeCommander(cmd.split(' '));
    });
}

initialize();
