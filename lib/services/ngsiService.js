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
 * please contact with::daniel.moranjimenez@telefonica.com
 */

'use strict';

var request = require('request'),
    async = require('async'),
    apply = async.apply,
    errors = require('../errors'),
    logger = require('fiware-node-logger'),
    security = require('./securityService'),
    _ = require('underscore'),
    context = {
        op: 'IoTAgentNGSI.NGSIService'
    },
    registry,
    groupRegistry,
    config;


/**
 * Given a NGSI Body, determines whether it contains any NGSI error.
 *
 * @param {String} body             String representing a NGSI body in JSON format.
 * @return {Number|*}
 */
function getErrorField(body) {
    var errorField = body.errorCode ||
        body.orionError;

    if (body && body.contextResponses &&
        body.contextResponses[0] && body.contextResponses[0] &&
        body.contextResponses[0].statusCode && body.contextResponses[0].statusCode.code !== '200') {
        errorField = body.contextResponses[0].statusCode.reasonPhrase +
        ': ' + body.contextResponses[0].statusCode.details;
    }

    return errorField;
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
    var options = {
        url: 'http://' + config.contextBroker.host + ':' + config.contextBroker.port + '/NGSI9/registerContext',
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
                    providingApplication: config.providerUrl
                }
            ],
            duration: (unregister) ? 'PT1S' : config.deviceRegistrationDuration
        },
        headers: {
            'fiware-service': deviceData.service,
            'fiware-servicepath': deviceData.subservice
        }
    };

    if (deviceData.registrationId) {
        options.json.registrationId = deviceData.registrationId;
    }

    for (var i = 0; i < deviceData.lazy.length; i++) {
        options.json.contextRegistrations[0].attributes.push({
            name: deviceData.lazy[i].name,
            type: deviceData.lazy[i].type,
            isDomain: 'false'
        });
    }

    logger.debug(context, 'Sending device registrations to Context Broker at [%s]', options.url);
    logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));

    request(options, function(error, response, body) {
        if (error) {
            logger.error(context, 'Connection error sending registrations to the Context Broker: %s', error);
            callback(error);
        } else if (response && body && response.statusCode === 200) {
            var errorField = getErrorField(body);

            if (errorField) {
                logger.error(context, 'Registration error connecting to the Context Broker: %j', errorField);
                callback(new errors.BadRequest(JSON.stringify(errorField)));
            } else {
                logger.debug(context, 'Registration success.');
                callback(null, body);
            }
        } else {
            var errorObj;

            logger.error(context, 'Protocol error connecting to the Context Broker: %j', errorObj);

            if (unregister) {
                errorObj = new errors.UnregistrationError(deviceData.id, deviceData.type);
            } else {
                errorObj = new errors.RegistrationError(deviceData.id, deviceData.type);
            }

            callback(errorObj);
        }
    });
}

/**
 * Process the response from a Register Context request for a device, extracting the 'registrationId' and creating the
 * device object that will be stored in the registry.
 *
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 *
 */
function processContextRegistration(deviceData, body, callback) {
    var newDevice = _.clone(deviceData);

    newDevice.registrationId = body.registrationId;

    callback(null, newDevice);
}

/**
 * Register a new device identified by the Id and Type in the Context Broker, and the internal registry.
 *
 * The device id and type are required fields for any registration. The rest of the parameters are optional, but, if
 * they are not present in the function call arguments, the type must be registered in the configuration, so the
 * service can infer their default values from the configured type. If an optional attribute is not given in the
 * parameter list and there isn't a default configuration for the given type, a TypeNotFound error is raised.
 *
 * When an optional parameter is not included in the call, a null value must be given in its place.
 *
 * @param {Object} deviceObj                    Object with all the device information (mandatory).
 */
function registerDevice(deviceObj, callback) {
    var deviceData = _.clone(deviceObj),
        fields = ['service', 'subservice', 'lazy', 'internalAttributes', 'active', 'staticAttributes', 'commands'],
        defaults = [null, null, [], [], [], []];

    logger.debug(context, 'Registering device into NGSI Service:\n%s', JSON.stringify(deviceData, null, 4));

    if (!deviceData.name) {
        logger.debug(context, 'Device name not found, falling back to device id [%s]', deviceData.id);
        deviceData.name = deviceData.id;
    }

    if (!deviceData.type) {
        deviceData.type = config.defaultType;
    }

    for (var i = 0; i < fields.length; i++) {
        if (config.types[deviceData.type] && config.types[deviceObj.type][fields[i]]) {
            deviceData[fields[i]] =
                (deviceData[fields[i]]) ? deviceData[fields[i]] : config.types[deviceObj.type][fields[i]];
        } else {
            deviceData[fields[i]] = (deviceData[fields[i]]) ? deviceData[fields[i]] : defaults[i];
        }
    }

    if (!deviceData.service && config.service) {
        deviceData.service = config.service;
    }

    if (!deviceData.subservice && config.subservice) {
        deviceData.subservice = config.subservice;
    }

    async.waterfall([
        async.apply(sendRegistrations, false, deviceData),
        async.apply(processContextRegistration, deviceData),
        registry.store
    ], callback);
}

