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

var request = require('request'),
    async = require('async'),
    errors = require('../../errors'),
    serviceRegistry;

/**
 * Sends the registration to the IoT Agent Manager if it is configured in the config file.
 *
 * @param {Object} config           Configuration object of the IoT Agent.
 */
function register(config, callback) {
    function adaptServiceInformation(service) {
        /* jshint camelcase: false */
        return {
            apikey: service.apikey,
            token: service.trust,
            entity_type: service.type,
            resource: service.resource,
            service: service.service,
            service_path: service.subservice
        };
    }

    function getServices(callback) {
        serviceRegistry.list(function(error, results) {
            if (error) {
                callback(error);
            } else {
                callback(null, results.map(adaptServiceInformation));
            }
        });
    }

    function sendRegistration(services, callback) {
        var options = {
            url: 'http://' + config.iotManager.host + ':' + config.iotManager.port + config.iotManager.path,
            method: 'POST',
            json: {
                protocol: config.iotManager.protocol,
                description: config.iotManager.description,
                iotagent: config.providerUrl,
                resource: config.iotManager.defaultResource,
                services: services
            }
        };

        request(options, callback);
    }

    function handleRegistration(result, body, callback) {
        callback();
    }

    function checkConfiguration(callback) {
        var attributes = ['protocol', 'description', 'defaultResource'],
            missing = [];

        if (!config.providerUrl) {
            missing.push('providerUrl');
        }


        for (var i in attributes) {
            if (!config.iotManager[attributes[i]]) {
                missing.push(attributes[i]);
            }
        }

        if (missing.length) {
            callback(new errors.MissingConfigParams(missing));
        } else {
            callback();
        }
    }

    if (config.iotManager) {
        async.waterfall([
            checkConfiguration,
            getServices,
            sendRegistration,
            handleRegistration
        ], callback);
    } else {
        callback();
    }
}

function init(newRegistry, callback) {
    serviceRegistry = newRegistry;

    if (callback) {
        callback();
    }
}

exports.init = init;
exports.register = register;
