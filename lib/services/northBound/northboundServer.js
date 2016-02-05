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
    express = require('express'),
    packageInformation = require('../../../package.json'),
    northboundServer,
    contextServer = require('./contextServer'),
    deviceProvisioning = require('./deviceProvisioningServer'),
    groupProvisioning = require('./deviceGroupAdministrationServer'),
    logger = require('logops'),
    utils = require('./restUtils'),
    iotaInformation,
    context = {
        op: 'IoTAgentNGSI.NorthboundServer'
    },
    bodyParser = require('body-parser');

function handleError(error, req, res, next) {
    var code = 500;

    logger.debug(context, 'Error [%s] handing request: %s', error.name, error.message);

    if (error.code && String(error.code).match(/^[2345]\d\d$/)) {
        code = error.code;
    }

    res.status(code).json({
        name: error.name,
        message: error.message
    });
}

function traceRequest(req, res, next) {
    logger.debug(context, 'Request for path [%s] from [%s]', req.path, req.get('host'));

    if (req.is('json')) {
        logger.debug(context, 'Body:\n\n%s\n\n', JSON.stringify(req.body, null, 4));
    } else if (req.is('xml')) {
        logger.debug(context, 'Body:\n\n%s\n\n', req.rawBody);
    } else {
        logger.debug(context, 'Unrecognized body type', req.headers['content-type']);
    }

    next();
}

function retrieveVersion(req, res, next) {
    res.status(200).json(iotaInformation);
}

function start(config, callback) {
    var baseRoot = '/';

    northboundServer = {
        server: null,
        app: express(),
        router: express.Router()
    };

    logger.info(context, 'Starting IoT Agent listening on port [%s]', config.server.port);
    logger.debug(context, 'Using config:\n\n%s\n', JSON.stringify(config, null, 4));

    northboundServer.app.set('port', config.server.port);
    northboundServer.app.set('host', '0.0.0.0');
    northboundServer.app.use(utils.xmlRawBody);
    northboundServer.app.use(bodyParser.json());

    if (config.logLevel && config.logLevel === 'DEBUG') {
        northboundServer.app.use(traceRequest);
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

    northboundServer.router.get('/iot/about', retrieveVersion);

    northboundServer.app.use(baseRoot, northboundServer.router);
    contextServer.loadContextRoutes(northboundServer.router);
    deviceProvisioning.loadContextRoutes(northboundServer.router);
    groupProvisioning.loadContextRoutes(northboundServer.router);

    northboundServer.app.use(handleError);

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

exports.setUpdateHandler = contextServer.setUpdateHandler;
exports.setQueryHandler = contextServer.setQueryHandler;
exports.setCommandHandler = contextServer.setCommandHandler;
exports.setNotificationHandler = contextServer.setNotificationHandler;
exports.setConfigurationHandler = groupProvisioning.setConfigurationHandler;
exports.setProvisioningHandler = deviceProvisioning.setProvisioningHandler;
exports.start = start;
exports.stop = stop;

