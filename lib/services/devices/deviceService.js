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

/* eslint-disable no-prototype-builtins */
/* eslint-disable prefer-spread */
/* eslint-disable prefer-rest-params */
/* eslint-disable consistent-return */

const async = require('async');
const apply = async.apply;
const intoTrans = require('../common/domain').intoTrans;
const groupService = require('../groups/groupService');
const errors = require('../../errors');
const logger = require('logops');
const config = require('../../commonConfig');
const registrationUtils = require('./registrationUtils');
const subscriptions = require('../ngsi/subscriptionService');
const expressionPlugin = require('./../../plugins/expressionPlugin');
const pluginUtils = require('./../../plugins/pluginUtils');
const _ = require('underscore');
const context = {
    op: 'IoTAgentNGSI.DeviceService'
};

let deviceHandler;

/**
 * Loads the correct device handler based on the current config.
 */

function init() {
    switch (config.ngsiVersion()) {
        case 'ld':
            deviceHandler = require('./devices-NGSI-LD');
            break;
        case 'mixed':
            deviceHandler = require('./devices-NGSI-mixed');
            break;
        default:
            deviceHandler = require('./devices-NGSI-v2');
    }
}

/**
 * If the object_id or the name of the attribute is missing, complete it with the other piece of data.
 *
 * @param {Object} attribute            Device attribute
 * @return {*}                          Completed attribute
 */
function setDefaultAttributeIds(attribute) {
    /* jshint camelcase: false */

    if (!attribute.object_id && attribute.name) {
        attribute.object_id = attribute.name;
    }

    if (!attribute.name && attribute.object_id) {
        attribute.name = attribute.object_id;
    }

    return attribute;
}

/**
 * Merge array of attributes coming from the device with another one coming from a configuration. The latter will
 * complete the information in the former if the attribute in the configuration:
 * - does not have a conflicting object_id with any attribute of the device.
 * - does not have a conflicting name with any other attribute in the device
 *
 * @param {Array} original              List of attributes of the device.
 * @param {Array} newArray              List of attributes of the configuration.
 * @return {Array}                      Merge of the attributes of the device and those of the configuration.
 */
function mergeArrays(original, newArray) {
    /* jshint camelcase: false */
    const originalKeys = _.pluck(original, 'object_id');
    const newKeys = _.pluck(newArray, 'object_id');
    const addedKeys = _.difference(newKeys, originalKeys);
    const differenceArray = newArray.filter(function (item) {
        return item.object_id && addedKeys.indexOf(item.object_id) >= 0;
    });
    const originalNames = _.pluck(original, 'name');
    const newNames = _.pluck(newArray, 'name');
    const addedNames = _.difference(newNames, originalNames);
    const differenceNamesArray = newArray.filter(function (item) {
        return addedNames.indexOf(item.name) >= 0 && (!item.object_id || newKeys.indexOf(item.object_id) < 0);
    });

    return original.concat(differenceArray).concat(differenceNamesArray);
}

/**
 * Complete the information of the device with the information in the configuration group (with precedence of the
 * device). The first argument indicates what fields would be merged.
 *
 * @param {Object} fields               Fields that will be merged.
 * @param {Object} deviceData           Device data.
 * @param {Object} configuration        Configuration data.
 */
