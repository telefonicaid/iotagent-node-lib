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
 * please contact with::[contacto@tid.es]
 */
'use strict';

var fs = require('fs'),
    clUtils = require('command-node'),
    request = require('request'),
    async = require('async'),
    mu = require('mu2'),
    config,
    configIot,
    token;

function queryContext(commands) {
    var options = {
        url: 'http://' + config.host + ':' + config.port + '/NGSI10/queryContext',
        method: 'POST',
        json: {
            entities: [
                {
                    type: commands[1],
                    isPattern: 'false',
                    id: commands[0]
                }
            ]
        },
        headers: {
            'fiware-service': config.service,
            'fiware-servicepath': config.subservice
        }
    };

    if (token) {
        options.headers['X-Auth-Token'] = token;
    }

    request(options, function(error, response, body) {
        if (error) {
            console.error('\nConnection error querying context: ' + error);
        } else if (body && body.orionError) {
            console.error('\nApplication error querying context:\n ' +
                JSON.stringify(body.orionError.details, null, 4));
        } else if (response && body && response.statusCode === 200) {
            console.log('\nEntity context result:\n', JSON.stringify(body, null, 4));
        } else {
            console.log('\nTransport error querying context: ' + response.statusCode);
        }
        clUtils.prompt();
    });
}

function queryContextAttribute(commands) {
    var options = {
        url: 'http://' + config.host + ':' + config.port + '/NGSI10/queryContext',
        method: 'POST',
        json: {
            entities: [
                {
                    type: commands[1],
                    isPattern: 'false',
                    id: commands[0]
                }
            ],
            attributes: commands[2].split(',')
        },
        headers: {
            'fiware-service': config.service,
            'fiware-servicepath': config.subservice
        }
    };

    if (token) {
        options.headers['X-Auth-Token'] = token;
    }

    request(options, function(error, response, body) {
        if (error) {
            console.error('\nConnection error querying context: ' + error);
        } else if (body && body.orionError) {
            console.error('\nApplication error querying context:\n ' +
                JSON.stringify(body.orionError.details, null, 4));
        } else if (response && body && response.statusCode === 200) {
            console.log('\nEntity context result:\n', JSON.stringify(body, null, 4));
        } else {
            console.log('\nTransport error querying context: ' + response.statusCode);
        }
        clUtils.prompt();
    });
}

function parseAttributes(payload) {
    function split(pair) {
        var fields = [],
            colon = pair.indexOf('#'),
            equal = pair.indexOf('=');

        fields.push(pair.substr(0, colon));
        fields.push(pair.substr(colon + 1, equal - colon - 1));
        fields.push(pair.substr(equal + 1));
        return fields;
    }

    function group(previous, current) {
        if (current && current.length === 3) {
            var attributes = {
                name: current[0],
                type: current[1],
                value: current[2]
            };

            previous.push(attributes);
        }

        return previous;
    }

    return payload.split('|').map(split).reduce(group, []);
}

function modifyContext(action) {
    return function(commands) {
        var options = {
            url: 'http://' + config.host + ':' + config.port + '/NGSI10/updateContext',
            method: 'POST',
            json: {
                contextElements: [
                    {
                        type: commands[1],
                        isPattern: 'false',
                        id: commands[0],
                        attributes: parseAttributes(commands[2])
                    }
                ],
                updateAction: action
            },
            headers: {
                'fiware-service': config.service,
                'fiware-servicepath': config.subservice
            }
        };

        if (token) {
            options.headers['X-Auth-Token'] = token;
        }

        request(options, function(error, response, body) {
            if (error) {
                console.error('\nConnection error updating context: ' + error);
            } else if (body && body.orionError) {
                console.error('\nApplication error updating context:\n ' +
                    JSON.stringify(body.orionError.details, null, 4));
            } else if (response && body && response.statusCode === 200) {
                console.log('\nEntity successfully updated:\n', JSON.stringify(body, null, 4));
            } else {
                console.log('\nTransport error updating context: ' + response.statusCode);
            }
            clUtils.prompt();
        });
    };
}

