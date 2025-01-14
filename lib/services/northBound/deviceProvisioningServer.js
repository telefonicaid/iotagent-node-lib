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
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 */

const async = require('async');
const restUtils = require('./restUtils');
const statsRegistry = require('./../stats/statsRegistry');
const deviceService = require('./../devices/deviceService');
const intoTrans = require('../common/domain').intoTrans;
const logger = require('logops');
const errors = require('../../errors');
const _ = require('underscore');
const context = {
    op: 'IoTAgentNGSI.DeviceProvisioning'
};
const apply = async.apply;
let provisioningHandler;
let updatingHandler;
let removeDeviceHandler;
let updateDeviceTemplate;
let createDeviceTemplate;
const mandatoryHeaders = ['fiware-service', 'fiware-servicepath'];
let provisioningMiddlewares = [];
const provisioningAPITranslation = {
    /* jshint camelcase:false */

    name: 'id',
    apikey: 'apikey',
    service: 'service',
    service_path: 'subservice',
    entity_name: 'name',
    entity_type: 'type',
    timezone: 'timezone',
    timestamp: 'timestamp',
    protocol: 'protocol',
    transport: 'transport',
    endpoint: 'endpoint',
    polling: 'polling',
    attributes: 'active',
    commands: 'commands',
    lazy: 'lazy',
    internal_attributes: 'internalAttributes',
    static_attributes: 'staticAttributes',
    autoprovision: 'autoprovision',
    explicitAttrs: 'explicitAttrs',
    ngsiVersion: 'ngsiVersion',
    entityNameExp: 'entityNameExp',
    payloadType: 'payloadType',
    useCBflowControl: 'useCBflowControl',
    storeLastMeasure: 'storeLastMeasure',
    lastMeasure: 'lastMeasure'
};

/**
 * Load the templates for validating provisioning requests. The introduction of "Lax Mode" enables the addition of
 * characters which valid in the OPU-UA IoT Agent (e.g. semi-colons) but are usually forbidden by other IoT Agents
 */
function setConfiguration(config) {
    if (config.relaxTemplateValidation) {
        updateDeviceTemplate = require('../../templates/updateDeviceLax.json');
        createDeviceTemplate = require('../../templates/createDeviceLax.json');
    } else {
        updateDeviceTemplate = require('../../templates/updateDevice.json');
        createDeviceTemplate = require('../../templates/createDevice.json');
    }
}

/**
 * Express middleware to handle incoming device provisioning requests. Every request is validated and handled to the
 * NGSI Service for the registration.
 */
function handleProvision(req, res, next) {
    /* eslint-disable-next-line no-unused-vars */
    function handleProvisioningFinish(error, results) {
        if (error) {
            logger.debug(context, 'Device provisioning failed due to the following error: ', error.message);
            next(error);
        } else {
            logger.debug(context, 'Device provisioning request succeeded');
            res.status(201).json({});
        }
    }

    function applyProvisioningHandler(device, callback) {
        if (provisioningHandler) {
            provisioningHandler(device, callback);
        } else {
            callback(null, device);
        }
    }

    function applyProvisioningMiddlewares(device, callback) {
        if (provisioningMiddlewares.length > 0) {
            const firstMiddleware = provisioningMiddlewares.slice(0, 1)[0];
            const rest = provisioningMiddlewares.slice(1);
            let executingMiddlewares = [apply(firstMiddleware, device)];

            executingMiddlewares = executingMiddlewares.concat(rest);

            async.waterfall(executingMiddlewares, callback);
        } else {
            callback(null, device);
        }
    }

    function fillDeviceData(service, subservice, body, callback) {
        /* jshint sub: true */

        callback(null, {
            id: body.device_id,
            apikey: body.apikey,
            type: body.entity_type,
            name: body.entity_name,
            service,
            subservice,
            active: body.attributes,
            staticAttributes: body.static_attributes,
            lazy: body.lazy,
            commands: body.commands,
            timezone: body.timezone,
            timestamp: body.timestamp,
            endpoint: body.endpoint,
            internalAttributes: body.internal_attributes,
            protocol: body.protocol,
            transport: body.transport,
            internalId: null,
            autoprovision: body.autoprovision,
            explicitAttrs: body.explicitAttrs,
            ngsiVersion: body.ngsiVersion,
            payloadType: body.payloadType,
            useCBflowControl: body.useCBflowControl,
            storeLastMeasure: body.storeLastMeasure,
            lastMeasure: body.lastMeasure
        });
    }

    function provisionSingleDevice(device, callback) {
        async.waterfall(
            [
                apply(statsRegistry.add, 'deviceCreationRequests', 1),
                apply(restUtils.checkMandatoryQueryParams, ['device_id'], device),
                apply(fillDeviceData, req.headers['fiware-service'], req.headers['fiware-servicepath']),
                applyProvisioningMiddlewares,
                applyProvisioningHandler,
                deviceService.register
            ],
            callback
        );
    }

    function extractDevices() {
        return req.body.devices;
    }

    logger.debug(context, 'Handling device provisioning request.');
    async.map(extractDevices(), provisionSingleDevice, handleProvisioningFinish);
}