function mergeDeviceWithConfiguration(fields, defaults, deviceData, configuration, callback) {
    logger.debug(
        context,
        'deviceData before merge with conf: %j defaults: %j fields: %j configuration %j',
        deviceData,
        defaults,
        fields,
        configuration
    );
    for (let i = 0; i < fields.length; i++) {
        const confField = fields[i] === 'active' ? 'attributes' : fields[i];
        if (deviceData && deviceData[fields[i]] && ['active', 'lazy', 'commands'].indexOf(fields[i]) >= 0) {
            deviceData[fields[i]] = deviceData[fields[i]].map(setDefaultAttributeIds);
        } else if (deviceData && deviceData[fields[i]] && ['internalAttributes'].indexOf(fields[i]) >= 0) {
            if (!(deviceData[fields[i]] instanceof Array)) {
                deviceData[fields[i]] = [deviceData[fields[i]]];
            }
        }

        if (configuration && configuration[confField] && ['attributes', 'lazy', 'commands'].indexOf(confField) >= 0) {
            configuration[confField] = configuration[confField].map(setDefaultAttributeIds);
        } else if (configuration && configuration[confField] && ['internalAttributes'].indexOf(confField) >= 0) {
            if (!(configuration[confField] instanceof Array)) {
                configuration[confField] = [configuration[confField]];
            }
        }

        if (deviceData[fields[i]] && configuration && configuration[confField]) {
            deviceData[fields[i]] = mergeArrays(deviceData[fields[i]], configuration[confField]);
        } else if (
            !deviceData[fields[i]] &&
            configuration &&
            confField in configuration &&
            configuration[confField] !== undefined
        ) {
            deviceData[fields[i]] = configuration[confField];
        } else if (!deviceData[fields[i]] && (!configuration || !configuration[confField])) {
            deviceData[fields[i]] = defaults[i];
        }
    }

    if (configuration && configuration.cbHost) {
        deviceData.cbHost = configuration.cbHost;
    }
    if (configuration && configuration.ngsiVersion) {
        deviceData.ngsiVersion = configuration.ngsiVersion;
    }
    if (configuration && configuration.explicitAttrs !== undefined && deviceData.explicitAttrs === undefined) {
        deviceData.explicitAttrs = configuration.explicitAttrs;
    }
    if (configuration && configuration.entityNameExp !== undefined) {
        deviceData.entityNameExp = configuration.entityNameExp;
    }
    if (configuration && configuration.timestamp !== undefined && deviceData.timestamp === undefined) {
        deviceData.timestamp = configuration.timestamp;
    }
    if (configuration && configuration.payloadType !== undefined && deviceData.payloadType === undefined) {
        deviceData.payloadType = configuration.payloadType;
    }
    if (configuration && configuration.useCBflowControl !== undefined && deviceData.useCBflowControl === undefined) {
        deviceData.useCBflowControl = configuration.useCBflowControl;
    }
    if (configuration && configuration.storeLastMeasure !== undefined && deviceData.storeLastMeasure === undefined) {
        deviceData.storeLastMeasure = configuration.storeLastMeasure;
    }
    logger.debug(context, 'deviceData after merge with conf: %j', deviceData);
    callback(null, deviceData);
}

/**
 * Find the configuration group belonging to a given device
 *
 * @param {Object} deviceObj        Device data.
 */
