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
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 *
 * Modified by: Federico M. Facca - Martel Innovate
 */

const request = require('../../request-shim');
const async = require('async');
const errors = require('../../errors');
const constants = require('../../constants');
const config = require('../../commonConfig');
const intoTrans = require('../common/domain').intoTrans;
const alarms = require('../common/alarmManagement');
const logger = require('logops');
const context = {
    op: 'IoTAgentNGSI.IOTAMService'
};

/**
 * Sends the registration to the IoT Agent Manager if it is configured in the config file.
 */
function register(callback) {
    function adaptServiceInformation(service) {
        return {
            apikey: service.apikey,
            token: service.trust,
            cbHost: service.cbHost,
            entity_type: service.type,
            resource: service.resource,
            service: service.service,
            service_path: service.subservice,
            attributes: service.attributes,
            static_attributes: service.staticAttributes,
            internal_attributes: service.internalAttributes,
            lazy: service.lazy,
            commands: service.commands,
            description: service.description,
            timezone: service.timezone,
            timestamp: service.timestamp,
            autoprovision: service.autoprovision,
            explicitAttrs: service.explicitAttrs,
            defaultEntityNameConjunction: service.defaultEntityNameConjunction,
            ngsiVersion: service.ngsiVersion,
            entityNameExp: service.entityNameExp,
            payloadType: service.payloadType,
            endpoint: service.endpoint,
            transport: service.transport,
            useCBflowControl: service.useCBflowControl,
            storeLastMeasure: service.storeLastMeasure
        };
    }

    function getServices(callback) {
        config.getGroupRegistry().list(null, null, null, function (error, results) {
            if (error) {
                callback(error);
            } else {
                callback(null, results.services.map(adaptServiceInformation));
            }
        });
    }

    function sendRegistration(services, callback) {
        let resource = constants.DEFAULT_RESOURCE;
        // Use an Undefined check since defaultResource override could be blank.
        if (config.getConfig().defaultResource !== undefined) {
            resource = config.getConfig().defaultResource;
        }
        const options = {
            url: config.getConfig().iotManager.url + config.getConfig().iotManager.path,
            method: 'POST',
            json: {
                protocol: config.getConfig().iotManager.protocol,
                description: config.getConfig().iotManager.description,
                iotagent: config.getConfig().providerUrl + (config.getConfig().iotManager.agentPath || ''),
                resource,
                services
            }
        };

        logger.debug(context, 'Sending registration to the IOTAM:\n%s\n\n', JSON.stringify(options, null, 4));

        request(options, callback);
    }

    function handleRegistration(result, body, callback) {
        if (result.statusCode !== 200 && result.statusCode !== 201) {
            alarms.raise(constants.IOTAM_ALARM, 'Wrong status code connecting with the IoTAM');

            logger.error(
                context,
                'IOTAM-001: Error updating information in the IOTAM. Status Code [%d]',
                result.statusCode
            );
        } else {
            alarms.release(constants.IOTAM_ALARM);
        }

        callback();
    }

    function checkConfiguration(callback) {
        const attributes = ['protocol', 'description'];
        const missing = [];

        if (!config.getConfig().providerUrl) {
            missing.push('providerUrl');
        }

        for (const i in attributes) {
            if (!config.getConfig().iotManager[attributes[i]]) {
                missing.push(attributes[i]);
            }
        }

        if (missing.length) {
            callback(new errors.MissingConfigParams(missing));
        } else {
            callback();
        }
    }

    if (config.getConfig().iotManager) {
        async.waterfall(
            [checkConfiguration, getServices, sendRegistration, handleRegistration],
            function registerHandler(error) {
                if (error) {
                    logger.error(context, 'Error connecting to IoT Manager: %j', error);

                    alarms.raise(constants.IOTAM_ALARM, 'Unknown error connecting with the IoTAM');

                    callback(error);
                } else {
                    callback();
                }
            }
        );
    } else {
        callback();
    }
}

exports.register = intoTrans(context, register);
