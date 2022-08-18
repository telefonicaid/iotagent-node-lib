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
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */

const async = require('async');
const apply = async.apply;
const _ = require('underscore');
const parser = require('./expressionPlugin');
const logger = require('logops');
const config = require('../commonConfig');
const subscriptions = require('../services/ngsi/subscriptionService');
const deviceService = require('../services/devices/deviceService');
const context = {
    op: 'IoTAgentNGSI.BidirectionalPlugin'
};

/**
 * Extract a list of all the bidirectional attributes (those containing reverse expressions) from a device object.
 * If the device belongs to a Configuration Group, its attributes are also considered.
 *
 * @param {Object} device           Device data object.
 * @param {Object} group            Configuration Group data object.
 */
function extractBidirectionalAttributes(device, group, callback) {
    let attributeList;

    function isBidirectional(item) {
        return item.reverse;
    }

    if (device.active) {
        attributeList = device.active.filter(isBidirectional);
    } else {
        attributeList = [];
    }

    if (group && group.attributes) {
        attributeList = attributeList.concat(group.attributes.filter(isBidirectional));
    }

    logger.debug(context, 'Extracting attribute list');

    callback(null, attributeList);
}

/**
 * Extract all the variables that exists in the collection of reverse attribute expressions of an attribute.
 *
 * @param {Object} item         Attribute with a collection of reverse expressions.
 * @return {Array}              List of variables in all the collection of reverse expressions.
 */
function extractVariables(item) {
    let variables;

    function extractFromExpression(value) {
        if (value.expression) {
            return value.expression.match(/@[a-zA-Z]+/g).map(function (item) {
                return item.substr(1);
            });
        }
        return [];
    }

    if (item.reverse) {
        variables = _.uniq(_.flatten(item.reverse.map(extractFromExpression)));
    }

    logger.debug(context, 'Extracted variables: %j', variables);

    return variables;
}

/**
 * Send a subscription for each reverse attribute defined for a device.
 *
 * @param {Object} device           Device data object.
 * @param {Array} attributeList     List of active attributes for subscription.
 */
function sendSubscriptions(device, attributeList, callback) {
    function sendSingleSubscriptionNgsi2(item, innerCb) {
        const variables = extractVariables(item);

        subscriptions.subscribe(device, [item.name], variables, function handleSubscription(error, subId) {
            if (error) {
                innerCb(error);
            } else {
                innerCb(null, {
                    id: subId.substr(subId.lastIndexOf('/') + 1),
                    triggers: [item.name]
                });
            }
        });
    }

    logger.debug(context, 'Sending bidirectionality subscriptions for device [%s]', device.id);

    async.map(attributeList, sendSingleSubscriptionNgsi2, callback);
}

/**
 * Add the list of generated subscription IDs to the device object.
 *
 * @param {Array} subscriptionMaps      List of subscription IDs to be saved.
 * @param {Object} device               Device data object.
 * @return {Object}                     Modified device object.
 */
function updateDeviceWithSubscriptionIds(subscriptionMaps, device) {
    if (!device.subscriptions) {
        device.subscriptions = [];
    }

    device.subscriptions = device.subscriptions.concat(subscriptionMaps);

    return device;
}

/**
 * Middleware to handle incoming Configuration group provisions. Should check for the existence of reverse active
 * attributes and create subscriptions for the modifciation of those values.
 *
 * @param {Object} newGroup         Configuration Group data object.
 */
function handleGroupProvision(newGroup, callback) {
    callback(null, newGroup);
}

/**
 * Get a list of all the reverse transformations of a device that can be processed with the information reported by
 * the incoming notification.
 *
 * @param {Array} list          List of attributes to be checked
 * @param {Array} values        List of reported attributes (with their name, type and value).
 */
function getReverseTransformations(list, values, callback) {
    const availableData = _.pluck(values, 'name');
    let transformations = [];

    function getVariable(expression) {
        return expression.match(/@[a-zA-Z]+/g).map(function (item) {
            return item.substr(1);
        });
    }

    if (list && list.length > 0) {
        for (let i = 0; i < list.length; i++) {
            if (list[i].reverse && list[i].reverse.length > 0) {
                const expressions = _.pluck(list[i].reverse, 'expression');
                const variables = _.uniq(_.flatten(expressions.map(getVariable)));

                if (_.difference(variables, availableData).length === 0) {
                    transformations = transformations.concat(list[i].reverse);
                }
            }
        }
    }

    logger.debug(context, 'Got the following transformations: %j', transformations);

    callback(null, transformations);
}

/**
 * Apply a list of transformations to the reported values,
 * generating a new array of values with the additional data.
 * For NGSI-v2 this consists of value transformations only
 *
 * @param {Array} values                List of reported attributes (with their name, type and value).
 * @param {Array} transformations       List of transformations to apply (with their name, type and expression).
 * @param {Object} typeInformation      Provisioning information about the device represented by the entity.
 */