/**
 * Makes an update in the Device's entity in the context broker, with the values given in the 'attributes' array. This
 * array should comply to the NGSI's attribute format.
 *
 * @param {String} deviceId         Device ID of the device to register.
 * @param {Array} attributes        Attribute array containing the values to update.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
function sendUpdateValue(deviceId, attributes, typeInformation, token, callback) {
    var cbHost = 'http://' + config.contextBroker.host + ':' + config.contextBroker.port,
        options,
        headers = {
            'fiware-service': config.service,
            'fiware-servicepath': config.subservice,
            'X-Auth-Token': token
        };

    if (typeInformation) {
        if (typeInformation.service) {
            headers['fiware-service'] = typeInformation.service;
        }

        if (typeInformation.subservice) {
            headers['fiware-servicepath'] = typeInformation.subservice;
        }

        if (typeInformation.cbHost) {
            cbHost = typeInformation.cbHost;
        }

        if (typeInformation.staticAttributes) {
            attributes = attributes.concat(typeInformation.staticAttributes);
        }
    }

    if (!typeInformation || !typeInformation.type) {
        callback(new errors.TypeNotFound(null, deviceId));
        return;
    }

    options = {
        url: cbHost + '/v1/updateContext',
        method: 'POST',
        json: {
            contextElements: [
                {
                    type: typeInformation.type,
                    isPattern: 'false',
                    id: deviceId,
                    attributes: attributes
                }
            ],
            updateAction: 'APPEND'
        },
        headers: headers
    };

    logger.debug(context, 'Updating device value in the Context Broker at [%s]', options.url);
    logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));

    request(options, function(error, response, body) {
        if (error) {
            logger.debug(context, 'Error found updating value in Context Broker: %s', error);
            callback(error);
        } else if (body.orionError) {
            logger.debug(context, 'Orion error found updating value in Context Broker: %j', body.orionError);
            callback(new errors.BadRequest(body.orionError.details));
        } else if (response && body && response.statusCode === 200) {
            var errorField = getErrorField(body);

            if (errorField) {
                logger.error(context, 'Update value error connecting to the Context Broker: %j', errorField);
                callback(new errors.BadRequest(JSON.stringify(errorField)));
            } else {
                logger.debug(context, 'Value updated successfully');
                callback(null, body);
            }
        } else if (response && response.statusCode === 403) {
            logger.debug(context, 'Access forbidden updating value');
            callback(new errors.AccessForbidden(
                token,
                options.headers['fiware-service'],
                options.headers['fiware-servicepath']));
        } else {
            logger.debug(context, 'Unknown error updating value');
            callback(new errors.EntityUpdateError(deviceId, typeInformation.type));
        }
    });
}

/**
 * Launches the updating process, getting the security token in case the authorization sequence is enabled. This method
 * can be invoked with an externally added deviceInformation object to overwrite the information on the configuration
 * (for preregistered devices).
 *
 * @param {String} deviceId             Device ID of the device to register.
 * @param {String} resource             Resource name of the endpoint the device is calling.
 * @param {String} apikey               Apikey the device is using to send the values.
 * @param {Array} attributes            Attribute array containing the values to update.
 * @param {Object} deviceInformation    Device information object (containing security and service information).
 */
function updateValue(deviceId, resource, apikey, attributes, deviceInformation, callback) {
    groupRegistry.get(resource, apikey, function(error, deviceGroup) {
        var typeInformation;

        if (!callback) {
            callback = deviceInformation;

            if (deviceGroup) {
                typeInformation = deviceGroup;
            } else {
                typeInformation = config.types[resource];
            }
        } else {
            typeInformation = deviceInformation;
        }

        if (config.authentication && config.authentication.enabled) {
            if (typeInformation && typeInformation.trust) {
                async.waterfall([
                    apply(security.getToken, typeInformation.trust),
                    apply(sendUpdateValue, deviceId, attributes, typeInformation)
                ], callback);
            } else {
                callback(new errors.SecurityInformationMissing(typeInformation.type));
            }
        } else {
            sendUpdateValue(deviceId, attributes, typeInformation, null, callback);
        }
    });
}

