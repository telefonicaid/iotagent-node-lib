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
'use strict';

var config = require('../config'),
    clUtils = require('../lib/commandLineUtils'),
    request = require('request'),
    async = require('async'),
    config = {
        host: 'localhost',
        port: 1026,
        service: 'tester',
        subservice: '/test'
    },
    separator = '\n\n\t';

function queryContext(commands) {
    var options = {
        url: 'http://' + config.host + ':' + config.port + '/v1/queryContext',
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

    request(options, function(error, response, body) {
        if (error) {
            console.error('\nConnection error querying context: ' + error);
        } else if (body && body.orionError) {
            console.error('\nApplication error querying context:\n ' + JSON.stringify(body.orionError.details, null, 4));
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
            colon = pair.indexOf(':'),
            equal = pair.indexOf('=');

        fields.push(pair.substr(0, colon));
        fields.push(pair.substr(colon + 1, equal - colon -1));
        fields.push(pair.substr(equal + 1));
        return fields;
    }

    function group(previous, current) {
        if (current && current.length === 3) {
            var attributes = {
                name: current[0],
                type: current[1],
                value: current[2]
            }

            previous.push(attributes);
        }

        return previous;
    }

    return payload.split(',').map(split).reduce(group, []);
}

function updateContext(commands) {
    var options = {
        url: 'http://' + config.host + ':' + config.port + '/v1/updateContext',
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
            updateAction: 'APPEND'
        },
        headers: {
            'fiware-service': config.service,
            'fiware-servicepath': config.subservice
        }
    };

    request(options, function(error, response, body) {
        if (error) {
            console.error('\nConnection error updating context: ' + error);
        } else if (body && body.orionError) {
            console.error('\nApplication error updating context:\n ' + JSON.stringify(body.orionError.details, null, 4));
        } else if (response && body && response.statusCode === 200) {
            console.log('\nEntity successfully updated:\n', JSON.stringify(body, null, 4));
        } else {
            console.log('\nTransport error updating context: ' + response.statusCode);
        }
        clUtils.prompt();
    });
}

function configure(commands) {
    config.host = commands[0];
    config.port = commands[1];
    config.service = commands[2];
    config.subservice = commands[3];
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

    request(options, function(error, response, body) {
        if (error) {
            console.error('\nConnection error discovering context registrations: ' + error);
        } else if (body && body.orionError) {
            console.error('\nApplication error discovering context registrations:\n ' + JSON.stringify(body.orionError.details, null, 4));
        } else if (response && body && response.statusCode === 200) {
            console.log('\nContext registration result:\n', JSON.stringify(body, null, 4));
        } else {
            console.log('\nTransport error discovering context registrations: ' + response.statusCode);
        }
        clUtils.prompt();
    });}

var commands = {
    'update': {
        parameters: ['entity', 'type', 'attributes'],
        description: '\tUpdate the values of the defined set of attributes, using the following format: ' +
            'name:type=value(,name:type=value)*',
        handler: updateContext
    },
    'query': {
        parameters: ['entity', 'type'],
        description: '\tGet all the information on the selected object.',
        handler: queryContext
    },
    'discover': {
        parameters: ['entity', 'type'],
        description: '\tGet all the context providers for a entity and type.',
        handler: discoverContext
    },
    'config': {
        parameters: ['host', 'port', 'service', 'subservice'],
        description: '\tConfig a new host and port for the remote Contect Broker.',
        handler: configure
    }
};

clUtils.initialize(commands, 'IoT Agent tester> ');