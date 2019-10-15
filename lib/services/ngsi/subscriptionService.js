/*
 * Copyright 2016 Telefonica Investigación y Desarrollo, S.A.U
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
 * Modified by: Federico M. Facca - Martel Innovate
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */

'use strict';

var errors = require('../../errors'),
    intoTrans = require('../common/domain').intoTrans,
    logger = require('logops'),
    config = require('../../commonConfig'),
    deviceService = require('../devices/deviceService'),
    context = {
        op: 'IoTAgentNGSI.NGSIService'
    },
    moment = require('moment');


/**
 * Generate a new subscription request handler using NGSIv1, based on the device and triggers given to the function.
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {Object} triggers     Array with the names of the attributes that would trigger the subscription.
 * @param {Boolean} store       If set, store the subscription result in the device. Otherwise, return the ID.
 * @param {Function} callback   Callback to be called when the subscription handler ends.
 * @return {Function}           Returns a request handler for the given data.
 */
function createSubscriptionHandlerNgsi1(device, triggers, store, callback) {
    return function(error, response, body) {
        if (error || !body) {
            logger.debug(
                context,
                'Transport error found subscribing device with id [%s] to entity [%s]', device.id, device.name);

            callback(error);

        } else if (response.statusCode !== 200 && response.statusCode !== 201) {
            logger.debug(context, 'Unknown error subscribing device with id [%s] to entity [%s]: $s',
                response.statusCode);

            callback(new errors.EntityGenericError(device.name, device.type, {
                details: body
            }, response.statusCode));

        } else if (body && body.orionError) {
            logger.debug(
                context,
                'Orion found subscribing device with id [%s] to entity [%s]: %s',
                device.id, device.name, body.orionError);

            callback(new errors.BadRequest(body.orionError.details));
        } else if (store) {
            if (!device.subscriptions) {
                device.subscriptions = [];
            }

            device.subscriptions.push({
                id: body.subscribeResponse.subscriptionId,
                triggers: triggers
            });

            config.getRegistry().update(device, callback);
        } else {
            callback(null, body.subscribeResponse.subscriptionId);
        }
    };
}

/**
 * Generate a new subscription request handler using NGSIv2, based on the device and triggers given to the function.
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {Object} triggers     Array with the names of the attributes that would trigger the subscription.
 * @param {Boolean} store       If set, store the subscription result in the device. Otherwise, return the ID.
 * @param {Function} callback   Callback to be called when the subscription handler ends.
 * @return {Function}           Returns a request handler for the given data.
 */
function createSubscriptionHandlerNgsi2(device, triggers, store, callback) {
    return function(error, response, body) {
        if (error) {
            logger.debug(
                context,
                'Transport error found subscribing device with id [%s] to entity [%s]', device.id, device.name);

            callback(error);

        } else if (response.statusCode !== 200 && response.statusCode !== 201) {
            logger.debug(context, 'Unknown error subscribing device with id [%s] to entity [%s]: $s',
                response.statusCode);

            callback(new errors.EntityGenericError(device.name, device.type, {
                details: body
            }, response.statusCode));

        } else if (body && body.orionError) {
            logger.debug(
                context,
                'Orion found subscribing device with id [%s] to entity [%s]: %s',
                device.id, device.name, body.orionError);

            callback(new errors.BadRequest(body.orionError.details));
        } else if (store) {
            if (!device.subscriptions) {
                device.subscriptions = [];
            }

            device.subscriptions.push({
                id: response.headers.location.substr(response.headers.location.lastIndexOf('/') + 1),
                triggers: triggers
            });

            config.getRegistry().update(device, callback);
        } else {
            callback(null, response.headers.location);
        }
    };
}

/**
 * Makes a subscription for the given device's entity using NGSIv1, triggered by the given attributes.
 * The contents of the notification can be selected using the "content" array (that can be left blank
 * to notify the complete entity).
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {Object} triggers     Array with the names of the attributes that would trigger the subscription
 * @param {Object} content      Array with the names of the attributes to retrieve in the notification.
 */