/**
 * Unregister a device from the Context broker and the internal registry.
 *
 * @param {String} id           Device ID of the device to register.
 */
function unregisterDevice(id, callback) {
    function processContextUnregister(body, innerCallback) {
        innerCallback(null);
    }

    logger.debug(context, 'Updating device register in NGSI Service');

    async.waterfall([
        async.apply(registry.get, id),
        async.apply(sendRegistrations, true),
        processContextUnregister,
        async.apply(registry.remove, id)
    ], function(error) {
        callback(error);
    });
}

/**
 * Updates the register of an existing device identified by the Id and Type in the Context Broker, and the internal
 * registry.
 *
 * The device id and type are required fields for a registration updated. Only the following attributes will be
 * updated: lazy, active and internalId. Any other change will be ignored. The registration for the active attributes
 * of the updated entity will be updated if existing, and created if not.
 *
 * @param {Object} deviceObj                    Object with all the device information (mandatory).
 */
function updateRegisterDevice(deviceObj, callback) {
    if (!deviceObj.id || !deviceObj.type) {
        callback(new errors.MissingAttributes('Id or device missing'));
        return;
    }

    logger.debug(context, 'Update provisioned device in NGSI Service');

    function combineWithNewDevice(newDevice, oldDevice, callback) {
        if (oldDevice) {
            oldDevice.internalId = newDevice.internalId;
            oldDevice.lazy = newDevice.lazy;
            oldDevice.active = newDevice.active;
            oldDevice.name = newDevice.name;
            oldDevice.type = newDevice.type;
            oldDevice.timezone = newDevice.timezone;

            callback(null, oldDevice);
        } else {
            callback(new errors.DeviceNotFound(newDevice.id));
        }
    }

    async.waterfall([
        async.apply(registry.get, deviceObj.id),
        async.apply(combineWithNewDevice, deviceObj),
        async.apply(sendRegistrations, false),
        async.apply(processContextRegistration, deviceObj),
        registry.update
    ], callback);
}

/**
 * Return a list of all the devices registered in the system. This function can be invoked in two different ways:
 * with just one parameter (the callback) or with three parameters (including limit and offset).
 *
 * @param {String} service
 * @param {String} subservice
 * @param {Number} limit        Maximum number of entries to return.
 * @param {Number} offset       Number of entries to skip for pagination.
 */
function listDevices(service, subservice, limit, offset, callback) {
    if (!callback) {
        callback = limit;
    }

    if (registry) {
        registry.list(service, subservice, limit, offset, callback);
    } else {
        logger.error(context, 'Tried to list devices before a registry was available');
        callback(new errors.RegistryNotAvailable());
    }
}

/**
 * Retrieve a device from the device registry.
 *
 * @param {String} deviceId         ID of the device to be found.
 */
function getDevice(deviceId, callback) {
    if (registry) {
        registry.get(deviceId, callback);
    } else {
        logger.error(context, 'Tried to list devices before a registry was available');
        callback(new errors.RegistryNotAvailable());
    }
}

/**
 * Retrieve a device from the registry based on its entity name.
 *
 * @param {String} deviceName       Name of the entity associated to a device.
 */
function getDeviceByName(deviceName, callback) {
    if (registry) {
        registry.getByName(deviceName, callback);
    } else {
        logger.error(context, 'Tried to get device information before a registry was available');
        callback(new errors.RegistryNotAvailable());
    }
}

/**
 * Initializes the NGSI service. The initialization requires a configuration object and a reference to a device
 * registry.
 *
 * @param {Object} newRegistry              Reference to a device registry, where the devices information are stored.
 * @param {Object} newGroupRegistry         Reference to a group registry, where the groups information are stored.
 * @param {Object} newConfig                Configuration object.
 */
function init(newRegistry, newGroupRegistry, newConfig, callback) {
    registry = newRegistry;
    groupRegistry = newGroupRegistry;
    config = newConfig;

    callback(null);
}

exports.init = init;
exports.register = registerDevice;
exports.updateRegister = updateRegisterDevice;
exports.unregister = unregisterDevice;
exports.update = updateValue;
exports.listDevices = listDevices;
exports.getDevice = getDevice;
exports.getDeviceByName = getDeviceByName;
