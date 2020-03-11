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
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */

const errors = require('../../errors');
const logger = require('logops');
const _ = require('underscore');
const intoTrans = require('../common/domain').intoTrans;
const config = require('../../commonConfig');
const ngsiUtils = require('./../ngsi/ngsiUtils');
const context = {
    op: 'IoTAgentNGSI.Registration'
};
const async = require('async');
const utils = require('../northBound/restUtils');

const NGSI_LD_URN = 'urn:ngsi-ld:';

/**
 * Generates a handler for the registration requests that checks all the possible errors derived from the registration.
 * The parameter information is needed in order to fulfill error information.
 *
 * @param {Boolen} unregister       Indicates whether this registration is an unregistration or register.
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 * @return {Function}              The generated handler.
 */
function createRegistrationHandler(unregister, deviceData, callback) {
    return function handleRegistrationResponse(error, response, body) {
        if (error) {
            logger.error(context, 'ORION-002: Connection error sending registrations to the Context Broker: %s', error);
            callback(error);
        } else if (response && body && response.statusCode === 200) {
            const errorField = ngsiUtils.getErrorField(body);

            if (errorField) {
                logger.error(context, 'Registration error connecting to the Context Broker: %j', errorField);
                callback(new errors.BadRequest(JSON.stringify(errorField)));
            } else {
                logger.debug(context, 'Registration success.');
                callback(null, body);
            }
        } else {
            let errorObj;

            logger.error(context, 'ORION-003: Protocol error connecting to the Context Broker: %j', errorObj);

            if (unregister) {
                errorObj = new errors.UnregistrationError(deviceData.id, deviceData.type);
            } else {
                errorObj = new errors.RegistrationError(deviceData.id, deviceData.type);
            }

            callback(errorObj);
        }
    };
}

/**
 * Generates a handler for the registration requests that checks all the possible errors derived from the registration.
 * The parameter information is needed in order to fulfill error information.
 *
 * @param {Boolen} unregister       Indicates whether this registration is an unregistration or register.
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 * @return {Function}              The generated handler.
 */
function createRegistrationHandlerNgsiLD(unregister, deviceData, callback) {
    return function handleRegistrationResponse(error, response, body) {
        if (error) {
            logger.error(context, 'ORION-002: Connection error sending registrations to the Context Broker: %s', error);
            callback(error);
        } else if (response && response.statusCode === 201 && response.headers.location && unregister === false) {
            logger.debug(context, 'Registration success.');
            callback(null, {
                registrationId: response.headers.location.substr(response.headers.location.lastIndexOf('/') + 1)
            });
        } else if (response && response.statusCode === 204 && unregister === true) {
            logger.debug(context, 'Unregistration success.');
            callback(null, null);
        } else if (response && response.statusCode && response.statusCode !== 500) {
            logger.error(context, 'Registration error connecting to the Context Broker: %j', response.statusCode);
            callback(new errors.BadRequest(JSON.stringify(response.statusCode)));
        } else {
            let errorObj;

            logger.error(context, 'ORION-003: Protocol error connecting to the Context Broker: %j', errorObj);

            if (unregister) {
                errorObj = new errors.UnregistrationError(deviceData.id, deviceData.type);
            } else {
                errorObj = new errors.RegistrationError(deviceData.id, deviceData.type);
            }

            callback(errorObj);
        }
    };
}

/**
 * Generates a handler for the registration requests that checks all the possible errors derived from the registration.
 * The parameter information is needed in order to fulfill error information.
 *
 * @param {Boolen} unregister       Indicates whether this registration is an unregistration or register.
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 * @return {Function}              The generated handler.
 */
function createRegistrationHandlerNgsi2(unregister, deviceData, callback) {
    return function handleRegistrationResponse(error, response, body) {
        if (error) {
            logger.error(context, 'ORION-002: Connection error sending registrations to the Context Broker: %s', error);
            callback(error);
        } else if (response && response.statusCode === 201 && response.headers.location && unregister === false) {
            logger.debug(context, 'Registration success.');
            callback(null, {
                registrationId: response.headers.location.substr(response.headers.location.lastIndexOf('/') + 1)
            });
        } else if (response && response.statusCode === 204 && unregister === true) {
            logger.debug(context, 'Unregistration success.');
            callback(null, null);
        } else if (response && response.statusCode && response.statusCode !== 500) {
            logger.error(context, 'Registration error connecting to the Context Broker: %j', response.statusCode);
            callback(new errors.BadRequest(JSON.stringify(response.statusCode)));
        } else {
            let errorObj;

            logger.error(context, 'ORION-003: Protocol error connecting to the Context Broker: %j', errorObj);

            if (unregister) {
                errorObj = new errors.UnregistrationError(deviceData.id, deviceData.type);
            } else {
                errorObj = new errors.RegistrationError(deviceData.id, deviceData.type);
            }

            callback(errorObj);
        }
    };
}