function findConfigurationGroup(deviceObj, callback) {
    function handlerGroupFindByType(error, group) {
        if (!group) {
            config
                .getGroupRegistry()
                .findSilently(deviceObj.service, deviceObj.subservice, deviceObj.apikey, handlerGroupFind);
        } else {
            handlerGroupFind(error, group);
        }
    }

    function handlerGroupFind(error, group) {
        let effectiveGroup = group;

        if (!group && config.getConfig().types[deviceObj.type]) {
            effectiveGroup = config.getConfig().types[deviceObj.type];
        } else if (!group) {
            effectiveGroup = deviceObj;
        }

        callback(null, effectiveGroup);
    }

    config
        .getGroupRegistry()
        .findTypeSilently(
            deviceObj.service,
            deviceObj.subservice,
            deviceObj.type,
            deviceObj.apikey,
            handlerGroupFindByType
        );
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
    function checkDuplicates(deviceObj, innerCb) {
        config.getRegistry().getSilently(
            deviceObj.id,
            deviceObj.apikey,
            deviceObj.service,
            deviceObj.subservice,
            /* eslint-disable-next-line no-unused-vars */
            function (error, device) {
                if (!error) {
                    innerCb(new errors.DuplicateDeviceId(deviceObj));
                } else {
                    innerCb();
                }
            }
        );
    }

    function prepareDeviceData(deviceObj, configuration, callback) {
        const deviceData = _.clone(deviceObj);
        let selectedConfiguration;
        logger.debug(context, 'Prepare device data:\n%s', JSON.stringify(deviceData, null, 4));
        if (!deviceData.type) {
            if (configuration && configuration.type) {
                deviceData.type = configuration.type;
            } else {
                deviceData.type = config.getConfig().defaultType;
            }
        }

        if ('explicitAttrs' in deviceData && deviceData.explicitAttrs === undefined) {
            if (configuration && configuration.explicitAttrs !== undefined) {
                deviceData.explicitAttrs = configuration.explicitAttrs;
            } else {
                deviceData.explicitAttrs = config.getConfig().explicitAttrs;
            }
        }

        if (!deviceData.ngsiVersion) {
            if (configuration && configuration.ngsiVersion) {
                deviceData.ngsiVersion = configuration.ngsiVersion;
            }
        }
        // Set polling and transport for autoprovisioned devices
        if (!deviceData.transport && config.getConfig().defaultTransport) {
            deviceData.transport =
                configuration && configuration.transport
                    ? configuration.transport
                    : config.getConfig().defaultTransport;
        }
        if (deviceData.transport === 'HTTP') {
            if (deviceData.endpoint) {
                deviceData.polling = false;
            } else {
                deviceData.polling = !(configuration && configuration.endpoint);
            }
        }
        if (!deviceData.name) {
            let entityName = null;
            if (configuration && configuration.entityNameExp !== undefined && configuration.entityNameExp !== '') {
                // Add device ID, TYPE, S, SS to the context for the JEXL expression
                let attrList = pluginUtils.getIdTypeServSubServiceFromDevice(deviceData);
                attrList = deviceData.staticAttributes ? attrList.concat(deviceData.staticAttributes) : attrList;
                attrList = configuration.staticAttributes ? attrList.concat(configuration.staticAttributes) : attrList;
                const ctxt = expressionPlugin.extractContext(attrList);
                try {
                    entityName = expressionPlugin.applyExpression(configuration.entityNameExp, ctxt, deviceData);
                } catch (e) {
                    logger.debug(
                        context,
                        'Error evaluating expression for entityName: %s with context: %s',
                        configuration.entityNameExp,
                        ctxt
                    );
                }
            }
            deviceData.name = entityName ? entityName : defaultName();
        }

        if (!configuration && config.getConfig().types[deviceData.type]) {
            selectedConfiguration = config.getConfig().types[deviceData.type];
        } else {
            selectedConfiguration = configuration;
        }
        callback(null, deviceData, selectedConfiguration);

        function defaultName() {
            let conjunction;
            let name;
            if (configuration && configuration.defaultEntityNameConjunction !== undefined) {
                conjunction = configuration.defaultEntityNameConjunction;
            } else {
                conjunction = config.getConfig().defaultEntityNameConjunction;
            }
            name = deviceData.type + conjunction + deviceData.id;

            if (config.checkNgsiLD(configuration)) {
                name = 'urn:ngsi-ld:' + deviceData.type + conjunction + deviceData.id;
            }
            logger.debug(
                context,
                'Device name not found, falling back to deviceType%sdeviceId [%s]',
                conjunction,
                deviceData.name
            );
            return name;
        }
    }

    function completeRegistrations(error, deviceData) {
        if (error) {
            return callback(error);
        }

        logger.debug(context, 'Registering device into NGSI Service:\n%s', JSON.stringify(deviceData, null, 4));

        async.waterfall(
            [
                apply(registrationUtils.sendRegistrations, false, deviceData),
                apply(registrationUtils.processContextRegistration, deviceData)
            ],
            function (error, results) {
                if (error) {
                    callback(error);
                } else {
                    deviceObj.registrationId = results.registrationId;
                    deviceObj.name = deviceData.name;
                    deviceObj.service = deviceData.service;
                    deviceObj.subservice = deviceData.subservice;
                    deviceObj.type = deviceData.type;
                    deviceObj.staticAttributes = deviceObj.staticAttributes ? deviceObj.staticAttributes : [];
                    deviceObj.commands = deviceData.commands ? deviceData.commands : [];
                    deviceObj.lazy = deviceObj.lazy ? deviceObj.lazy : [];
                    if ('apikey' in deviceData && deviceData.apikey !== undefined) {
                        deviceObj.apikey = deviceData.apikey;
                    }
                    if ('transport' in deviceData && deviceData.transport !== undefined) {
                        deviceObj.transport = deviceData.transport;
                    }
                    if ('polling' in deviceData && deviceData.polling !== undefined) {
                        deviceObj.polling = deviceData.polling;
                    }
                    logger.debug(context, 'Storing device :\n%s', JSON.stringify(deviceObj, null, 4));
                    config.getRegistry().store(deviceObj, callback);
                }
            }
        );
    }

    async.waterfall(
        [
            apply(checkDuplicates, deviceObj),
            apply(findConfigurationGroup, deviceObj),
            apply(prepareDeviceData, deviceObj),
            apply(
                mergeDeviceWithConfiguration,
                ['lazy', 'active', 'staticAttributes', 'commands', 'subscriptions'],
                [null, null, [], [], [], [], []]
            )
        ],
        completeRegistrations
    );
}

