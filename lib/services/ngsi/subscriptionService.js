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

const intoTrans = require('../common/domain').intoTrans;
const context = {
    op: 'IoTAgentNGSI.SubscriptionService'
};
const config = require('../../commonConfig');

let subscriptionHandler;

/**
 * Loads the correct subscription handler based on the current config.
 */
function init() {
    if (config.checkNgsiLD()) {
        subscriptionHandler = require('./subscription-NGSI-LD');
    } else if (config.checkNgsi2()) {
        subscriptionHandler = require('./subscription-NGSI-v2');
    } else {
        subscriptionHandler = require('./subscription-NGSI-v1');
    }
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
    subscriptionHandler.subscribe(device, triggers, content, callback);
}

/**
 * Remove the subscription with the given ID from the Context Broker and from the device repository.
 *
 * @param {Object} device       Object containing all the information about a particular device.
 * @param {String} id           ID of the subscription to remove.
 */
function unsubscribe(device, id, callback) {
    subscriptionHandler.unsubscribe(device, id, callback);
}

exports.subscribe = intoTrans(context, subscribe);
exports.unsubscribe = intoTrans(context, unsubscribe);
exports.init = init;
