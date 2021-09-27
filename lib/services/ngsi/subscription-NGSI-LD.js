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
 * Modified by: Jason Fox - FIWARE Foundation
 */

const errors = require('../../errors');
const logger = require('logops');
const config = require('../../commonConfig');
const utils = require('../northBound/restUtils');
const context = {
    op: 'IoTAgentNGSI.Subscription-LD'
};

/**
 * Generate a new subscription request handler using NGSI-LD, based on the device and triggers given to the function.
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {Object} triggers     Array with the names of the attributes that would trigger the subscription.
 * @param {Boolean} store       If set, store the subscription result in the device. Otherwise, return the ID.
 * @param {Function} callback   Callback to be called when the subscription handler ends.
 * @return {Function}           Returns a request handler for the given data.
 */
function createSubscriptionHandlerNgsiLD(device, triggers, store, callback) {
    return function (error, response, body) {
        if (error) {
            logger.debug(
                context,
                'Transport error found subscribing device with id [%s] to entity [%s]',
                device.id,
                device.name
            );

            callback(error);
        } else if (response.statusCode !== 200 && response.statusCode !== 201) {
            logger.debug(
                context,
                'Unknown error subscribing device with id [%s] to entity [%s]: $s',
                response.statusCode
            );

            callback(
                new errors.EntityGenericError(
                    device.name,
                    device.type,
                    {
                        details: body
                    },
                    response.statusCode
                )
            );
        } else if (body && body.orionError) {
            logger.debug(
                context,
                'Orion found subscribing device with id [%s] to entity [%s]: %s',
                device.id,
                device.name,
                body.orionError
            );

            callback(new errors.BadRequest(body.orionError.details));
        } else if (store) {
            if (!device.subscriptions) {
                device.subscriptions = [];
            }

            device.subscriptions.push({
                id: response.headers.location.substr(response.headers.location.lastIndexOf('/') + 1),
                triggers
            });

            config.getRegistry().update(device, callback);
        } else {
            callback(null, response.headers.location);
        }
    };
}

/**
 * Makes a subscription for the given device's entity using NGSI-LD, triggered by the given attributes.
 * The contents of the notification can be selected using the "content" array (that can be left blank
 * to notify the complete entity).
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {Object} triggers     Array with the names of the attributes that would trigger the subscription
 * @param {Object} content      Array with the names of the attributes to retrieve in the notification.
 */
function subscribeNgsiLD(device, triggers, content, callback) {
    const options = {
        method: 'POST',
        headers: {
            'fiware-service': device.service,
            'fiware-servicepath': device.subservice,
            'NGSILD-Tenant': device.service,
            'NGSILD-Path': device.subservice,
            'Content-Type': 'application/ld+json'
        },
        json: {
            '@context': config.getConfig().contextBroker.jsonLdContext,
            type: 'Subscription',
            entities: [
                {
                    id: device.name,
                    type: device.type
                }
            ],

            watchedAttributes: triggers,
            notification: {
                endpoint: {
                    uri: config.getConfig().providerUrl + '/notify',
                    accept: 'application/json'
                },
                attributes: content || [],
                format: 'normalized'
            }
        }
    };

    let store = true;

    if (content) {
        store = false;
    }

    if (device.cbHost && device.cbHost.indexOf('://') !== -1) {
        options.uri = device.cbHost + '/ngsi-ld/v1/subscriptions/';
    } else if (device.cbHost && device.cbHost.indexOf('://') === -1) {
        options.uri = 'http://' + device.cbHost + '/ngsi-ld/v1/subscriptions/';
    } else {
        options.uri = config.getConfig().contextBroker.url + '/ngsi-ld/v1/subscriptions/';
    }
    utils.executeWithSecurity(options, device, createSubscriptionHandlerNgsiLD(device, triggers, store, callback));
}

/**
 * Generate a new unsubscription request handler using NGSI-LD, based on the device and subscription ID
 * given to the function.
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {String} id           ID of the subscription to remove.
 * @param {Function} callback   Callback to be called when the subscription handler ends.
 * @return {Function}           Returns a request handler for the given data.
 */
function createUnsubscribeHandlerNgsiLD(device, id, callback) {
    return function (error, response, body) {
        if (error) {
            logger.debug(
                context,
                'Transport error found subscribing device with id [%s] to entity [%s]',
                device.id,
                device.name
            );

            callback(error);
        } else if (response.statusCode !== 204) {
            logger.debug(
                context,
                'Unknown error subscribing device with id [%s] to entity [%s]: $s',
                response.statusCode
            );

            callback(
                new errors.EntityGenericError(
                    device.name,
                    device.type,
                    {
                        details: body
                    },
                    response.statusCode
                )
            );
        } else if (body && body.orionError) {
            logger.debug(
                context,
                'Orion found subscribing device with id [%s] to entity [%s]: %s',
                device.id,
                device.name,
                body.orionError
            );

            callback(new errors.BadRequest(body.orionError.details));
        } else {
            device.subscriptions.splice(device.subscriptions.indexOf(id), 1);
            config.getRegistry().update(device, callback);
        }
    };
}

/**
 * Remove the subscription with the given ID from the Context Broker and from the device repository using NGSI-LD.
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {String} id           ID of the subscription to remove.
 */
function unsubscribeNgsiLD(device, id, callback) {
    const options = {
        method: 'DELETE',
        headers: {
            'fiware-service': device.service,
            'fiware-servicepath': device.subservice,
            'NGSILD-Tenant': device.service,
            'NGSILD-Path': device.subservice
        }
    };

    if (device.cbHost && device.cbHost.indexOf('://') !== -1) {
        options.uri = device.cbHost + '/ngsi-ld/v1/subscriptions/' + id;
    } else if (device.cbHost && device.cbHost.indexOf('://') === -1) {
        options.uri = 'http://' + device.cbHost + '/ngsi-ld/v1/subscriptions/' + id;
    } else {
        options.uri = config.getConfig().contextBroker.url + '/ngsi-ld/v1/subscriptions/' + id;
    }
    utils.executeWithSecurity(options, device, createUnsubscribeHandlerNgsiLD(device, id, callback));
}

exports.subscribe = subscribeNgsiLD;
exports.unsubscribe = unsubscribeNgsiLD;
