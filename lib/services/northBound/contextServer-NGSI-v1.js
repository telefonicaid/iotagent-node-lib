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

var async = require('async'),
    apply = async.apply,
    logger = require('logops'),
    errors = require('../../errors'),
    deviceService = require('../devices/deviceService'),
    middlewares = require('../common/genericMiddleware'),
    _ = require('underscore'),
    context = {
        op: 'IoTAgentNGSI.ContextServer-v1'
    },
    updateContextTemplateNgsi1 = require('../../templates/updateContextNgsi1.json'),
    queryContextTemplate = require('../../templates/queryContext.json'),
    notificationTemplateNgsi1 = require('../../templates/notificationTemplateNgsi1.json'),
    contextServerUtils = require('./contextServerUtils');

const updatePaths = ['/v1/updateContext', '/NGSI10/updateContext', '//updateContext'];
const queryPaths = ['/v1/queryContext', '/NGSI10/queryContext', '//queryContext'];
/**
 * Generate all the update actions corresponding to a update context request using Ngsi1.
 * Update actions include updates in attributes and execution of commands. This action will
 * be called once per Context Element in the request.
 *
 * @param {Object} req                  Update request to generate Actions from
 * @param {Object} contextElement       Context Element whose actions will be extracted.
 */
function generateUpdateActionsNgsi1(req, contextElement, callback) {
    function splitUpdates(device, callback) {
        var attributes = [],
            commands = [],
            found;

        if (device.commands) {
            attributeLoop: for (var i in contextElement.attributes) {
                for (var j in device.commands) {
                    if (contextElement.attributes[i].name === device.commands[j].name) {
                        commands.push(contextElement.attributes[i]);
                        found = true;
                        continue attributeLoop;
                    }
                }

                attributes.push(contextElement.attributes[i]);
            }
        } else {
            attributes = contextElement.attributes;
        }

        callback(null, attributes, commands, device);
    }

    function createActionsArray(attributes, commands, device, callback) {
        var updateActions = [];

        if (contextServerUtils.updateHandler) {
            updateActions.push(
                async.apply(
                    contextServerUtils.updateHandler,
                    contextElement.id,
                    contextElement.type,
                    req.headers['fiware-service'],
                    req.headers['fiware-servicepath'],
                    attributes
                )
            );
        }

        if (contextServerUtils.commandHandler) {
            if (device.polling) {
                updateActions.push(
                    async.apply(
                        contextServerUtils.pushCommandsToQueue,
                        device,
                        contextElement.id,
                        contextElement.type,
                        req.headers['fiware-service'],
                        req.headers['fiware-servicepath'],
                        contextElement.attributes
                    )
                );
            } else {
                updateActions.push(
                    async.apply(
                        contextServerUtils.commandHandler,
                        contextElement.id,
                        contextElement.type,
                        req.headers['fiware-service'],
                        req.headers['fiware-servicepath'],
                        commands
                    )
                );
            }
        }

        updateActions.push(
            async.apply(
                contextServerUtils.executeUpdateSideEffects,
                device,
                contextElement.id,
                contextElement.type,
                req.headers['fiware-service'],
                req.headers['fiware-servicepath'],
                contextElement.attributes
            )
        );

        callback(null, updateActions);
    }

    deviceService.getDeviceByName(
        contextElement.id,
        req.headers['fiware-service'],
        req.headers['fiware-servicepath'],
        function(error, deviceObj) {
            if (error) {
                callback(error);
            } else {
                async.waterfall(
                    [
                        apply(deviceService.findConfigurationGroup, deviceObj),
                        apply(
                            deviceService.mergeDeviceWithConfiguration,
                            ['lazy', 'internalAttributes', 'active', 'staticAttributes', 'commands', 'subscriptions'],
                            [null, null, [], [], [], [], []],
                            deviceObj
                        ),
                        splitUpdates,
                        createActionsArray
                    ],
                    callback
                );
            }
        }
    );
}

/**
 * Express middleware to manage incoming UpdateContext requests using NGSIv1.
 * As NGSI10 requests can affect multiple entities, for each one of them a call
 * to the user update handler function is made.
 */