/**
 * Sends a Context Provider registration or unregistration request to the Context Broker using NGSIv1.
 * As registrations cannot be removed, an unregistration consists of an update of the existent registration
 * to make reduce its duration to 1 second.
 *
 * The entity type, entity name and lazy attributes list are needed in order to send the registration:
 *
 * @param {Boolen} unregister       Indicates whether this registration is an unregistration or register.
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 */
function sendRegistrationsNgsi1(unregister, deviceData, callback) {
    let cbHost = config.getConfig().contextBroker.url;
    if (deviceData.cbHost && deviceData.cbHost.indexOf('://') !== -1) {
        cbHost = deviceData.cbHost;
    } else if (deviceData.cbHost && deviceData.cbHost.indexOf('://') === -1) {
        cbHost = 'http://' + deviceData.cbHost;
    }

    const options = {
        url: cbHost + '/NGSI9/registerContext',
        method: 'POST',
        json: {
            contextRegistrations: [
                {
                    entities: [
                        {
                            type: deviceData.type,
                            isPattern: 'false',
                            id: String(deviceData.name)
                        }
                    ],
                    attributes: [],
                    providingApplication: config.getConfig().providerUrl
                }
            ],
            duration: unregister ? 'PT1S' : config.getConfig().deviceRegistrationDuration
        },
        headers: {
            'fiware-service': deviceData.service,
            'fiware-servicepath': deviceData.subservice
        }
    };

    function formatAttributes(originalVector) {
        const attributeList = [];

        if (originalVector && originalVector.length) {
            for (let i = 0; i < originalVector.length; i++) {
                attributeList.push({
                    name: originalVector[i].name,
                    type: originalVector[i].type
                });
            }
        }

        return attributeList;
    }

    function mergeWithSameName(old, current) {
        const keys = _.pluck(old, 'name');

        if (keys.indexOf(current.name) < 0) {
            old.push(current);
        }

        return old;
    }

    if (deviceData.registrationId) {
        options.json.registrationId = deviceData.registrationId;
    }

    options.json.contextRegistrations[0].attributes = options.json.contextRegistrations[0].attributes
        .concat(formatAttributes(deviceData.lazy), formatAttributes(deviceData.commands))
        .reduce(mergeWithSameName, []);

    if (options.json.contextRegistrations[0].attributes.length === 0) {
        logger.debug(context, 'No Context Provider registrations found for unregister');
        callback(null, deviceData);
    } else {
        logger.debug(context, 'Sending v1 device registrations to Context Broker at [%s]', options.url);
        logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));

        utils.executeWithSecurity(options, deviceData, createRegistrationHandler(unregister, deviceData, callback));
    }
}

/**
 * Sends a Context Provider unregistration request to the Context Broker using NGSIv2.
 *
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 */
function sendUnregistrationsNgsi2(deviceData, callback) {
    let cbHost = config.getConfig().contextBroker.url;
    if (deviceData.cbHost && deviceData.cbHost.indexOf('://') !== -1) {
        cbHost = deviceData.cbHost;
    } else if (deviceData.cbHost && deviceData.cbHost.indexOf('://') === -1) {
        cbHost = 'http://' + deviceData.cbHost;
    }
    const options = {
        url: cbHost + '/v2/registrations/' + deviceData.registrationId,
        method: 'DELETE',
        json: true,
        headers: {
            'fiware-service': deviceData.service,
            'fiware-servicepath': deviceData.subservice
        }
    };
    if (deviceData.cbHost && deviceData.cbHost.indexOf('://') !== -1) {
        options.url = deviceData.cbHost + '/v2/registrations/' + deviceData.registrationId;
    } else if (deviceData.cbHost && deviceData.cbHost.indexOf('://') === -1) {
        options.url = 'http://' + deviceData.cbHost + '/v2/registrations/' + deviceData.registrationId;
    }
    if (deviceData.registrationId) {
        logger.debug(context, 'Sending v2 device unregistrations to Context Broker at [%s]', options.url);
        logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));

        return utils.executeWithSecurity(
            options,
            deviceData,
            createRegistrationHandlerNgsi2(true, deviceData, callback)
        );
    }

    logger.debug(context, 'No Context Provider registrations found for unregister');
    return callback(null, deviceData);
}