/**
 * Translate an attribute from the internal representaiton format to the one required by the Provisioning API.
 *
 * @param {Object} attribute                        Attribute in internal representation format.
 * @return {{object_id: *, name: *, type: *}}      Attribute in Device Provisioning API format.
 */
function attributeToProvisioningAPIFormat(attribute) {
    return {
        object_id: attribute.object_id,
        name: attribute.name,
        type: attribute.type,
        expression: attribute.expression,
        skipValue: attribute.skipValue,
        entity_name: attribute.entity_name,
        entity_type: attribute.entity_type,
        mqtt: attribute.mqtt,
        payloadType: attribute.payloadType,
        contentType: attribute.contentType,
        metadata: attribute.metadata
    };
}

/**
 * Translate between the inner model format to the external Device Provisioning API one.
 *
 * @param {Object} device           Device object coming from the registry.
 * @return {Object}                 Device object translated to Device Provisioning API format.
 */
function toProvisioningAPIFormat(device) {
    /* jshint camelcase:false */
    return {
        device_id: device.id,
        apikey: device.apikey,
        service: device.service,
        service_path: device.subservice,
        entity_name: device.name,
        entity_type: device.type,
        timezone: device.timezone,
        timestamp: device.timestamp,
        endpoint: device.endpoint,
        polling: device.polling,
        transport: device.transport,
        attributes: device.active ? device.active.map(attributeToProvisioningAPIFormat) : undefined,
        lazy: device.lazy ? device.lazy.map(attributeToProvisioningAPIFormat) : undefined,
        commands: device.commands ? device.commands.map(attributeToProvisioningAPIFormat) : undefined,
        static_attributes: device.staticAttributes,
        internal_attributes: device.internalAttributes,
        protocol: device.protocol,
        autoprovision: device.autoprovision,
        explicitAttrs: device.explicitAttrs,
        ngsiVersion: device.ngsiVersion,
        payloadType: device.payloadType,
        useCBflowControl: device.useCBflowControl,
        storeLastMeasure: device.storeLastMeasure,
        lastMeasure: device.lastMeasure
    };
}

/**
 * Express middleware that retrieves the complete set of provisioned devices (in JSON format).
 */
function handleListDevices(req, res, next) {
    deviceService.listDevices(
        req.headers['fiware-service'],
        req.headers['fiware-servicepath'],
        req.query.limit,
        req.query.offset,
        function handleListDevices(error, deviceList) {
            if (error) {
                next(error);
            } else {
                const response = deviceList;
                response.devices = deviceList.devices.map(toProvisioningAPIFormat);

                res.status(200).json(response);
            }
        }
    );
}

/**
 * This middleware gets the device specified in the deviceId parameter of the URL from the registry and returns it in
 * JSON format.
 */