function configure(commands) {
    config.host = commands[0];
    config.port = commands[1];
    config.service = commands[2];
    config.subservice = commands[3];
}

function showConfig(commands) {
    console.log('\nCurrent configuration:\n\n');
    console.log(JSON.stringify(config, null, 4));
    console.log('\n');
    clUtils.prompt();
}

function configureIot(commands) {
    configIot.host = commands[0];
    configIot.port = commands[1];
    configIot.service = commands[2];
    configIot.subservice = commands[3];
}

function showConfigIot(commands) {
    console.log('\nCurrent configuration:\n\n');
    console.log(JSON.stringify(configIot, null, 4));
    console.log('\n');
    clUtils.prompt();
}

function discoverContext(commands) {
    var options = {
        url: 'http://' + config.host + ':' + config.port + '/v1/registry/discoverContextAvailability',
        method: 'POST',
        json: {
            entities: [
                {
                    type: commands[1],
                    isPattern: 'false',
                    id: commands[0]
                }
            ]
        },
        headers: {
            'fiware-service': config.service,
            'fiware-servicepath': config.subservice
        }
    };

    if (token) {
        options.headers['X-Auth-Token'] = token;
    }

    request(options, function(error, response, body) {
        if (error) {
            console.error('\nConnection error discovering context registrations: ' + error);
        } else if (body && body.orionError) {
            console.error('\nApplication error discovering context registrations:\n ' +
                JSON.stringify(body.orionError.details, null, 4));
        } else if (response && body && response.statusCode === 200) {
            console.log('\nContext registration result:\n', JSON.stringify(body, null, 4));
        } else {
            console.log('\nTransport error discovering context registrations: ' + response.statusCode);
        }
        clUtils.prompt();
    });}

function provisionDevice(commands) {
    function generateOptions(deviceConfig, callback) {
        var options = {
            uri: 'http://' + configIot.host + ':' + configIot.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': configIot.service,
                'fiware-servicepath': configIot.subservice
            }
        };

        if (token) {
            options.headers['X-Auth-Token'] = token;
        }

        try {
            var payload = JSON.parse(deviceConfig);
            options.json = payload;
            callback(null, options);
        } catch (e) {
            callback('Wrong JSON. Couldn\'t parse');
        }
    }

    function sendProvisionRequest(options, callback) {
        request(options, function(error, result, body) {
            if (error) {
                callback('Couldn\'t connect with the provisioning server: ' + error.toString());
            } else if ((result.statusCode === 200 || result.statusCode === 201) && body) {
                callback(null, 'Device successfully provisioned');
            } else {
                console.log('Error body: %s', JSON.stringify(body, null, 4));

                callback('Unexpected application error. Status: ' + result.statusCode);
            }
        });
    }

    function handleOut(error, msg) {
        if (error) {
            console.error(error);
        } else {
            console.log(msg);
        }
        clUtils.prompt();
    }

    fs.readFile(commands[0], 'utf8', function(error, deviceConfig) {
        if (error && error.code === 'ENOENT') {
            console.error('File not found');
            clUtils.prompt();
        } else {
            async.waterfall([
                async.apply(generateOptions, deviceConfig),
                sendProvisionRequest
            ], handleOut);
        }
    });
}

