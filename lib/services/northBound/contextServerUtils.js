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

const async = require('async');
const apply = async.apply;
const constants = require('../../constants');
const config = require('../../commonConfig');
const ngsi = require('../ngsi/ngsiService');
const commands = require('../commands/commandService');

/**
 * Returns the Current Tenant  defined for the NGSI-LD Broker. Tenant is based on the request
 * Headers - default to using the new NGSILD-Tenant header, fallback to the v2 fiware-service header
 * and finally see if the config holds a defined tenant. Not all brokers are currently
 * obliged to offer service headers - this is still being defined in the NGSI-LD specifications.
 *
 * @param {Object} req              Request that was handled in first place.
 * @return {String}                 The Tenant decribed in the request headers
 */
function getLDTenant(req) {
    if (req.headers['ngsild-tenant']) {
        return req.headers['ngsild-tenant'];
    } else if (req.headers['fiware-service']) {
        return req.headers['fiware-service'];
    }
    return config.getConfig().contextBroker.fallbackTenant;
}

/**
 * Returns the Current Path defined for the NGSI-LD Broker. Tenant is based on the request
 * Headers - default to using the new NGSILD Path header, fallback to the v2 fiware-servicepath header
 * see if the config holds a defined servicepath and finally try slashs. Not all brokers are currently
 * obliged to offer service headers - this is still being defined in the NGSI-LD specifications.
 */
function getLDPath(req) {
    if (req.headers['ngsild-path']) {
        return req.headers['ngsild-path'];
    } else if (req.headers['fiware-servicepath']) {
        return req.headers['fiware-servicepath'];
    }
    return config.getConfig().contextBroker.fallbackPath;
}

/**
 * Retrieve the Device that corresponds to a Context Update, and execute the update side effects
 * if there were any (e.g.: creation of attributes related to comands).
 *
 * @param {String} device           Object that contains all the information about the device.
 * @param {String} id               Entity ID of the device to find.
 * @param {String} type             Type of the device to find.
 * @param {String} service          Service of the device.
 * @param {String} subservice       Subservice of the device.
 * @param {Array}  attributes       List of attributes to update with their types and values.
 */
function executeUpdateSideEffects(device, id, type, service, subservice, attributes, callback) {
    const sideEffects = [];

    if (device.commands) {
        for (let i = 0; i < device.commands.length; i++) {
            for (let j = 0; j < attributes.length; j++) {
                if (device.commands[i].name === attributes[j].name) {
                    const newAttributes = [
                        {
                            name: device.commands[i].name + '_status',
                            type: constants.COMMAND_STATUS,
                            value: 'PENDING'
                        }
                    ];

                    sideEffects.push(
                        apply(ngsi.update, device.name, device.type, device.apikey, newAttributes, device)
                    );
                }
            }
        }
    }

    async.series(sideEffects, callback);
}

/**
 * Extract all the commands from the attributes section and add them to the Commands Queue.
 *
 * @param {String} device           Object that contains all the information about the device.
 * @param {String} id               Entity ID of the device to find.
 * @param {String} type             Type of the device to find.
 * @param {String} service          Service of the device.
 * @param {String} subservice       Subservice of the device.
 * @param {Array}  attributes       List of attributes to update with their types and values.
 */
function pushCommandsToQueue(device, id, type, service, subservice, attributes, callback) {
    async.map(attributes, apply(commands.add, service, subservice, device.id), callback);
}

exports.notificationMiddlewares = [];
exports.updateHandler = null;
exports.commandHandler = null;
exports.queryHandler = null;
exports.notificationHandler = null;
exports.executeUpdateSideEffects = executeUpdateSideEffects;
exports.pushCommandsToQueue = pushCommandsToQueue;
exports.getLDTenant = getLDTenant;
exports.getLDPath = getLDPath;