function processTransformationsNGSIv2(values, transformations, typeInformation, callback) {
    let cleanedExpression;
    const ctx = parser.extractContext(values, typeInformation);
    let resultTransformations = [];

    for (let j = 0; j < 2; j++) {
        if (transformations[j]) {
            resultTransformations = resultTransformations.concat(transformations[j]);
        }
    }

    for (let i = 0; i < resultTransformations.length; i++) {
        cleanedExpression = resultTransformations[i].expression.substr(
            2,
            resultTransformations[i].expression.length - 3
        );

        values.push({
            name: resultTransformations[i].object_id,
            type: resultTransformations[i].type,
            value: parser.parse(cleanedExpression, ctx, 'String', typeInformation)
        });
    }

    callback(null, values);
}

/**
 * Apply a list of transformations to the reported values,
 * generating a new array of values with the additional data.
 * For NGSI-LD the output includes value, metadata and datasetId
 *
 * @param {Array} values                List of reported attributes (with their name, type and value).
 * @param {Array} transformations       List of transformations to apply (with their name, type and expression).
 * @param {Object} typeInformation      Provisioning information about the device represented by the entity.
 */
function processTransformationsNGSILD(values, transformations, typeInformation, callback) {
    let cleanedExpression;
    const defaultValues = [];
    const datasetIds = {};

    // Split incoming values into those with and without datasetId
    values.forEach((value) => {
        if (value.datasetId) {
            datasetIds[value.datasetId] = datasetIds[value.datasetId] || [];
            datasetIds[value.datasetId].push(value);
        } else {
            defaultValues.push(value);
        }
    });

    let resultTransformations = [];

    for (let j = 0; j < 2; j++) {
        if (transformations[j]) {
            resultTransformations = resultTransformations.concat(transformations[j]);
        }
    }

    // Process Transformations using the default datasetId
    // This is the direct equivalent of the NGSI-v2 function
    if (!_.isEmpty(defaultValues)) {
        for (let i = 0; i < resultTransformations.length; i++) {
            cleanedExpression = resultTransformations[i].expression.substr(
                2,
                resultTransformations[i].expression.length - 3
            );
            values.push({
                name: resultTransformations[i].object_id,
                type: resultTransformations[i].type,
                metadata: {},
                value: parser.parse(
                    cleanedExpression,
                    parser.extractContext(defaultValues, typeInformation),
                    'String',
                    typeInformation
                )
            });
        }
    }

    // Process Transformations using an explicit datasetId
    // There is no equivalent with NGSI-v2
    _.keys(datasetIds).forEach((datasetId) => {
        for (let i = 0; i < resultTransformations.length; i++) {
            cleanedExpression = resultTransformations[i].expression.substr(
                2,
                resultTransformations[i].expression.length - 3
            );
            values.push({
                name: resultTransformations[i].object_id,
                type: resultTransformations[i].type,
                datasetId,
                metadata: {},
                value: parser.parse(
                    cleanedExpression,
                    parser.extractContext(datasetIds[datasetId], typeInformation),
                    'String',
                    typeInformation
                )
            });
        }
    });
    callback(null, values);
}

/**
 * Apply a list of transformations to the reported values, generating a new array of values with the additional data.
 *
 * @param {Array} values                List of reported attributes (with their name, type and value).
 * @param {Array} transformations       List of transformations to apply (with their name, type and expression).
 * @param {Object} typeInformation      Provisioning information about the device represented by the entity.
 */
function processTransformations(values, transformations, typeInformation, callback) {
    if (config.checkNgsiLD({})) {
        processTransformationsNGSILD(values, transformations, typeInformation, callback);
    } else {
        processTransformationsNGSIv2(values, transformations, typeInformation, callback);
    }
}

/**
 * Middleware to handle incoming Configuration group provisions. Should check for the existence of reverse active
 * attributes and create subscriptions for the modifciation of those values.
 *
 * @param {Object} device       Device data object.
 */
function handleDeviceProvision(device, callback) {
    deviceService.findConfigurationGroup(device, function (error, group) {
        if (error) {
            callback(error);
        } else {
            async.waterfall(
                [apply(extractBidirectionalAttributes, device, group), apply(sendSubscriptions, device)],
                function (error, subscriptionMaps) {
                    if (error) {
                        callback(error);
                    } else {
                        device = updateDeviceWithSubscriptionIds(subscriptionMaps, device);
                        callback(null, device);
                    }
                }
            );
        }
    });
}

/**
 * Handles an incoming notification, modifying the reported values if the device has any bidirectional expression
 * defined for its active attributes.
 *
 * @param {Object} device           Device data object.
 * @param {Array} values            List of notified values.
 */
function handleNotification(device, values, callback) {
    deviceService.findConfigurationGroup(device, function (error, group) {
        const deviceAttributes = device.active || [];
        const groupAttributes = (group && group.attributes) || [];

        if (deviceAttributes.length > 0 || groupAttributes.length > 0) {
            logger.debug(context, 'Processing active attributes notification');

            async.waterfall(
                [
                    apply(async.series, [
                        apply(getReverseTransformations, deviceAttributes, values),
                        apply(getReverseTransformations, groupAttributes, values)
                    ]),
                    apply(processTransformations, device, values)
                ],
                function (error, results) {
                    callback(error, device, results);
                }
            );
        } else {
            callback(null, device, values);
        }
    });
}

exports.deviceProvision = handleDeviceProvision;
exports.groupProvision = handleGroupProvision;
exports.notification = handleNotification;