function provisionGroup(commands) {
    function createDeviceObj(rawData) {
        var deviceData = rawData.split(' ');

        return {
            deviceId: deviceData[0],
            deviceName: deviceData[1],
            deviceType: commands[2]
        };
    }

    function parseDataFile(data) {
        var lines = data.split('\n').slice(1, -1);

        return lines.map(createDeviceObj);
    }

    function createPayload(csvData, callback) {
        var dataList = parseDataFile(csvData);

        async.map(dataList, function(item, innerCallback) {
            var buffer;

            mu
                .compileAndRender(commands[0], item)
                .on('data', function(data) {
                    if (buffer) {
                        buffer += data;
                    } else {
                        buffer = data;
                    }
                })
                .on('end', function(data) {
                    innerCallback(null, JSON.parse(buffer.toString()));
                });
        }, callback);
    }

    function sendFiles(payloadList, callback) {
        var options = {
            uri: 'http://' + configIot.host + ':' + configIot.port + '/iot/devices',
            method: 'POST',
            headers: {
                'fiware-service': configIot.service,
                'fiware-servicepath': configIot.subservice
            },
            json: {
                devices: payloadList
            }
        };

        if (token) {
            options.headers['X-Auth-Token'] = token;
        }

        request(options, callback);
    }

    function processProvisioningResults(result, body, callback) {
        if (result.statusCode !== 200 && result.statusCode !== 201) {
            callback('Error sending provisioning request to the IoT Agent. StatusCode [' + result.statusCode + ']');
        } else {
            callback(null);
        }
    }

    function processResult(error, result) {
        if (error) {
            console.log('Error processing group of files [%s]. Skipping.', error);
        } else {
            console.log('Devices provisioned successfully');
        }
    }

    function getFiles(callback) {
        fs.readFile(commands[1], 'utf8', callback);
    }

    console.log('Creating group of devices of type [%s]', commands[2]);

    async.waterfall([
        getFiles,
        createPayload,
        sendFiles,
        processProvisioningResults
    ], processResult);
}

function listProvisioned(commands) {
    var options = {
        uri: 'http://' + configIot.host + ':' + configIot.port + '/iot/devices',
        method: 'GET',
        headers: {
            'fiware-service': configIot.service,
            'fiware-servicepath': configIot.subservice
        }
    };

    if (token) {
        options.headers['X-Auth-Token'] = token;
    }

    console.log('Devices provisioned in host [%s:%s]', configIot.host, configIot.port);
    console.log('----------------------------------------------------------------');

    request(options, function(error, result, body) {
        if (error) {
            console.log('Couldn\'t connect with the provisioning server: ' + error.toString());
        } else if (result.statusCode === 200 && body) {
            var parsedBody = JSON.parse(body);
            console.log(JSON.stringify(parsedBody, null, 4));
        } else {
            console.log('Unexpected application error. Status: ' + result.statusCode);
        }
        clUtils.prompt();
    });
}

function removeProvisioned(commands) {
    var options = {
        uri: 'http://' + configIot.host + ':' + configIot.port + '/iot/devices/' + commands[0],
        method: 'DELETE',
        headers: {
            'fiware-service': configIot.service,
            'fiware-servicepath': configIot.subservice
        }
    };

    if (token) {
        options.headers['X-Auth-Token'] = token;
    }

    console.log('Removing device [%s] [%s:%s]', commands[0], configIot.host, configIot.port);
    console.log('----------------------------------------------------------------');

    request(options, function(error, result, body) {
        if (error) {
            console.log('Couldn\'t connect with the provisioning server: ' + error.toString());
        } else if (result.statusCode === 200 && body) {
            console.log('Device [%s] removed successfully', commands[0]);
        } else {
            console.log('Unexpected application error. Status: ' + result.statusCode);
        }
        clUtils.prompt();
    });
}