function removeAllSubscriptions(device, callback) {
    function removeSubscription(subscription, callback) {
        subscriptions.unsubscribe(device, subscription.id, callback);
    }

    if (device.subscriptions) {
        async.map(device.subscriptions, removeSubscription, callback);
    } else {
        callback(null, {});
    }
}

/**
 * Unregister a device from the Context broker and the internal registry.
 *
 * @param {String} id           Device ID of the device to register.
 * @param {String} service      Service of the device to unregister.
 * @param {String} subservice   Subservice inside the service for the unregisterd device.
 */
function unregisterDevice(id, apikey, service, subservice, callback) {
    function processContextUnregister(body, innerCallback) {
        innerCallback(null);
    }

    function processUnsubscribes(device, innerCallback) {
        innerCallback(null);
    }

    logger.debug(context, 'Removing device %j %j %j %j register in Device Service', id, apikey, service, subservice);

    config.getRegistry().get(id, apikey, service, subservice, function (error, device) {
        if (error) {
            callback(error);
        } else {
            async.waterfall(
                [
                    apply(findConfigurationGroup, device),
                    apply(
                        mergeDeviceWithConfiguration,
                        ['lazy', 'active', 'staticAttributes', 'commands', 'subscriptions'],
                        [null, null, [], [], [], [], []],
                        device
                    )
                ],
                function (error, mergedDevice) {
                    if (error) {
                        callback(error);
                    } else {
                        async.waterfall(
                            [
                                apply(removeAllSubscriptions, mergedDevice),
                                processUnsubscribes,
                                apply(registrationUtils.sendRegistrations, true, mergedDevice),
                                processContextUnregister,
                                apply(config.getRegistry().remove, id, apikey, service, subservice)
                            ],
                            callback
                        );
                    }
                }
            );
        }
    });
}

function updateRegisterDevice(deviceObj, previousDevice, entityInfoUpdated, callback) {
    deviceHandler.updateRegisterDevice(deviceObj, previousDevice, entityInfoUpdated, callback);
}

/**
 * Return a list of all the devices registered in the system. This function can be invoked in three different ways:
 * with just one parameter (the callback) with three parameters (service, subservice and callback) or with five
 * parameters (including limit and offset).
 *
 * @param {String} type         Type for which the devices are requested.
 * @param {String} service      Service for which the devices are requested.
 * @param {String} subservice   Subservice inside the service for which the devices are requested.
 * @param {Number} limit        Maximum number of entries to return.
 * @param {Number} offset       Number of entries to skip for pagination.
 */
function listDevicesWithType(type, service, subservice, limit, offset, callback) {
    if (!callback) {
        if (service && subservice && limit) {
            callback = limit;
        } else if (service) {
            callback = service;
            service = null;
            subservice = null;
        } else {
            logger.fatal(context, "GENERAL-001: Couldn't find callback in listDevices() call.");
        }
    }

    config.getRegistry().list(type, service, subservice, limit, offset, callback);
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
            logger.fatal(context, "GENERAL-001: Couldn't find callback in listDevices() call.");
        }
    }

    config.getRegistry().list(null, service, subservice, limit, offset, callback);
}

