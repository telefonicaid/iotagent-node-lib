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

var async = require('async'),
    restUtils = require('./restUtils'),
    statsRegistry = require('./../stats/statsRegistry'),
    deviceService = require('./../devices/deviceService'),
    intoTrans = require('../common/domain').intoTrans,
    logger = require('logops'),
    errors = require('../../errors'),
    _ = require('underscore'),
    context = {
        op: 'IoTAgentNGSI.DeviceProvisioning'
    },
    apply = async.apply,
    provisioningHandler,
    updateDeviceTemplate = require('../../templates/updateDevice.json'),
    createDeviceTemplate = require('../../templates/createDevice.json'),
    mandatoryHeaders = [
        'fiware-service',
        'fiware-servicepath'
    ],
    provisioningMiddlewares = [],
    provisioningAPITranslation = {
        /* jshint camelcase:false */

        name: 'id',
        service: 'service',
        service_path: 'subservice',
        entity_name: 'name',
        entity_type: 'type',
        timezone: 'timezone',
        protocol: 'protocol',
        transport: 'transport',
        endpoint: 'endpoint',
        attributes: 'active',
        commands: 'commands',
        lazy: 'lazy',
        internal_attributes: 'internalAttributes',
        static_attributes: 'staticAttributes'
    };

/**
 * Express middleware to handle incoming device provisioning requests. Every request is validated and handled to the
 * NGSI Service for the registration.
 */
function handleProvision(req, res, next) {

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
            var firstMiddleware = provisioningMiddlewares.slice(0, 1)[0],
                rest = provisioningMiddlewares.slice(1),
                executingMiddlewares = [apply(firstMiddleware, device)];

            executingMiddlewares = executingMiddlewares.concat(rest);

            async.waterfall(executingMiddlewares, callback);
        } else {
            callback(null, device);
        }
    }

    function fillDeviceData(service, subservice, body, callback) {
        /* jshint sub: true */

        callback(null, {
            id: body['device_id'],
            type: body['entity_type'],
            name: body['entity_name'],
            service: service,
            subservice: subservice,
            active: body['attributes'],
            staticAttributes: body['static_attributes'],
            lazy: body['lazy'],
            commands: body['commands'],
            timezone: body['timezone'],
            endpoint: body['endpoint'],
            internalAttributes: body['internal_attributes'],
            protocol: body['protocol'],
            transport: body['transport'],
            internalId: null
        });
    }

    function provisionSingleDevice(device, callback) {
        async.waterfall([
            apply(statsRegistry.add, 'deviceCreationRequests', 1),
            apply(restUtils.checkMandatoryQueryParams,
                ['device_id'], device),
            apply(fillDeviceData, req.headers['fiware-service'], req.headers['fiware-servicepath']),
            applyProvisioningMiddlewares,
            applyProvisioningHandler,
            deviceService.register
        ], callback);
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
        reverse: attribute.reverse,
        entity_name: attribute.entity_name,
        entity_type: attribute.entity_type
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
        service: device.service,
        service_path: device.subservice,
        entity_name: device.name,
        entity_type: device.type,
        timezone: device.timezone,
        endpoint: device.endpoint,
        transport: device.transport,
        attributes: (device.active) ? device.active.map(attributeToProvisioningAPIFormat) : undefined,
        lazy: (device.lazy) ? device.lazy.map(attributeToProvisioningAPIFormat) : undefined,
        commands: (device.commands) ? device.commands.map(attributeToProvisioningAPIFormat) : undefined,
        static_attributes: device.staticAttributes,
        internal_attributes: device.internalAttributes,
        protocol: device.protocol
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
                var response = deviceList;
                response.devices = deviceList.devices.map(toProvisioningAPIFormat);

                res.status(200).json(response);
            }
        });
}

/**
 * This middleware gets de device specified in the deviceId parameter of the URL from the registry and returns it in
 * JSON format.
 */
function handleGetDevice(req, res, next) {
    deviceService.getDevice(req.params.deviceId, req.headers['fiware-service'], req.headers['fiware-servicepath'],
        function(error, device) {
            if (error) {
                next(error);
            } else if (device) {
                res.status(200).json(toProvisioningAPIFormat(device));
            } else {
                next(new errors.DeviceNotFound(req.params.deviceId));
            }
        });
}

/**
 * This middleware handles the removal of a particular device specified with the deviceId.
 */
function handleRemoveDevice(req, res, next) {
    statsRegistry.add('deviceRemovalRequests', 1, function() {
        deviceService.unregister(req.params.deviceId, req.headers['fiware-service'], req.headers['fiware-servicepath'],
            function(error) {
                if (error) {
                    next(error);
                } else {
                    res.status(204).send();
                }
            });
    });
}

/**
 * This middleware handles updates in the provisioning devices. The only attribute
 */
function handleUpdateDevice(req, res, next) {
    if (req.body.deviceId) {
        next(new errors.BadRequest('Can\'t change the ID of a preprovisioned device'));
    } else {
        deviceService.getDevice(req.params.deviceId, req.headers['fiware-service'], req.headers['fiware-servicepath'],
            function(error, device) {
                if (error) {
                    next(error);
                } else if (device) {
                    var pairs = _.pairs(req.body),
                        newDevice = _.clone(device);

                    for (var i in pairs) {
                        newDevice[provisioningAPITranslation[pairs[i][0]]] = pairs[i][1];
                    }

                    deviceService.updateRegister(newDevice, function handleDeviceUpdate(error) {
                        if (error) {
                            next(error);
                        } else {
                            res.status(204).json({});
                        }
                    });
                } else {
                    next(new errors.DeviceNotFound(req.params.deviceId));
                }
            });
    }
}

/**
 * Load the routes related to device provisioning in the Express App.
 *
 * @param {Object} router      Express request router object.
 */
function loadContextRoutes(router) {
    router.post('/iot/devices',
        restUtils.checkRequestAttributes('headers', mandatoryHeaders),
        restUtils.checkBody(createDeviceTemplate),
        handleProvision
    );

    router.get('/iot/devices',
        restUtils.checkRequestAttributes('headers', mandatoryHeaders),
        handleListDevices
    );

    router.get('/iot/devices/:deviceId',
        restUtils.checkRequestAttributes('headers', mandatoryHeaders),
        handleGetDevice
    );

    router.put('/iot/devices/:deviceId',
        restUtils.checkRequestAttributes('headers', mandatoryHeaders),
        restUtils.checkBody(updateDeviceTemplate),
        handleUpdateDevice
    );

    router.delete('/iot/devices/:deviceId',
        restUtils.checkRequestAttributes('headers', mandatoryHeaders),
        handleRemoveDevice
    );
}

function setProvisioningHandler(newHandler) {
    provisioningHandler = newHandler;
}

function addDeviceProvisionMiddleware(newHandler) {
    provisioningMiddlewares.push(newHandler);
}

function clear(callback) {
    provisioningMiddlewares = [];
    provisioningHandler = null;
    callback();
}

exports.loadContextRoutes = intoTrans(context, loadContextRoutes);
exports.setProvisioningHandler = intoTrans(context, setProvisioningHandler);
exports.addDeviceProvisionMiddleware = addDeviceProvisionMiddleware;
exports.clear = clear;