function handleUpdateNgsi1(req, res, next) {
    function reduceActions(actions, callback) {
        callback(null, _.flatten(actions));
    }

    if (contextServerUtils.updateHandler || contextServerUtils.commandHandler) {
        logger.debug(context, 'Handling v1 update from [%s]', req.get('host'));
        logger.debug(context, req.body);

        async.waterfall(
            [
                apply(async.map, req.body.contextElements, apply(generateUpdateActionsNgsi1, req)),
                reduceActions,
                async.series
            ],
            function(error, result) {
                if (error) {
                    logger.debug(context, 'There was an error handling the update action: %s.', error);

                    next(error);
                } else {
                    logger.debug(context, 'Update action from [%s] handled successfully.', req.get('host'));
                    res.status(200).json(contextServerUtils.createUpdateResponse(req, res, result));
                }
            }
        );
    } else {
        logger.error(context, 'Tried to handle an update request before the update handler was stablished.');

        var errorNotFound = new Error({
            message: 'Update handler not found'
        });
        next(errorNotFound);
    }
}

/**
 * Handle queries coming to the IoT Agent via de Context Provider API (as a consequence of a query to a passive
 * attribute redirected by the Context Broker).
 *
 * @param {String} id           Entity name of the selected entity in the query.
 * @param {String} type         Type of the entity.
 * @param {String} service      Service the device belongs to.
 * @param {String} subservice   Division inside the service.
 * @param {Array} attributes    List of attributes to read.
 */
function defaultQueryHandlerNgsi1(id, type, service, subservice, attributes, callback) {
    var contextElement = {
        type: type,
        isPattern: false,
        id: id,
        attributes: []
    };

    deviceService.getDeviceByName(id, service, subservice, function(error, ngsiDevice) {
        if (error) {
            callback(error);
        } else {
            for (var i = 0; i < attributes.length; i++) {
                var lazyAttribute = _.findWhere(ngsiDevice.lazy, { name: attributes[i] }),
                    command = _.findWhere(ngsiDevice.commands, { name: attributes[i] }),
                    attributeType;

                if (command) {
                    attributeType = command.type;
                } else if (lazyAttribute) {
                    attributeType = lazyAttribute.type;
                } else {
                    attributeType = 'string';
                }

                contextElement.attributes.push({
                    name: attributes[i],
                    type: attributeType,
                    value: ''
                });
            }

            callback(null, contextElement);
        }
    });
}

/**
 * Express middleware to manage incoming QueryContext requests using NGSIv1.
 * As NGSI10 requests can affect multiple entities, for each one of them a call
 * to the user query handler function is made.
 */
function handleQueryNgsi1(req, res, next) {
    function getName(element) {
        return element.name;
    }

    function addStaticAttributes(attributes, device, contextElement, callback) {
        function inAttributes(item) {
            return item.name && attributes.indexOf(item.name) >= 0;
        }

        if (device.staticAttributes) {
            var selectedAttributes = device.staticAttributes.filter(inAttributes);

            if (selectedAttributes.length > 0) {
                if (contextElement.attributes) {
                    contextElement.attributes = contextElement.attributes.concat(selectedAttributes);
                } else {
                    contextElement.attributes = selectedAttributes;
                }
            }
        }

        callback(null, contextElement);
    }

    function completeAttributes(attributes, device, callback) {
        if (attributes && attributes.length !== 0) {
            logger.debug(context, 'Handling received set of attributes: %j', attributes);
            callback(null, attributes);
        } else if (device.lazy) {
            logger.debug(context, 'Handling stored set of attributes: %j', attributes);
            callback(null, device.lazy.map(getName));
        } else {
            logger.debug(context, 'Couldn\'t find any attributes. Handling with null reference');
            callback(null, null);
        }
    }

    function createQueryRequests(attributes, contextEntity, callback) {
        var actualHandler;

        if (contextServerUtils.queryHandler) {
            actualHandler = contextServerUtils.queryHandler;
        } else {
            actualHandler = defaultQueryHandlerNgsi1;
        }

        async.waterfall(
            [
                apply(
                    deviceService.getDeviceByName,
                    contextEntity.id,
                    req.headers['fiware-service'],
                    req.headers['fiware-servicepath']
                ),
                deviceService.findConfigurationGroup
            ],
            function handleFindDevice(error, device) {
                var executeCompleteAttributes = apply(completeAttributes, attributes, device),
                    executeQueryHandler = apply(
                        actualHandler,
                        contextEntity.id,
                        contextEntity.type,
                        req.headers['fiware-service'],
                        req.headers['fiware-servicepath']
                    ),
                    executeAddStaticAttributes = apply(addStaticAttributes, attributes, device);

                callback(
                    error,
                    apply(async.waterfall, [executeCompleteAttributes, executeQueryHandler, executeAddStaticAttributes])
                );
            }
        );
    }

    function handleQueryContextRequests(error, result) {
        if (error) {
            logger.debug(context, 'There was an error handling the query: %s.', error);
            next(error);
        } else {
            logger.debug(context, 'Query from [%s] handled successfully.', req.get('host'));
            res.status(200).json(contextServerUtils.createQueryResponse(req, res, result));
        }
    }

    logger.debug(context, 'Handling query from [%s]', req.get('host'));

    async.waterfall(
        [apply(async.map, req.body.entities, apply(createQueryRequests, req.body.attributes)), async.series],
        handleQueryContextRequests
    );
}

