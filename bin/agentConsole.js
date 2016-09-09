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
    commandUtils = require('command-shell-lib'),
    config = require('../config'),
    logger = require('logops'),
    async = require('async'),
    separator = '\n\n\t';

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
        parameters: ['id', 'type'],
        description: '\tRegister a new device in the IoT Agent. The attributes to register will be extracted from the\n' +
            '\ttype configuration',
        handler: registerDevice
    },
    'unregister': {
        parameters: ['id', 'type'],
        description: '\tUnregister the selected device',
        handler: unregisterDevice
    },
    'showConfig': {
        parameters: [],
        description: '\tShow the current configuration file',
        handler: showConfig
    },
    'config': {
        parameters: ['newConfig'],
        description: '\tChange the configuration file to a new one',
        handler: changeConfig
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
            console.log('\n\033[31mERROR:\033[0m %s', error.message);
        } else {
            console.log(message)
        }

        commandUtils.prompt();
    };
}

function listDevices() {
    iotAgentLib.listDevices(config.service, config.subservice, function (error, devices) {
        if (error) {
            console.log('\n\033[31mERROR:\033[0m %s', error.message);
        } else {
            var keys = Object.keys(devices);

            for (var i = 0; i < keys.length; i++) {
                console.log('\n\n%s\n', JSON.stringify(devices[keys[i]], null, 4));
            }

            commandUtils.prompt();
        }
    });
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

function showConfig() {
    console.log('Current configuration file:\n\n%s', JSON.stringify(config, null, 4));
}

function changeConfig(command) {
    config = require(command[0]);
}

function writeHandler(id, type, attributes, callback) {
    console.log('\n\nFake WRITE handler for update in entity [%s] with type [%s]\n%s\n',
        id, type, JSON.stringify(attributes, null, 4));

    callback(null, {
        id: id,
        type: type,
        attributes: attributes
    });
}

function readHandler(id, type, attributes, callback) {
    console.log('\n\nFake READ handler for update in entity [%s] with type [%s]\n%s\n'
        , id, type, JSON.stringify(attributes, null, 4));

    var sensorData = {
        id: id,
        isPattern: false,
        type: type,
        attributes: [
            {
                name: 'luminance',
                type: 'lumens',
                value: 19
            }
        ]
    };

    callback(null, sensorData);
}

function startApp(command) {
    iotAgentLib.setDataUpdateHandler(writeHandler);
    iotAgentLib.setCommandHandler(writeHandler);
    iotAgentLib.setDataQueryHandler(readHandler);
    iotAgentLib.activate(config, handleError('Application started'));
}

function stopApp(command) {
    iotAgentLib.deactivate(handleError('Application stopped'));
}

function exitAgent(command) {
    process.exit(0);
}

function registerDevice(command) {
    var device =  {
        id: command[0],
        type: command[1]
    };

    console.log('Registering device');
    iotAgentLib.register(device, handleError('Device registered in the Context Broker'));
}

function unregisterDevice(command) {
    console.log('Unregistering device');
    iotAgentLib.unregister(command[0], handleError('Device unregistered'));
}

function updateDeviceValue(command) {
    iotAgentLib.getDevice(command[0], function(error, device) {
        if (device) {
            extractAttributes(command[2], function(error, attributes) {
                iotAgentLib.update(device.name, device.type, '', attributes, device,
                    handleError('Device value updated'));
            });
        } else {
            async.waterfall([
                async.apply(extractAttributes, command[2]),
                async.apply(iotAgentLib.update, command[0], command[1], '')
            ], handleError('Device value updated'));
        }
    });
}

function queryHandler(id, type, attributes, callback) {
    console.log('Handling query for [%s] of type [%s]:\n%s', JSON.stringify(attributes));

    callback(null, {
        type: type,
        isPattern: false,
        id: id,
        attributes: []
    });
}

function updateHandler(id, type, attributes, callback) {
    console.log("Update message received for device with id [%s] and type [%s]", id, type);

    callback(null, {
        type: type,
        isPattern: false,
        id: id,
        attributes: []
    });
}

commandUtils.initialize(commands, 'IoTAgent> ');
