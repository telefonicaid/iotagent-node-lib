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
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 */

'use strict';

var async = require('async'),
    apply = async.apply,
    _ = require('underscore'),
    subscriptions = require('../services/ngsi/subscriptionService');

function extractBidirectionalAttributes(device, callback) {
    var attributeList;

    function isBidirectional(item) {
        return item.reverse;
    }

    if (device.active) {
        attributeList = device.active.filter(isBidirectional);
    } else {
        attributeList = [];
    }

    callback(null, attributeList);
}

function extractVariables(item) {
    var variables;

    function extractFromExpression(value) {
        if (value.expression) {
            return value.expression.match(/@[a-zA-Z]+/g).map(function(item) {
                return item.substr(1);
            });
        } else {
            return [];
        }
    }

    if (item.reverse) {
        variables = _.uniq(_.flatten(item.reverse.map(extractFromExpression)));
    }

    return variables;
}

function sendSubscriptions(device, attributeList, callback) {

    function sendSingleSubscription(item, innerCb) {
        var variables = extractVariables(item);

        subscriptions.subscribe(device, [item.name], variables, function handleSubscription(error, subId) {
            if (error) {
                innerCb(error);
            } else {
                innerCb(null, {
                    id: subId,
                    triggers: [item.name]
                });
            }
        });
    }

    async.map(attributeList, sendSingleSubscription, callback);
}

function updateDeviceWithSubscriptionIds(subscriptionMaps, device) {
    if (!device.subscriptions) {
        device.subscriptions = [];
    }

    device.subscriptions = device.subscriptions.concat(subscriptionMaps);

    return device;
}

function handleDeviceProvision(device, callback) {
    async.waterfall([
        apply(extractBidirectionalAttributes, device),
        apply(sendSubscriptions, device)
    ], function(error, subscriptionMaps) {
        if (error) {
            callback(error);
        } else {
            device = updateDeviceWithSubscriptionIds(subscriptionMaps, device);
            callback(null, device);
        }
    });
}

function handleGroupProvision(newGroup, callback) {
    callback(null, newGroup);
}

exports.deviceProvision = handleDeviceProvision;
exports.groupProvision = handleGroupProvision;