function subscribeNgsi1(device, triggers, content, callback) {
    var options = {
        method: 'POST',
        headers: {
            'fiware-service': device.service,
            'fiware-servicepath': device.subservice
        },
        json: {
                entities: [
                    {
                        type: device.type,
                        isPattern: 'false',
                        id: device.name
                    }
                ],
                reference: config.getConfig().providerUrl + '/notify',
                duration: config.getConfig().deviceRegistrationDuration || 'P100Y',
                notifyConditions: [
                    {
                        type: 'ONCHANGE',
                        condValues: triggers
                    }
                ],
                throttling: config.getConfig().throttling
            }
        },
        store = true;

    if (content) {
        options.json.attributes = content;
        store = false;
    }

    if (device.cbHost && device.cbHost.indexOf('://') !== -1) {
        options.uri = device.cbHost + '/v1/subscribeContext';
    } else if (device.cbHost && device.cbHost.indexOf('://') === -1) {
        options.uri = 'http://' + device.cbHost + '/v1/subscribeContext';
    } else {
        options.uri = config.getConfig().contextBroker.url + '/v1/subscribeContext';
    }
    deviceService.executeWithSecurity(options,
        device, createSubscriptionHandlerNgsi1(device, triggers, store, callback));
}

/**
 * Makes a subscription for the given device's entity using NGSIv2, triggered by the given attributes.
 * The contents of the notification can be selected using the "content" array (that can be left blank
 * to notify the complete entity).
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {Object} triggers     Array with the names of the attributes that would trigger the subscription
 * @param {Object} content      Array with the names of the attributes to retrieve in the notification.
 */
function subscribeNgsi2(device, triggers, content, callback) {
   var options = {
        method: 'POST',
        headers: {
            'fiware-service': device.service,
            'fiware-servicepath': device.subservice
        },
        json: {
                subject:
                {
                    entities: [
                        {
                            id: device.name,
                            type: device.type
                        }
                    ],

                    condition: {
                        attrs: triggers
                    },
                },
                notification: {
                    http: {
                        url: config.getConfig().providerUrl + '/notify'
                    },
                    attrs: content || [],
                    attrsFormat: 'normalized'
                },
                throttling: moment.duration(config.getConfig().throttling).seconds()
        }
    };

    if (config.getConfig().deviceRegistrationDuration) {
        options.json.expires = moment().add(moment.duration(config.getConfig().deviceRegistrationDuration));
    }

    var store = true;

    if (content) {
        store = false;
    }

    if (device.cbHost && device.cbHost.indexOf('://') !== -1) {
        options.uri = device.cbHost + '/v2/subscriptions';
    } else if (device.cbHost && device.cbHost.indexOf('://') === -1) {
        options.uri = 'http://' + device.cbHost + '/v2/subscriptions';
    } else {
        options.uri = config.getConfig().contextBroker.url + '/v2/subscriptions';
    }
    deviceService.executeWithSecurity(options,
        device, createSubscriptionHandlerNgsi2(device, triggers, store, callback));
}

/**
 * Makes a subscription for the given device's entity, triggered by the given attributes.
 * The contents of the notification can be selected using the "content" array (that can be left blank
 * to notify the complete entity).
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {Object} triggers     Array with the names of the attributes that would trigger the subscription
 * @param {Object} content      Array with the names of the attributes to retrieve in the notification.
 */
function subscribe(device, triggers, content, callback) {
    if (config.checkNgsi2()) {
        subscribeNgsi2(device, triggers, content, callback);
    } else {
        subscribeNgsi1(device, triggers, content, callback);
    }
}

/**
 * Generate a new unsubscription request handler using NGSIv1, based on the device and subscription ID
 * given to the function.
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {String} id           ID of the subscription to remove.
 * @param {Function} callback   Callback to be called when the subscription handler ends.
 * @return {Function}           Returns a request handler for the given data.
 */