/**
 * Retrieve a device from the device registry.
 *
 * @param {String} deviceId         ID of the device to be found.
 * @param {String} service          Service for which the requested device.
 * @param {String} subservice       Subservice inside the service for which the device is requested.
 */
function getDevice(deviceId, apikey, service, subservice, callback) {
    config.getRegistry().get(deviceId, apikey, service, subservice, callback);
}

/**
 * Update a device from the device registry.
 *
 * @param {String} device           JSON object contain the device to update.
 */
function updateDevice(device, callback) {
    logger.debug(context, 'updateDevice %j', device);
    config.getRegistry().update(device, device, callback);
}

/**
 * Retrieve a device from the device registry, allowing not found it (will be created later)
 *
 * @param {String} deviceId         ID of the device to be found.
 * @param {String} service          Service for which the requested device.
 * @param {String} subservice       Subservice inside the service for which the device is requested.
 */
function getDeviceSilently(deviceId, apikey, service, subservice, callback) {
    config.getRegistry().getSilently(deviceId, apikey, service, subservice, callback);
}

/**
 * Clear all the information in the registry.
 */
function clearRegistry(callback) {
    config.getRegistry().clear(callback);
}

/**
 * Retrieve a device from the registry based on its entity name.
 *
 * @param {String} deviceName       Name of the entity associated to a device.
 * @param {String} service          Service the device belongs to.
 * @param {String} subservice       Division inside the service.
 */
function getDeviceByName(deviceName, service, subservice, callback) {
    config.getRegistry().getByName(deviceName, service, subservice, callback);
}

/**
 * Retrieve a device from the registry based on its entity name and type
 *
 * @param {String} deviceName       Name of the entity associated to a device.
 * @param {String} deviceType       Type of the entity associated to a device.
 * @param {String} service          Service the device belongs to.
 * @param {String} subservice       Division inside the service.
 */
function getDeviceByNameAndType(deviceName, deviceType, service, subservice, callback) {
    config.getRegistry().getByNameAndType(deviceName, deviceType, service, subservice, callback);
}

/**
 * Retrieve a device from the registry based on the value of a given attribute.
 *
 * @param {String} attributeName       Name of the attribute to perform the search with.
 * @param {String} attributeValue      Value of the attribute to perform the selection.
 * @param {String} service             Service the device belongs to.
 * @param {String} subservice          Division inside the service.
 */
function getDevicesByAttribute(attributeName, attributeValue, service, subservice, callback) {
    config.getRegistry().getDevicesByAttribute(attributeName, attributeValue, service, subservice, callback);
}

/**
 * Wraps a function, throwing an exception if the function is invoked before the registry is initialized.
 *
 * @param {Function} fn                 Original function to wrap.
 * @return {Function}                   Wrapped function.
 */
function checkRegistry(fn) {
    return function () {
        const args = Array.prototype.slice.call(arguments);
        const callbacks = args.slice(-1);

        if (config.getRegistry()) {
            fn.apply(null, args);
        } else if (callbacks && callbacks.length === 1 && typeof callbacks[0] === 'function') {
            logger.error(context, 'Tried to access device information before a registry was available');
            callbacks[0](new errors.RegistryNotAvailable());
        } else {
            logger.error(context, 'Tried to access device information without providing a callback');
        }
    };
}