function addGroup(commands) {
    console.log('Adding device groups to host [%s:%s] from file [%s]', configIot.host, configIot.port, commands[0]);

    function generateOptions(deviceConfig, callback) {
        var options = {
            uri: 'http://' + configIot.host + ':' + configIot.port + '/iot/services',
            method: 'POST',
            headers: {
                'fiware-service': configIot.service,
                'fiware-servicepath': configIot.subservice
            }
        };

        if (token) {
            options.headers['X-Auth-Token'] = token;
        }

        try {
            var payload = JSON.parse(deviceConfig);
            options.json = payload;
            callback(null, options);
        } catch (e) {
            callback('Wrong JSON. Couldn\'t parse');
        }
    }

    function sendProvisionRequest(options, callback) {
        request(options, function(error, result, body) {
            if (error) {
                callback('Couldn\'t connect with the provisioning server: ' + error.toString());
            } else if (result.statusCode === 200 && body) {
                callback(null, 'Device group successfully provisioned');
            } else {
                console.log('Error body: %s', JSON.stringify(body, null, 4));
                callback('Unexpected application error. Status: ' + result.statusCode);
            }
        });
    }

    function handleOut(error, msg) {
        if (error) {
            console.error(error);
        } else {
            console.log(msg);
        }
        clUtils.prompt();
    }

    fs.readFile(commands[0], 'utf8', function(error, deviceConfig) {
        if (error && error.code === 'ENOENT') {
            console.error('File not found');
            clUtils.prompt();
        } else {
            async.waterfall([
                async.apply(generateOptions, deviceConfig),
                sendProvisionRequest
            ], handleOut);
        }
    });
}

function removeGroup(commands) {
    var options = {
        uri: 'http://' + configIot.host + ':' + configIot.port + '/iot/services',
        method: 'DELETE',
        headers: {
            'fiware-service': configIot.service,
            'fiware-servicepath': configIot.subservice
        }
    };

    if (token) {
        options.headers['X-Auth-Token'] = token;
    }

    console.log('Removing device group for subservice [%s] from [%s:%s]',
        configIot.subservice, configIot.host, configIot.port);

    console.log('----------------------------------------------------------------');

    request(options, function(error, result, body) {
        if (error) {
            console.log('Couldn\'t connect with the provisioning server: ' + error.toString());
        } else if (result.statusCode === 200) {
            console.log('Device group for subservice [%s] removed successfully', configIot.subservice);
        } else {
            console.log('Unexpected application error. Status: ' + result.statusCode);
        }
        clUtils.prompt();
    });
}

function listGroups(commands) {
    console.log('Devices groups provisioned in host [%s:%s]', configIot.host, configIot.port);
    console.log('----------------------------------------------------------------');
    var options = {
        uri: 'http://' + configIot.host + ':' + configIot.port + '/iot/services',
        method: 'GET',
        headers: {
            'fiware-service': configIot.service,
            'fiware-servicepath': configIot.subservice
        }
    };

    if (token) {
        options.headers['X-Auth-Token'] = token;
    }

    request(options, function(error, result, body) {
        if (error) {
            console.log('Error requesting groups list.\n');
        } else if (result) {
            console.log(JSON.stringify(result.headers));
            if (error) {
                console.log('Couldn\'t connect with the provisioning server: ' + error.toString());
            } else if (result.statusCode === 200 && body) {
                var parsedBody = JSON.parse(body);
                console.log(JSON.stringify(parsedBody, null, 4));
            } else {
                console.log('Unexpected application error. Status: ' + result.statusCode);
            }
        } else {
            console.log('No result was returned while listing groups.\n');
        }
        clUtils.prompt();
    });
}

function authenticate(command) {
    var options = {
        uri: 'http://' + command[0] + ':' + command[1] + '/v3/auth/tokens',
        method: 'POST',
        headers: {

        },
        json: {
            auth: {
                identity: {
                    methods: [
                        'password'
                    ],
                    password: {
                        user: {
                            domain: {
                                name: command[4]
                            },
                            name: command[2],
                            password: command[3]
                        }
                    }
                }
            }
        }
    };

    console.log('Authenticating to host [%s:%s] with user [%s] in service [%s]',
        command[0], command[1], command[2], command[4]);

    console.log('----------------------------------------------------------------');

    console.log(JSON.stringify(options, null, 4));

    request(options, function(error, result, body) {
        if (error) {
            console.log('Error sending authentication request: %s', error);
        } else if (result.statusCode === 201) {
            console.log('Authentication successful');
            console.log('The new token is: [%s]', result.headers['x-subject-token']);
            token = result.headers['x-subject-token'];
        } else {
            console.log('Unexpected return code during authentication: %s.', result.statusCode);
        }

        clUtils.prompt();
    });
}

