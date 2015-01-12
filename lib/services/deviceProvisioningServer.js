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
    ngsi = require('./ngsiService'),
    logger = require('fiware-node-logger'),
    context = {
        op: 'IoTAgentNGSI.DeviceProvisioning'
    },
    apply = async.apply;

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
            res.status(200).json({});
        }
    }

    function registerDevice(body, callback) {
        /*jshint sub:true */
        ngsi.register(
            body['name'],
            body['entity_type'],
            body['entity_name'],
            body['service'],
            body['service_path'],
            body['commands'],
            null,
            callback);
    }

    logger.debug('Handling device provisioning request.');

    async.waterfall([
        apply(restUtils.checkMandatoryQueryParams,
            ['name', 'entity_type', 'service', 'service_path', 'commands'], req.body),
        registerDevice
    ], handleProvisioningFinish);
}

/**
 * Load the routes related to device provisioning in the Express App.
 *
 * @param {Object} router      Express request router object.
 */
function loadContextRoutes(router) {
    router.post('/iot/devices', handleProvision);
}

exports.loadContextRoutes = loadContextRoutes;