function findOrCreate(deviceId, apikey, group, callback) {
    getDeviceSilently(deviceId, apikey, group.service, group.subservice, function (error, device) {
        if (!error && device) {
            if (
                (!('apikey' in device) || device.apikey === undefined) &&
                'apikey' in group &&
                group.apikey !== undefined
            ) {
                logger.info(context, 'Update provisioned device %j with measure/group apikey %j', device, group.apikey);
                device.apikey = group.apikey; // group apikey is the same of current measure apikey
                updateDevice(device, function (error) {
                    callback(error, device, group);
                });
            } else {
                callback(null, device, group);
            }
        } else if (error.name === 'DEVICE_NOT_FOUND') {
            const newDevice = {
                id: deviceId,
                apikey,
                service: group.service,
                subservice: group.subservice,
                type: group.type
            };

            if (config.getConfig().iotManager && config.getConfig().iotManager.protocol) {
                newDevice.protocol = config.getConfig().iotManager.protocol;
            }
            if ('ngsiVersion' in group && group.ngsiVersion !== undefined) {
                newDevice.ngsiVersion = group.ngsiVersion;
            }
            if (
                (!('apikey' in newDevice) || newDevice.apikey === undefined) &&
                'apikey' in group &&
                group.apikey !== undefined
            ) {
                newDevice.apikey = group.apikey;
            }
            // Check autoprovision flag in order to register or not device
            if (group.autoprovision === undefined || group.autoprovision === true) {
                logger.debug(context, 'Registering autoprovision of Device %j for its conf %j', newDevice, group);
                registerDevice(newDevice, function (error, device) {
                    callback(error, device, group);
                });
            } else {
                logger.info(
                    context,
                    'Device %j not provisioned due autoprovision is disabled by its conf %j',
                    newDevice,
                    group
                );
                callback(new errors.DeviceNotFound(deviceId, newDevice));
            }
        } else {
            callback(error);
        }
    });
}

/**
 * Retrieve a device from the device repository based on the given APIKey and DeviceID, creating one if none is
 * found for the given data.
 *
 * @param {String} deviceId         Device ID of the device that wants to be retrieved or created.
 * @param {String} apiKey           APIKey of the Device Group (or default APIKey).
 */
function retrieveDevice(deviceId, apiKey, callback) {
    if (apiKey === config.getConfig().defaultKey) {
        getDevicesByAttribute('id', deviceId, null, null, function (error, devices) {
            if (error) {
                callback(error);
            } else if (devices && devices.length === 1) {
                callback(null, devices[0]);
            } else {
                logger.error(context, "Couldn't find device data for APIKey [%s] and DeviceId[%s]", deviceId, apiKey);

                callback(new errors.DeviceNotFound(deviceId, { apikey: apiKey }));
            }
        });
    } else {
        async.waterfall(
            [
                apply(groupService.getSilently, config.getConfig().defaultResource || '', apiKey),
                apply(findOrCreate, deviceId, apiKey),
                apply(
                    mergeDeviceWithConfiguration,
                    ['lazy', 'active', 'staticAttributes', 'commands', 'subscriptions'],
                    [null, null, [], [], [], [], []]
                )
            ],
            callback
        );
    }
}

function storeLastMeasure(measure, typeInformation, callback) {
    config.getRegistry().storeLastMeasure(measure, typeInformation, callback);
}

exports.listDevices = intoTrans(context, checkRegistry)(listDevices);
exports.listDevicesWithType = intoTrans(context, checkRegistry)(listDevicesWithType);
exports.getDevice = intoTrans(context, checkRegistry)(getDevice);
exports.updateDevice = intoTrans(context, checkRegistry)(updateDevice);
exports.getDeviceSilently = intoTrans(context, checkRegistry)(getDeviceSilently);
exports.getDevicesByAttribute = intoTrans(context, checkRegistry)(getDevicesByAttribute);
exports.getDeviceByName = intoTrans(context, checkRegistry)(getDeviceByName);
exports.getDeviceByNameAndType = intoTrans(context, checkRegistry)(getDeviceByNameAndType);
exports.register = intoTrans(context, registerDevice);
exports.updateRegister = intoTrans(context, updateRegisterDevice);
exports.unregister = intoTrans(context, unregisterDevice);
exports.clearRegistry = intoTrans(context, checkRegistry)(clearRegistry);
exports.retrieveDevice = intoTrans(context, checkRegistry)(retrieveDevice);
exports.mergeDeviceWithConfiguration = mergeDeviceWithConfiguration;
exports.findOrCreate = findOrCreate;
exports.findConfigurationGroup = findConfigurationGroup;
exports.storeLastMeasure = storeLastMeasure;
exports.init = init;
