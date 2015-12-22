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
    logger = require('logops'),
    ngsiParser = require('./../ngsi/ngsiParser'),
    _ = require('underscore'),
    context = {
        op: 'IoTAgentNGSI.DeviceService'
    },
    registry,
    groupRegistry,
    config;


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
            logger.error(context, 'Connection error sending registrations to the Context Broker: %s', error);
            callback(error);
        } else if (response && body && response.statusCode === 200) {
            var errorField = ngsiParser.getErrorField(body);

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
    };
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

    function formatAttributes(originalVector) {
        var attributeList = [];

        if (originalVector && originalVector.length) {
            for (var i = 0; i < originalVector.length; i++) {
                attributeList.push({
                    name: originalVector[i].name,
                    type: originalVector[i].type,
                    isDomain: 'false'
                });
            }
        }

        return attributeList;
    }

    if (deviceData.registrationId) {
        options.json.registrationId = deviceData.registrationId;
    }

    options.json.contextRegistrations[0].attributes = options.json.contextRegistrations[0].attributes.concat(
        formatAttributes(deviceData.lazy),
        formatAttributes(deviceData.commands)
    );

    if (options.json.contextRegistrations[0].attributes.length === 0) {
        logger.debug(context, 'No Context Provider registrations found for unregister');
        callback(null, deviceData);
    } else {
        logger.debug(context, 'Sending device registrations to Context Broker at [%s]', options.url);
        logger.debug(context, 'Using the following request:\n\n%s\n\n', JSON.stringify(options, null, 4));

        request(options, createRegistrationHandler(unregister, deviceData, callback));
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
    var newDevice = _.clone(deviceData);

    if (body) {
        newDevice.registrationId = body.registrationId;
    }

    callback(null, newDevice);
}

/**
 * Creates the response handler for the initial entity creation request. This handler basically deals with the errors
 * that could have been rised during the communication with the Context Broker.
 *
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 * @param {Object} newDevice        Device object that will be stored in the database.
 * @return {function}               Handler to pass to the request() function.
 */
function createInitialEntityHandler(deviceData, newDevice, callback) {
    return function handleInitialEntityResponse(error, response, body) {
        if (error) {
            logger.error(context, 'Connection error creating inital entity in the Context Broker: %s', error);
            callback(error);
        } else if (response && body && response.statusCode === 200) {
            var errorField = ngsiParser.getErrorField(body);

            if (errorField) {
                logger.error(context, 'Update error connecting to the Context Broker: %j', errorField);
                callback(new errors.BadRequest(JSON.stringify(errorField)));
            } else {
                logger.debug(context, 'Initial entity created successfully.');
                callback(null, newDevice);
            }
        } else {
            var errorObj;

            logger.error(context, 'Protocol error connecting to the Context Broker: %j', errorObj);

            errorObj = new errors.EntityGenericError(deviceData.id, deviceData.type, errorObj);

            callback(errorObj);
        }
    };
}

/**
 * Creates the initial entity representing the device in the Context Broker. This is important mainly to allow the
 * rest of the updateContext operations to be performed using an UPDATE action instead of an APPEND one.
 *
 * @param {Object} deviceData       Object containing all the deviceData needed to send the registration.
 * @param {Object} newDevice        Device object that will be stored in the database.
 */
