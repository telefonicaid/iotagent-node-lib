/*
 * Copyright 2020 Telefonica Investigación y Desarrollo, S.A.U
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
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 * Modified by: Jason Fox - FIWARE Foundation
 */
'use strict';

var intoTrans = require('../common/domain').intoTrans,
    config = require('../../commonConfig'),
    context = {
        op: 'IoTAgentNGSI.ContextServer'
    },
    contextServerUtils = require('./contextServerUtils'),
    ngsiv1 = require('./contextServer-NGSI-v1'),
    ngsiv2 = require('./contextServer-NGSI-v2'),
    ngsiLD = require('./contextServer-NGSI-LD');

/**
 * Sets the new user handler for Entity update requests. This handler will be called whenever an update request arrives
 * with the following parameters: (id, type, attributes, callback). The callback is in charge of updating the
 * corresponding values in the devices with the appropriate protocol.
 *
 * In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each
 * entity, and all the results will be combined into a single response.
 *
 * @param {Function} newHandler         User handler for update requests
 */
function setUpdateHandler(newHandler) {
    contextServerUtils.updateHandler = newHandler;
}

/**
 * Sets the new user handler for commadn execution requests. This handler will be called whenever an update request
 * arrives to a with the following parameters: (id, type, attributes, callback). The callback is in charge of updating
 * the corresponding values in the devices with the appropriate protocol.
 *
 * In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each
 * entity, and all the results will be combined into a single response.
 *
 * @param {Function} newHandler         User handler for update requests
 */
function setCommandHandler(newHandler) {
    contextServerUtils.commandHandler = newHandler;
}

/**
 * Sets the new user handler for Entity query requests. This handler will be called whenever an update request arrives
 * with the following parameters: (id, type, attributes, callback). The handler must retrieve all the corresponding
 * information from the devices and return a NGSI entity with the requested values.
 *
 * In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each
 * entity, and all the results will be combined into a single response.

 * @param {Function} newHandler         User handler for query requests
 */
function setQueryHandler(newHandler) {
    contextServerUtils.queryHandler = newHandler;
}

/**
 * Sets the new user handler for entity change notifications. This candler will be called for each notification in an
 * entity the IOTA is subscribed to.
 *
 * In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each
 * entity, and all the results will be combined into a single response.
 *
 * @param {Function} newHandler         User handler for incoming notifications
 *
 */
function setNotificationHandler(newHandler) {
    contextServerUtils.notificationHandler = newHandler;
}

/**
 * Load the routes related to context dispatching (NGSI10 calls).
 *
 * @param {Object} router      Express request router object.
 */
function loadContextRoutes(router) {
    if (config.checkNgsiLD()) {
        ngsiLD.loadContextRoutes(router);
    } else if (config.checkNgsi2()) {
        ngsiv2.loadContextRoutes(router);
    } else {
        ngsiv1.loadContextRoutes(router);
    }
}

function addNotificationMiddleware(newMiddleware) {
    contextServerUtils.notificationMiddlewares.push(newMiddleware);
}

function clear(callback) {
    contextServerUtils.notificationMiddlewares = [];
    contextServerUtils.notificationHandler = null;
    contextServerUtils.commandHandler = null;
    contextServerUtils.updateHandler = null;

    if (callback) {
        callback();
    }
}

exports.clear = clear;
exports.loadContextRoutes = intoTrans(context, loadContextRoutes);
exports.setUpdateHandler = intoTrans(context, setUpdateHandler);
exports.setCommandHandler = intoTrans(context, setCommandHandler);
exports.setNotificationHandler = intoTrans(context, setNotificationHandler);
exports.addNotificationMiddleware = intoTrans(context, addNotificationMiddleware);
exports.setQueryHandler = intoTrans(context, setQueryHandler);
