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

var http = require('http'),
    express = require('express'),
    northboundServer,
    contextServer = require('./contextServer'),
    deviceProvisioning = require('./deviceProvisioningServer'),
    logger = require('fiware-node-logger');

function handleError(error, req, res, next) {
    switch (error.name) {
        default:
            res.json(500, {
                message: error
            });
    }
}

function traceRequest(req, res, next) {
    logger.debug('Request for path [%s] from [%s]', req.path, req.get('host'));
    logger.debug('Body:\n\n%s\n\n', JSON.stringify(req.body, null, 4));

    next();
}

function start(config, callback) {
    northboundServer = {
        server: null,
        app: express()
    };

    logger.info('Starting IoT Agent listening on port [%s]', config.server.port);
    logger.debug('Using config:\n\n%s\n', JSON.stringify(config, null, 4));

    northboundServer.app.set('port', config.server.port);
    northboundServer.app.set('host', '0.0.0.0');
    northboundServer.app.use(express.json());
    northboundServer.app.use(express.urlencoded());

    if (config.logLevel && config.logLevel === 'DEBUG') {
        northboundServer.app.use(traceRequest);
    }

    contextServer.loadContextRoutes(northboundServer.app);
    deviceProvisioning.loadContextRoutes(northboundServer.app);

    northboundServer.app.use(handleError);

    northboundServer.server = http.createServer(northboundServer.app);

    northboundServer.server.listen(northboundServer.app.get('port'), northboundServer.app.get('host'), callback);
}

function stop(callback) {
    logger.info('Stopping IoT Agent');

    northboundServer.server.close(callback);
}

exports.setUpdateHandler = contextServer.setUpdateHandler;
exports.setQueryHandler = contextServer.setQueryHandler;
exports.start = start;
exports.stop = stop;

