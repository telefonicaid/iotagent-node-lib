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

var http = require('http'),
    async = require('async'),
    express = require('express'),
    packageInformation = require('../../../package.json'),
    northboundServer,
    contextServer = require('./contextServer'),
    domainUtils = require('../common/domain'),
    middlewares = require('../common/genericMiddleware'),
    intoTrans = domainUtils.intoTrans,
    deviceProvisioning = require('./deviceProvisioningServer'),
    groupProvisioning = require('./deviceGroupAdministrationServer'),
    logger = require('logops'),
    utils = require('./restUtils'),
    context = {
        op: 'IoTAgentNGSI.NorthboundServer'
    },
    bodyParser = require('body-parser');

function start(config, callback) {
    var baseRoot = '/',
        iotaInformation;

    northboundServer = {
        server: null,
        app: express(),
        router: express.Router()
    };

    logger.info(context, 'Starting IoT Agent listening on port [%s]', config.server.port);
    logger.debug(context, 'Using config:\n\n%s\n', JSON.stringify(config, null, 4));

    northboundServer.app.set('port', config.server.port);
    northboundServer.app.set('host', config.server.host || '0.0.0.0');
    northboundServer.app.use(domainUtils.requestDomain);
    northboundServer.app.use(utils.xmlRawBody);
    northboundServer.app.use(bodyParser.json());

    if (config.logLevel && config.logLevel === 'DEBUG') {
        northboundServer.app.use(middlewares.traceRequest);
    }

    if (config.server.baseRoot) {
        baseRoot = config.server.baseRoot;
    }

    iotaInformation = {
        libVersion: packageInformation.version,
        port: config.server.port,
        baseRoot: baseRoot
    };

    if (config.iotaVersion) {
        iotaInformation.version = config.iotaVersion;
    }

    middlewares.setIotaInformation(iotaInformation);

    northboundServer.router.get('/iot/about', middlewares.retrieveVersion);
    northboundServer.router.get('/version', middlewares.retrieveVersion);
    northboundServer.router.put('/admin/log', middlewares.changeLogLevel);
    northboundServer.router.get('/admin/log', middlewares.getLogLevel);

    northboundServer.app.use(baseRoot, northboundServer.router);
    contextServer.loadContextRoutes(northboundServer.router);
    deviceProvisioning.loadContextRoutes(northboundServer.router);
    groupProvisioning.loadContextRoutes(northboundServer.router);

    northboundServer.app.use(middlewares.handleError);

    northboundServer.server = http.createServer(northboundServer.app);

    northboundServer.server.listen(northboundServer.app.get('port'), northboundServer.app.get('host'), callback);
}

function stop(callback) {
    logger.info(context, 'Stopping IoT Agent');

    if (northboundServer) {
        northboundServer.server.close(callback);
    } else {
        callback();
    }
}

function clear(callback) {
    async.series([
        deviceProvisioning.clear,
        groupProvisioning.clear,
        contextServer.clear
    ], callback);
}

exports.setUpdateHandler = intoTrans(context, contextServer.setUpdateHandler);
exports.setQueryHandler = intoTrans(context, contextServer.setQueryHandler);
exports.setCommandHandler = intoTrans(context, contextServer.setCommandHandler);
exports.setNotificationHandler = intoTrans(context, contextServer.setNotificationHandler);
exports.setConfigurationHandler = intoTrans(context, groupProvisioning.setConfigurationHandler);
exports.setProvisioningHandler = intoTrans(context, deviceProvisioning.setProvisioningHandler);
exports.addDeviceProvisionMiddleware = deviceProvisioning.addDeviceProvisionMiddleware;
exports.addConfigurationProvisionMiddleware = groupProvisioning.addConfigurationProvisionMiddleware;
exports.addNotificationMiddleware = contextServer.addNotificationMiddleware;
exports.clear = clear;
exports.start = intoTrans(context, start);
exports.stop = intoTrans(context, stop);
