#!/usr/bin/env node

var readline = require('readline'),
    iotAgentLib = require('../lib/fiware-iotagent-lib'),
    config = require('../config'),
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
            '\tformat: (name type id) sepparated by commas.',
        handler: registerDevice
    },
    'unregister': {
        parameters: ['id', 'type'],
        description: '\tUnregister the selected device',
        handler: unregisterDevice
    },
    'updatevalue': {
        parameters: [],
        description: '\tUpdate a device value in the Context Broker',
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

function startApp() {
    iotAgentLib.activate(config, handleError('Application started'));
}

function stopApp() {
    iotAgentLib.activate(handleError('Application stopped'));
}

function registerDevice() {
    console.log('Registering device');
}

function unregisterDevice() {
    console.log('Unregistering device');
}

function updateDeviceValue() {
    console.log('Updating device value');
}

function initialize() {

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
        commands[command[0]].handler();
    } else if (command[0].length == 0) {
        rl.prompt();
    } else {
        console.log('Unrecognized command');
        rl.prompt();
    }
}

rl.setPrompt('\033[36mIoTAgent> \033[0m');
rl.prompt();

rl.on('line', function (cmd) {
    executeCommander(cmd.split(' '));
});


