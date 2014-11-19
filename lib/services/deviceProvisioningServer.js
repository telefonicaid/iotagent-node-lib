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

var async = require('async'),
    restUtils = require('./restUtils'),
    ngsi = require('./ngsiService'),
    apply = async.apply;

function handleProvision(req, res, next) {
    function handleProvisioningFinish(error, results) {
        if (error) {
            next(error);
        } else {
            res.json(200, {});
        }
    }

    function registerDevice(body, callback) {
        /*jshint sub:true */
        ngsi.register(
            body['entity_name'],
            body['entity_type'],
            body['service'],
            body['service_path'],
            body['commands'],
            callback);
    }

    async.waterfall([
        apply(restUtils.checkMandatoryQueryParams,
            ['name', 'entity_type', 'service', 'service_path', 'commands'], req.body),
        registerDevice
    ], handleProvisioningFinish);
}

function loadContextRoutes(app, registry) {
    app.post('/iot/devices', handleProvision);
}

exports.loadContextRoutes = loadContextRoutes;