function createInitialEntity(deviceData, newDevice, callback) {
    var options = {
        url: 'http://' + config.contextBroker.host + ':' + config.contextBroker.port + '/v1/updateContext',
        method: 'POST',
        json: {
            contextElements: [
                {
                    type: deviceData.type,
                    isPattern: 'false',
                    id: String(deviceData.name),
                    attributes: []
                }
            ],
            updateAction: 'APPEND'
        },
        headers: {
            'fiware-service': deviceData.service,
            'fiware-servicepath': deviceData.subservice
        }
    };

    function formatAttributes(originalVector) {
        var attributeList = [];

        if (originalVector && originalVector.length) {
            for (var i = 0; i < originalVector.length; i++) {
                attributeList.push({
                    name: originalVector[i].name,
                    type: originalVector[i].type,
                    value: ' '
                });
            }
        }

        return attributeList;
    }

    function formatCommands(originalVector) {
        var attributeList = [];

        if (originalVector && originalVector.length) {
            for (var i = 0; i < originalVector.length; i++) {
                attributeList.push({
                    name: originalVector[i].name + '_status',
                    type: 'commandStatus',
                    value: 'UNKNOWN'
                });
                attributeList.push({
                    name: originalVector[i].name + '_result',
                    type: 'commandResult',
                    value: ' '
                });
            }
        }

        return attributeList;
    }

    options.json.contextElements[0].attributes = [].concat(
        formatAttributes(deviceData.active),
        deviceData.staticAttributes,
        formatCommands(deviceData.commands));



    request(options, createInitialEntityHandler(deviceData, newDevice, callback));
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

    function setDefaultAttributeIds(attribute) {
        if (!attribute.id && attribute.name) {
            attribute.id = attribute.name;
        }

        if (!attribute.name && attribute.id) {
            attribute.name = attribute.id;
        }

        return attribute;
    }

    logger.debug(context, 'Registering device into NGSI Service:\n%s', JSON.stringify(deviceData, null, 4));

    if (!deviceData.type) {
        deviceData.type = config.defaultType;
    }

    if (!deviceData.name) {
        deviceData.name = deviceData.type + ':' + deviceData.id;
        logger.debug(context, 'Device name not found, falling back to deviceId:type [%s]', deviceData.name);
    }

    for (var i = 0; i < fields.length; i++) {
        if (config.types[deviceData.type] && config.types[deviceObj.type][fields[i]]) {
            deviceData[fields[i]] =
                (deviceData[fields[i]]) ? deviceData[fields[i]] : config.types[deviceObj.type][fields[i]];
        } else {
            deviceData[fields[i]] = (deviceData[fields[i]]) ? deviceData[fields[i]] : defaults[i];
        }

        if (deviceData[fields[i]] && ['active', 'lazy', 'commands'].indexOf(fields[i]) >= 0) {
            deviceData[fields[i]] = deviceData[fields[i]].map(setDefaultAttributeIds);
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
        async.apply(createInitialEntity, deviceData),
        registry.store
    ], callback);
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

    logger.debug(context, 'Removing device register in Device Service');

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

    logger.debug(context, 'Update provisioned device in Device Service');

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
 * Return a list of all the devices registered in the system. This function can be invoked in three different ways:
 * with just one parameter (the callback) with three parameters (service, subservice and callback) or with five
 * parameters (including limit and offset).
 *
 * @param {String} service      Service for which the devices are requested.
 * @param {String} subservice   Subservice inside the service for which the devices are requested.
 * @param {Number} limit        Maximum number of entries to return.
 * @param {Number} offset       Number of entries to skip for pagination.
 */
function listDevices(service, subservice, limit, offset, callback) {
    if (!callback) {
        if (service && subservice && limit) {
            callback = limit;
        } else if (service) {
            callback = service;
            service = null;
            subservice = null;
        } else {
            logger.fatal(context, 'Couldn\'t find callback in listDevices() call.');
        }
    }

    registry.list(service, subservice, limit, offset, callback);
}

/**
 * Retrieve a device from the device registry.
 *
 * @param {String} deviceId         ID of the device to be found.
 */
function getDevice(deviceId, callback) {
    registry.get(deviceId, callback);
}

/**
 * Clear all the information in the registry.
 */
function clearRegistry(callback) {
    registry.clear(callback);
}

/**
 * Retrieve a device from the registry based on its entity name.
 *
 * @param {String} deviceName       Name of the entity associated to a device.
 */
function getDeviceByName(deviceName, callback) {
    registry.getByName(deviceName, callback);
}

/**
 * Retrieve a device from the registry based on the value of a given attribute.
 *
 * @param {String} attributeName       Name of the attribute to perform the search with.
 * @param {String} attributeValue      Value of the attribute to perform the selection
 */
function getDevicesByAttribute(attributeName, attributeValue, callback) {
    registry.getDevicesByAttribute(attributeName, attributeValue, callback);
}

/**
 * Wraps a function, throwing an exception if the function is invoked before the registry is initialized.
 *
 * @param {Function} fn                 Original function to wrap.
 * @return {Function}                   Wrapped function.
 */
function checkRegistry(fn) {
    return function() {
        var args = Array.prototype.slice.call(arguments),
            callbacks = args.slice(-1);

        if (registry) {
            fn.apply(null, args);
        } else if (callbacks && callbacks.length === 1 && (typeof callbacks[0] === 'function')) {
            logger.error(context, 'Tried to access device information before a registry was available');
            callbacks[0](new errors.RegistryNotAvailable());
        } else {
            logger.error(context, 'Tried to access device information without providing a callback');
        }
    };
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
exports.listDevices = checkRegistry(listDevices);
exports.getDevice = checkRegistry(getDevice);
exports.getDevicesByAttribute = checkRegistry(getDevicesByAttribute);
exports.getDeviceByName = checkRegistry(getDeviceByName);
exports.register = registerDevice;
exports.updateRegister = updateRegisterDevice;
exports.unregister = unregisterDevice;
exports.clearRegistry = checkRegistry(clearRegistry);