function createUnsubscribeHandlerNgsi1(device, id, callback) {
    return function(error, response, body) {
        if (error || !body) {
            logger.debug(
                context,
                'Transport error found subscribing device with id [%s] to entity [%s]', device.id, device.name);

            callback(error);

        } else if (response.statusCode !== 200 && response.statusCode !== 201) {
            logger.debug(
                context,
                'Unknown error subscribing device with id [%s] to entity [%s]: $s',
                response.statusCode);

            callback(new errors.EntityGenericError(device.name, device.type, {
                details: body
            }, response.statusCode));

        } else if (body && body.orionError) {
            logger.debug(
                context,
                'Orion found subscribing device with id [%s] to entity [%s]: %s',
                device.id, device.name, body.orionError);

            callback(new errors.BadRequest(body.orionError.details));
        } else {
            device.subscriptions.splice(device.subscriptions.indexOf(id), 1);
            config.getRegistry().update(device, callback);
        }
    };
}

/**
 * Generate a new unsubscription request handler using NGSIv2, based on the device and subscription ID
 * given to the function.
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {String} id           ID of the subscription to remove.
 * @param {Function} callback   Callback to be called when the subscription handler ends.
 * @return {Function}           Returns a request handler for the given data.
 */
function createUnsubscribeHandlerNgsi2(device, id, callback) {
    return function(error, response, body) {
        if (error) {
            logger.debug(
                context,
                'Transport error found subscribing device with id [%s] to entity [%s]', device.id, device.name);

            callback(error);

        } else if (response.statusCode !== 204) {
            logger.debug(
                context,
                'Unknown error subscribing device with id [%s] to entity [%s]: $s',
                response.statusCode);

            callback(new errors.EntityGenericError(device.name, device.type, {
                details: body
            }, response.statusCode));

        } else if (body && body.orionError) {
            logger.debug(
                context,
                'Orion found subscribing device with id [%s] to entity [%s]: %s',
                device.id, device.name, body.orionError);

            callback(new errors.BadRequest(body.orionError.details));
        } else {
            device.subscriptions.splice(device.subscriptions.indexOf(id), 1);
            config.getRegistry().update(device, callback);
        }
    };
}

/**
 * Remove the subscription with the given ID from the Context Broker and from the device repository using NGSIv1.
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {String} id           ID of the subscription to remove.
 */
function unsubscribeNgsi1(device, id, callback) {
    var options = {
        method: 'POST',
        headers: {
            'fiware-service': device.service,
            'fiware-servicepath': device.subservice
        },
        json: {
            subscriptionId: id
        }

    };

    if (device.cbHost && device.cbHost.indexOf('://') !== -1) {
        options.uri = device.cbHost + '/v1/unsubscribeContext';
    } else if (device.cbHost && device.cbHost.indexOf('://') === -1) {
        options.uri = 'http://' + device.cbHost + '/v1/unsubscribeContext';
    } else {
        options.uri = config.getConfig().contextBroker.url + '/v1/unsubscribeContext';
    }
    deviceService.executeWithSecurity(options, device, createUnsubscribeHandlerNgsi1(device, id, callback));
}

/**
 * Remove the subscription with the given ID from the Context Broker and from the device repository using NGSIv2.
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {String} id           ID of the subscription to remove.
 */
function unsubscribeNgsi2(device, id, callback) {
    var options = {
        method: 'DELETE',
        headers: {
            'fiware-service': device.service,
            'fiware-servicepath': device.subservice
        }
    };

    if (device.cbHost && device.cbHost.indexOf('://') !== -1) {
        options.uri = device.cbHost + '/v2/subscriptions/' + id;
    } else if (device.cbHost && device.cbHost.indexOf('://') === -1) {
        options.uri = 'http://' + device.cbHost + '/v2/subscriptions/' + id;
    } else {
        options.uri = config.getConfig().contextBroker.url + '/v2/subscriptions/' + id;
    }
    deviceService.executeWithSecurity(options, device, createUnsubscribeHandlerNgsi2(device, id, callback));
}

/**
 * Remove the subscription with the given ID from the Context Broker and from the device repository.
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {String} id           ID of the subscription to remove.
 */
function unsubscribe(device, id, callback) {
    if (config.checkNgsi2()) {
        unsubscribeNgsi2(device, id, callback);
    } else {
        unsubscribeNgsi1(device, id, callback);
    }
}

exports.subscribe = intoTrans(context, subscribe);
exports.unsubscribe = intoTrans(context, unsubscribe);