function exitAgent(command) {
    process.exit(0);
}

var commands = {
    'update': {
        parameters: ['entity', 'type', 'attributes'],
        description: '\tUpdate the values of the defined set of attributes, using the following format: ' +
        'name#type=value(|name#type=value)*',
        handler: modifyContext('UPDATE')
    },
    'append': {
        parameters: ['entity', 'type', 'attributes'],
        description: '\tAppend a new Entity with the defined set of attributes, using the following format: ' +
        'name:type=value(,name:type=value)*',
        handler: modifyContext('APPEND')
    },
    'query': {
        parameters: ['entity', 'type'],
        description: '\tGet all the information on the selected object.',
        handler: queryContext
    },
    'queryAttr': {
        parameters: ['entity', 'type', 'attributes'],
        description: '\tGet information on the selected object for the selected attributes.',
        handler: queryContextAttribute
    },
    'discover': {
        parameters: ['entity', 'type'],
        description: '\tGet all the context providers for a entity and type.',
        handler: discoverContext
    },
    'configCb': {
        parameters: ['host', 'port', 'service', 'subservice'],
        description: '\tConfig a new host and port for the remote Context Broker.',
        handler: configure
    },
    'showConfigCb': {
        parameters: [],
        description: '\tShow the current configuration of the client for the Context Broker.',
        handler: showConfig
    },
    'configIot': {
        parameters: ['host', 'port', 'service', 'subservice'],
        description: '\tConfig a new host and port for the remote IoT Agent.',
        handler: configureIot
    },
    'showConfigIot': {
        parameters: [],
        description: '\tShow the current configuration of the client for the IoT Agent.',
        handler: showConfigIot
    },
    'provision': {
        parameters: ['filename'],
        description: '\tProvision a new device using the Device Provisioning API. The device configuration is \n' +
        '\tread from the file specified in the "filename" parameter.',
        handler: provisionDevice
    },
    'provisionGroup': {
        parameters: ['template', 'data', 'type'],
        description: '\tProvision a group of devices with the selected template, taking the information needed to\n' +
        '\tfill the template from a CSV with two columns, DEVICE_ID and DEVICE_NAME. The third parameter, type\n' +
        '\twill be used to replace the DEVICE_TYPE field in the template. All the devices will be provisioned\n' +
        '\tto the same IoT Agent, once the templates have been fulfilled.',
        handler: provisionGroup
    },
    'listProvisioned': {
        parameters: [],
        description: '\tList all the provisioned devices in an IoT Agent.',
        handler: listProvisioned
    },
    'removeProvisioned': {
        parameters: ['deviceId'],
        description: '\tRemove the selected provisioned device from the IoT Agent, specified by its Device ID.',
        handler: removeProvisioned
    },
    'addGroup': {
        parameters: ['filename'],
        description: '\tAdd a new device group to the specified IoT Agent through the Configuration API. The \n' +
        '\tbody is taken from the file specified in the "filename" parameter.',
        handler: addGroup
    },
    'listGroups': {
        parameters: [],
        description: '\tList all the device groups created in the selected IoT Agent for the configured service',
        handler: listGroups
    },
    'removeGroup': {
        parameters: [],
        description: '\tRemove the device group corresponding to the current configured subservice.',
        handler: removeGroup
    },
    'authenticate': {
        parameters: ['host', 'port', 'user', 'password', 'service'],
        description: '\tAuthenticates to the given authentication server, and use the token in subsequent requests.',
        handler: authenticate
    },
    'exit': {
        parameters: [],
        description: '\tExit the process\n',
        handler: exitAgent
    }
};

function init(cbCfg, iotCfg) {
    config = cbCfg;
    configIot = iotCfg;
}

exports.init = init;
exports.commands = commands;