/**
 * Sends a Context Provider unregistration request to the Context Broker using NGSI-LD.
 *
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 */
function sendUnregistrationsNgsiLD(deviceData, callback) {
    let cbHost = config.getConfig().contextBroker.url;
    if (deviceData.cbHost && deviceData.cbHost.indexOf('://') !== -1) {
        cbHost = deviceData.cbHost;
    } else if (deviceData.cbHost && deviceData.cbHost.indexOf('://') === -1) {
        cbHost = 'http://' + deviceData.cbHost;
    }
    const options = {
        url: cbHost + '/ngsi-ld/v1/csourceRegistrations/' + deviceData.registrationId,
        method: 'DELETE',
        json: true,
        headers: {
            'fiware-service': deviceData.service,
            'fiware-servicepath': deviceData.subservice,
            'NGSILD-Tenant': deviceData.service,
            'NGSILD-Path': deviceData.subservice
        }
    };
    if (deviceData.cbHost && deviceData.cbHost.indexOf('://') !== -1) {
        options.url = deviceData.cbHost + '/ngsi-ld/v1/csourceRegistrations/' + deviceData.registrationId;
    } else if (deviceData.cbHost && deviceData.cbHost.indexOf('://') === -1) {
        options.url = 'http://' + deviceData.cbHost + '/ngsi-ld/v1/csourceRegistrations/' + deviceData.registrationId;
    }
    if (deviceData.registrationId) {
        logger.debug(context, 'Sending device LD unregistrations to Context Broker at [%s]', options.url);
        logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));

        return utils.executeWithSecurity(
            options,
            deviceData,
            createRegistrationHandlerNgsi2(true, deviceData, callback)
        );
    }

    logger.debug(context, 'No Context Provider registrations found for unregister');
    return callback(null, deviceData);
}

/**
 * Sends a Context Provider registration or unregistration request to the Context Broker using NGSIv2.
 *
 * @param {Boolen} unregister       Indicates whether this registration is an unregistration or register.
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 */
function sendRegistrationsNgsi2(unregister, deviceData, callback) {
    function formatAttributes(originalVector) {
        const attributeList = [];

        if (originalVector && originalVector.length) {
            for (let i = 0; i < originalVector.length; i++) {
                attributeList.push(originalVector[i].name);
            }
        }

        return attributeList;
    }

    function mergeWithSameName(old, current) {
        if (old.indexOf(current) < 0) {
            old.push(current);
        }

        return old;
    }

    // FIXME: When https://github.com/telefonicaid/fiware-orion/issues/3007 is merged into master branch,
    // this function should use the new API. This is just a temporary solution which implies deleting the
    // registration and creating a new one.
    function updateRegistrationNgsi2(deviceData, callback) {
        const functions = [];

        function removeRegistrationId(deviceData, unregistrationResult, callback) {
            delete deviceData.registrationId;
            return callback(null, deviceData);
        }

        functions.push(async.apply(sendRegistrationsNgsi2, true, deviceData));
        functions.push(async.apply(removeRegistrationId, deviceData));
        functions.push(async.apply(sendRegistrationsNgsi2, false));
        async.waterfall(functions, callback);
    }

    if (unregister) {
        return sendUnregistrationsNgsi2(deviceData, callback);
    }
    if (deviceData.registrationId) {
        return updateRegistrationNgsi2(deviceData, callback);
    }

    let cbHost = config.getConfig().contextBroker.url;
    if (deviceData.cbHost && deviceData.cbHost.indexOf('://') !== -1) {
        cbHost = deviceData.cbHost;
    } else if (deviceData.cbHost && deviceData.cbHost.indexOf('://') === -1) {
        cbHost = 'http://' + deviceData.cbHost;
    }
    const options = {
        url: cbHost + '/v2/registrations',
        method: 'POST',
        json: {
            dataProvided: {
                entities: [
                    {
                        type: deviceData.type,
                        id: String(deviceData.name)
                    }
                ],
                attrs: []
            },
            provider: {
                http: {
                    url: config.getConfig().providerUrl
                }
            }
        },
        headers: {
            'fiware-service': deviceData.service,
            'fiware-servicepath': deviceData.subservice
        }
    };

    options.json.dataProvided.attrs = options.json.dataProvided.attrs
        .concat(formatAttributes(deviceData.lazy), formatAttributes(deviceData.commands))
        .reduce(mergeWithSameName, []);

    if (options.json.dataProvided.attrs.length === 0) {
        logger.debug(
            context,
            'Registration with Context Provider is not needed.' + 'Device without lazy atts or commands'
        );
        return callback(null, deviceData);
    }

    logger.debug(context, 'Sending v2 device registrations to Context Broker at [%s]', options.url);
    logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));
    utils.executeWithSecurity(options, deviceData, createRegistrationHandlerNgsi2(unregister, deviceData, callback));
}