function handleGetDevice(req, res, next) {
    deviceService.getDevice(
        req.params.deviceId,
        req.query.apikey,
        req.headers['fiware-service'],
        req.headers['fiware-servicepath'],
        function (error, device) {
            if (error) {
                next(error);
            } else if (device) {
                res.status(200).json(toProvisioningAPIFormat(device));
            } else {
                next(new errors.DeviceNotFound(req.params.deviceId), {
                    apikey: req.query.apikey,
                    service: req.headers['fiware-service'],
                    subservice: req.headers['fiware-servicepath']
                });
            }
        }
    );
}

function getDevice(deviceId, apikey, service, subservice, callback) {
    deviceService.getDevice(deviceId, apikey, service, subservice, function (error, device) {
        if (error) {
            callback(error);
        } else if (device) {
            callback(null, device);
        } else {
            callback(
                new errors.DeviceNotFound(deviceId, {
                    apikey: apikey,
                    service: service,
                    subservice: subservice
                })
            );
        }
    });
}

function applyRemoveDeviceHandler(device, callback) {
    if (removeDeviceHandler) {
        removeDeviceHandler(device, callback);
    } else {
        callback(null, device);
    }
}

function unregisterDevice(deviceId, apikey, service, subservice, device, callback) {
    return deviceService.unregister(deviceId, apikey, service, subservice, callback);
}

/**
 * This middleware handles the removal of a particular device specified with the deviceId.
 */
function handleRemoveDevice(req, res, next) {
    async.waterfall(
        [
            apply(statsRegistry.add, 'deviceRemovalRequests', 1),
            apply(
                getDevice,
                req.params.deviceId,
                req.query.apikey,
                req.headers['fiware-service'],
                req.headers['fiware-servicepath']
            ),
            applyRemoveDeviceHandler,
            apply(
                unregisterDevice,
                req.params.deviceId,
                req.query.apikey,
                req.headers['fiware-service'],
                req.headers['fiware-servicepath']
            )
        ],
        function (error) {
            if (error && error.code !== 404) {
                next(error);
            } else if (error && error.code === 404) {
                next(
                    new errors.DeviceNotFound(req.params.deviceId, {
                        apikey: req.query.apikey,
                        service: req.headers['fiware-service'],
                        subservice: req.headers['fiware-servicepath']
                    })
                );
            } else {
                res.status(204).send();
            }
        }
    );
}

/**
 * This middleware handles the removal of several devices specified in a array into a body
 */
function handleRemoveDevices(req, res, next) {
    logger.debug(context, 'Handling delete of devices: %j', req.body);
    let theErrorOut = false;
    for (let devicetoRemove of req.body.devices) {
        let theError = theErrorOut;
        async.waterfall(
            [
                apply(statsRegistry.add, 'deviceRemovalRequests', 1),
                apply(
                    getDevice,
                    devicetoRemove.deviceId,
                    devicetoRemove.apikey,
                    req.headers['fiware-service'],
                    req.headers['fiware-servicepath']
                ),
                applyRemoveDeviceHandler,
                apply(
                    unregisterDevice,
                    devicetoRemove.deviceId,
                    devicetoRemove.apikey,
                    req.headers['fiware-service'],
                    req.headers['fiware-servicepath']
                )
            ],
            function (error) {
                if (error && error.code !== 404) {
                    theError = !theError ? error : theError;
                } else if (error && error.code === 404) {
                    theError = !theError
                        ? new errors.DeviceNotFound(devicetoRemove.deviceId, {
                              apikey: devicetoRemove.apikey,
                              service: req.headers['fiware-service'],
                              subservice: req.headers['fiware-servicepath']
                          })
                        : theError;
                }
            }
        ); // waterfall
        theErrorOut = theError;
    } // for
    if (theErrorOut) {
        next(theErrorOut);
    } else {
        res.status(204).send();
    }
}

/**
 * This middleware handles updates in the provisioning devices. The only attribute
 */