function handleNotificationNgsi1(req, res, next) {
    function checkStatus(statusCode, callback) {
        if (statusCode.code && statusCode.code === '200') {
            callback();
        } else {
            callback(new errors.NotificationError(statusCode.code));
        }
    }

    function extractInformation(contextResponse, callback) {
        deviceService.getDeviceByName(
            contextResponse.contextElement.id,
            req.headers['fiware-service'],
            req.headers['fiware-servicepath'],
            function(error, device) {
                if (error) {
                    callback(error);
                } else {
                    callback(null, device, contextResponse.contextElement.attributes);
                }
            }
        );
    }

    function applyNotificationMiddlewares(device, values, callback) {
        if (contextServerUtils.notificationMiddlewares.length > 0) {
            var firstMiddleware = contextServerUtils.notificationMiddlewares.slice(0, 1)[0],
                rest = contextServerUtils.notificationMiddlewares.slice(1),
                startMiddleware = apply(firstMiddleware, device, values),
                composedMiddlewares = [startMiddleware].concat(rest);

            async.waterfall(composedMiddlewares, callback);
        } else {
            callback(null, device, values);
        }
    }

    function createNotificationHandler(contextResponse, callback) {
        async.waterfall(
            [
                apply(checkStatus, contextResponse.statusCode),
                apply(extractInformation, contextResponse),
                applyNotificationMiddlewares,
                contextServerUtils.notificationHandler
            ],
            callback
        );
    }

    function handleNotificationRequests(error) {
        if (error) {
            logger.error(context, 'Error found when processing notification: %j', error);
            next(error);
        } else {
            res.status(200).json({});
        }
    }

    if (contextServerUtils.notificationHandler) {
        logger.debug(context, 'Handling notification from [%s]', req.get('host'));

        async.map(req.body.contextResponses, createNotificationHandler, handleNotificationRequests);
    } else {
        var errorNotFound = new Error({
            message: 'Notification handler not found'
        });

        logger.error(context, 'Tried to handle a notification before notification handler was established.');

        next(errorNotFound);
    }
}

function queryErrorHandlingNgsi1(error, req, res, next) {
    var code = 500;

    logger.debug(context, 'Query NGSIv1 error [%s] handling request: %s', error.name, error.message);

    if (error.code && String(error.code).match(/^[2345]\d\d$/)) {
        code = error.code;
    }

    res.status(code).json({
        errorCode: {
            code: code,
            reasonPhrase: error.name,
            details: error.message.replace(/[<>\"\'=;\(\)]/g, '')
        }
    });
}

function updateErrorHandlingNgsi1(error, req, res, next) {
    var code = 500;

    logger.debug(context, 'Update NGSIv1 error [%s] handing request: %s', error.name, error.message);

    if (error.code && String(error.code).match(/^[2345]\d\d$/)) {
        code = error.code;
    }

    res.status(code).json({
        contextResponses: [
            {
                contextElement: req.body,
                statusCode: {
                    code: code,
                    reasonPhrase: error.name,
                    details: error.message.replace(/[<>\"\'=;\(\)]/g, '')
                }
            }
        ]
    });
}

/**
 * Load the routes related to context dispatching (NGSI10 calls).
 *
 * @param {Object} router      Express request router object.
 */
function loadContextRoutesNGSIv1(router) {
    // In a more evolved implementation, more endpoints could be added to queryPathsNgsi2
    // according to http://fiware.github.io/specifications/ngsiv2/stable.

    var i;
    logger.info(context, 'Loading NGSI-v1 Context server routes');
    for (i = 0; i < updatePaths.length; i++) {
        router.post(updatePaths[i], [
            middlewares.ensureType,
            middlewares.validateJson(updateContextTemplateNgsi1),
            handleUpdateNgsi1,
            updateErrorHandlingNgsi1
        ]);
    }
    for (i = 0; i < queryPaths.length; i++) {
        router.post(queryPaths[i], [
            middlewares.ensureType,
            middlewares.validateJson(queryContextTemplate),
            handleQueryNgsi1,
            queryErrorHandlingNgsi1
        ]);
    }
    router.post('/notify', [
        middlewares.ensureType,
        middlewares.validateJson(notificationTemplateNgsi1),
        handleNotificationNgsi1,
        queryErrorHandlingNgsi1
    ]);
}

exports.loadContextRoutes = loadContextRoutesNGSIv1;