/**
 * Sends a Context Provider registration or unregistration request to the Context Broker using NGSI-LD.
 *
 * @param {Boolen} unregister       Indicates whether this registration is an unregistration or register.
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 */
function sendRegistrationsNgsiLD(unregister, deviceData, callback) {
    if (unregister) {
        return sendUnregistrationsNgsiLD(deviceData, callback);
    }

    const properties = [];
    const lazy = deviceData.lazy || [];
    const commands = deviceData.commands || [];

    lazy.forEach((element) => {
        properties.push(element.name);
    });
    commands.forEach((element) => {
        properties.push(element.name);
    });

    if (properties.length === 0) {
        logger.debug(
            context,
            'Registration with Context Provider is not needed.' + 'Device without lazy atts or commands'
        );
        return callback(null, deviceData);
    }

    let cbHost = config.getConfig().contextBroker.url;

    if (deviceData.cbHost && deviceData.cbHost.indexOf('://') !== -1) {
        cbHost = deviceData.cbHost;
    } else if (deviceData.cbHost && deviceData.cbHost.indexOf('://') === -1) {
        cbHost = 'http://' + deviceData.cbHost;
    }

    let id = String(deviceData.name);
    id = id.startsWith(NGSI_LD_URN) ? id : NGSI_LD_URN + deviceData.type + ':' + id;

    const options = {
        url: cbHost + '/ngsi-ld/v1/csourceRegistrations/',
        method: 'POST',
        json: {
            type: 'ContextSourceRegistration',
            information: [
                {
                    entities: [{ type: deviceData.type, id }],
                    properties
                }
            ],
            endpoint: config.getConfig().providerUrl,
            '@context': config.getConfig().contextBroker.jsonLdContext
        },
        headers: {
            'fiware-service': deviceData.service,
            'fiware-servicepath': deviceData.subservice,
            'NGSILD-Tenant': deviceData.service,
            'NGSILD-Path': deviceData.subservice,
            'Content-Type': 'application/ld+json'
        }
    };

    logger.debug(context, 'Sending LD device registrations to Context Broker at [%s]', options.url);
    logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));

    utils.executeWithSecurity(options, deviceData, createRegistrationHandlerNgsiLD(unregister, deviceData, callback));
}

/**
 * Sends a Context Provider registration or unregistration request to the Context Broker. As registrations cannot be
 * removed, an unregistration consists of an update of the existent registration to make reduce its duration to
 * 1 second.
 *
 * The entity type, entity name and lazy attributes list are needed in order to send the registration:
 *
 * @param {Boolen} unregister       Indicates whether this registration is an unregistration or register.
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 */
function sendRegistrations(unregister, deviceData, callback) {
    if (config.checkNgsiLD()) {
        sendRegistrationsNgsiLD(unregister, deviceData, callback);
    } else if (config.checkNgsi2()) {
        sendRegistrationsNgsi2(unregister, deviceData, callback);
    } else {
        sendRegistrationsNgsi1(unregister, deviceData, callback);
    }
}

/**
 * Process the response from a Register Context request for a device, extracting the 'registrationId' and creating the
 * device object that will be stored in the registry.
 *
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 *
 */
function processContextRegistration(deviceData, body, callback) {
    const newDevice = _.clone(deviceData);

    if (body) {
        newDevice.registrationId = body.registrationId;
    }

    callback(null, newDevice);
}

exports.sendRegistrations = intoTrans(context, sendRegistrations);
exports.createRegistrationHandler = intoTrans(context, createRegistrationHandler);
exports.processContextRegistration = processContextRegistration;