function handleUpdateDevice(req, res, next) {
    function applyUpdatingHandler(newDevice, oldDevice, callback) {
        if (updatingHandler) {
            updatingHandler(newDevice, oldDevice, callback);
        } else {
            callback(null, newDevice);
        }
    }

    if (req.body.device_id) {
        next(new errors.BadRequest("Can't change the ID of a preprovisioned device"));
    } else {
        deviceService.getDevice(
            req.params.deviceId,
            req.query.apikey,
            req.headers['fiware-service'],
            req.headers['fiware-servicepath'],
            function (error, device) {
                if (error) {
                    next(error);
                } else if (device) {
                    const pairs = _.pairs(req.body);
                    const newDevice = _.clone(device);

                    for (const i in pairs) {
                        newDevice[provisioningAPITranslation[pairs[i][0]]] = pairs[i][1];
                    }
                    var isTypeOrNameUpdated = false;
                    if (req.body.entity_name || req.body.entity_type) {
                        isTypeOrNameUpdated = true;
                    }
                    async.waterfall(
                        [apply(applyUpdatingHandler, newDevice, device)],
                        function handleUpdating(error, newDeviceUpdated) {
                            deviceService.updateRegister(
                                newDeviceUpdated,
                                device,
                                isTypeOrNameUpdated,
                                function handleDeviceUpdate(error) {
                                    if (error) {
                                        next(error);
                                    } else {
                                        res.status(204).json({});
                                    }
                                }
                            );
                        }
                    );
                } else {
                    next(
                        new errors.DeviceNotFound(req.params.deviceId, {
                            apikey: req.query.apikey,
                            service: req.headers['fiware-service'],
                            subservice: req.headers['fiware-servicepath']
                        })
                    );
                }
            }
        );
    }
}

/**
 * Load the routes related to device provisioning in the Express App.
 *
 * @param {Object} router      Express request router object.
 */
function loadContextRoutes(router) {
    router.post(
        '/iot/devices',
        restUtils.checkRequestAttributes('headers', mandatoryHeaders),
        restUtils.checkBody(createDeviceTemplate),
        handleProvision
    );

    router.get('/iot/devices', restUtils.checkRequestAttributes('headers', mandatoryHeaders), handleListDevices);

    router.get(
        '/iot/devices/:deviceId',
        restUtils.checkRequestAttributes('headers', mandatoryHeaders),
        handleGetDevice
    );

    router.put(
        '/iot/devices/:deviceId',
        restUtils.checkRequestAttributes('headers', mandatoryHeaders),
        restUtils.checkBody(updateDeviceTemplate),
        handleUpdateDevice
    );

    router.post('/iot/op/delete', restUtils.checkRequestAttributes('headers', mandatoryHeaders), handleRemoveDevices);

    router.delete(
        '/iot/devices/:deviceId',
        restUtils.checkRequestAttributes('headers', mandatoryHeaders),
        handleRemoveDevice
    );
}

function setProvisioningHandler(newHandler) {
    provisioningHandler = newHandler;
}

function setUpdatingHandler(newHandler) {
    updatingHandler = newHandler;
}

function setRemoveDeviceHandler(newHandler) {
    removeDeviceHandler = newHandler;
}

function addDeviceProvisionMiddleware(newHandler) {
    provisioningMiddlewares.push(newHandler);
}

function clear(callback) {
    provisioningMiddlewares = [];
    provisioningHandler = null;
    callback();
}

exports.setConfiguration = setConfiguration;
exports.loadContextRoutes = intoTrans(context, loadContextRoutes);
exports.setProvisioningHandler = intoTrans(context, setProvisioningHandler);
exports.setUpdatingHandler = intoTrans(context, setUpdatingHandler);
exports.setRemoveDeviceHandler = intoTrans(context, setRemoveDeviceHandler);
exports.addDeviceProvisionMiddleware = addDeviceProvisionMiddleware;
exports.clear = clear;
