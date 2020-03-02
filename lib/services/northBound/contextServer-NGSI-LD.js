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
'use strict';

var async = require('async'),
    apply = async.apply,
    logger = require('logops'),
    errors = require('../../errors'),
    deviceService = require('../devices/deviceService'),
    middlewares = require('../common/genericMiddleware'),
    _ = require('underscore'),
    context = {
        op: 'IoTAgentNGSI.ContextServer-LD'
    },
    updateContextTemplateNgsiLD = require('../../templates/updateContextNgsiLD.json'),
    notificationTemplateNgsiLD = require('../../templates/notificationTemplateNgsiLD.json'),
    contextServerUtils = require('./contextServerUtils');

const updatePaths = ['/ngsi-ld/v1/entities/:entity/attrs/:attr'];
const queryPaths = ['/ngsi-ld/v1/entities/:entity'];

/**
 * Generate all the update actions corresponding to a update context request using Ngsi2.
 * Update actions include updates in attributes and execution of commands.
 *
 * @param {Object} req                  Update request to generate Actions from
 * @param {Object} contextElement       Context Element whose actions will be extracted.
 */
function generateUpdateActionsNgsiLD(req, contextElement, callback) {
    var entityId;
    var entityType;
    var attribute = req.params.attr;
    var value = req.body.value;

    if (contextElement.id && contextElement.type) {
        entityId = contextElement.id;
        entityType = contextElement.type;
    } else if (req.params.entity) {
        entityId = req.params.entity;
    }

    function splitUpdates(device, callback) {
        var attributes = [],
            commands = [],
            found;

        if (device.commands) {
            for (var j in device.commands) {
                if (attribute === device.commands[j].name) {
                    commands.push({
                        type: device.commands[j].type,
                        value,
                        name: attribute
                    });
                    found = true;
                }
            }
        }

        if (attribute && !found) {
            attributes.push({
                type: 'Property',
                value,
                name: attribute
            });
        }
        callback(null, attributes, commands, device);
    }

    function createActionsArray(attributes, commands, device, callback) {
        var updateActions = [];

        if (!entityType) {
            entityType = device.type;
        }

        if (contextServerUtils.updateHandler) {
            updateActions.push(
                async.apply(
                    contextServerUtils.updateHandler,
                    entityId,
                    entityType,
                    contextServerUtils.getLDTenant(req),
                    contextServerUtils.getLDPath(req),
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
                        entityId,
                        entityType,
                        contextServerUtils.getLDTenant(req),
                        contextServerUtils.getLDPath(req),
                        attributes
                    )
                );
            } else {
                updateActions.push(
                    async.apply(
                        contextServerUtils.commandHandler,
                        entityId,
                        entityType,
                        contextServerUtils.getLDTenant(req),
                        contextServerUtils.getLDPath(req),
                        commands
                    )
                );
            }
        }

        updateActions.push(
            async.apply(
                contextServerUtils.executeUpdateSideEffects,
                device,
                entityId,
                entityType,
                contextServerUtils.getLDTenant(req),
                contextServerUtils.getLDPath(req),
                attributes
            )
        );

        callback(null, updateActions);
    }

    deviceService.getDeviceByName(entityId, 
        contextServerUtils.getLDTenant(req), 
        contextServerUtils.getLDPath(req), function(
        error,
        deviceObj
    ) {
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
    });
}

/** Express middleware to manage incoming update requests using NGSI-LD.
 *
 * @param {Object} req              Request that was handled in first place.
 * @param {Object} res              Response that will be sent.
 */
function handleUpdateNgsiLD(req, res, next) {
    function reduceActions(actions, callback) {
        callback(null, _.flatten(actions));
    }

    if (contextServerUtils.updateHandler || contextServerUtils.commandHandler) {
        logger.debug(context, 'Handling LD update from [%s]', req.get('host'));
        if (req.body) {
            logger.debug(context, JSON.stringify(req.body , null, 4));
        }

        async.waterfall(
            [apply(async.map, req.body, apply(generateUpdateActionsNgsiLD, req)), reduceActions, async.series],
            function(error, result) {
                if (error) {
                    logger.debug(context, 'There was an error handling the update action: %s.', error);
                    //console.error(JSON.stringify(error));
                    next(error);
                } else {
                    logger.debug(context, 'Update action from [%s] handled successfully.', req.get('host'));
                    res.status(204).json();
                }
            }
        );
    } else {
        logger.error(context, 'Tried to handle an update request before the update handler was established.');

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
function defaultQueryHandlerNgsiLD(id, type, service, subservice, attributes, callback) {
    var contextElement = {
        type: type,
        id: id
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

                contextElement[attributes[i]] = {
                    type: attributeType,
                    value: ''
                };
            }

            callback(null, contextElement);
        }
    });
}

/**
 * Express middleware to manage incoming query context requests using NGSI-LD.
 *
 * @param {Object} req              Request that was handled in first place.
 * @param {Object} res              Response that will be sent.
 */
function handleQueryNgsiLD(req, res, next) {
    function getName(element) {
        return element.name;
    }

    function addStaticAttributes(attributes, device, contextElement, callback) {
        function inAttributes(item) {
            return item.name && attributes.indexOf(item.name) >= 0;
        }

        if (device.staticAttributes) {
            var selectedAttributes = [];
            if (attributes === undefined || attributes.length === 0) {
                selectedAttributes = device.staticAttributes;
            } else {
                selectedAttributes = device.staticAttributes.filter(inAttributes);
            }

            for (var att in selectedAttributes) {
                contextElement[selectedAttributes[att].name] = {
                    type: selectedAttributes[att].type,
                    value: selectedAttributes[att].value
                };
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
            var results = device.lazy.map(getName);
            callback(null, results);
        } else {
            logger.debug(context, 'Couldn\'t find any attributes. Handling with null reference');
            callback(null, null);
        }
    }

    function finishQueryForDevice(attributes, contextEntity, actualHandler, device, callback) {
        var contextId = contextEntity.id;
        var contextType = contextEntity.type;
        if (!contextId) {
            contextId = device.id;
        }

        if (!contextType) {
            contextType = device.type;
        }

        deviceService.findConfigurationGroup(device, function(error, group) {
            var executeCompleteAttributes = apply(completeAttributes, attributes, group),
                executeQueryHandler = apply(
                    actualHandler,
                    contextId,
                    contextType,
                    contextServerUtils.getLDTenant(req),
                    contextServerUtils.getLDPath(req)
                ),
                executeAddStaticAttributes = apply(addStaticAttributes, attributes, group);

            async.waterfall([executeCompleteAttributes, executeQueryHandler, executeAddStaticAttributes], callback);
        });
    }

    function createQueryRequest(attributes, contextEntity, callback) {
        var actualHandler;
        var getFunction;

        if (contextServerUtils.queryHandler) {
            actualHandler = contextServerUtils.queryHandler;
        } else {
            actualHandler = defaultQueryHandlerNgsiLD;
        }

        if (contextEntity.id) {
            getFunction = apply(
                deviceService.getDeviceByName,
                contextEntity.id,
                contextServerUtils.getLDTenant(req),
                contextServerUtils.getLDPath(req)
            );
        } else {
            getFunction = apply(
                deviceService.listDevicesWithType,
                contextEntity.type,
                contextServerUtils.getLDTenant(req),
                contextServerUtils.getLDPath(req),
                null,
                null
            );
        }

        getFunction(function handleFindDevice(error, innerDevice) {
            let deviceList = [];
            if (!innerDevice) {
                return callback(new errors.DeviceNotFound(contextEntity.id));
            }

            if (innerDevice.count) {
                if (innerDevice.count === 0) {
                    return callback(null, []);
                } else {
                    deviceList = innerDevice.devices;
                }
            } else {
                deviceList = [innerDevice];
            }

            async.map(deviceList, async.apply(finishQueryForDevice, attributes, contextEntity, actualHandler), function(
                error,
                results
            ) {
                if (error) {
                    callback(error);
                } else if (innerDevice.count) {
                    callback(null, results);
                } else if (Array.isArray(results) && results.length > 0) {
                    callback(null, results);
                } else {
                    callback(null, results);
                }
            });
        });
    }

    function handleQueryContextRequests(error, result) {
        if (error) {
            logger.debug(context, 'There was an error handling the query: %s.', error);
            next(error);
        } else {
            logger.debug(context, 'Query from [%s] handled successfully.', req.get('host'));
            res.status(200).json(result);
        }
    }

    logger.debug(context, 'Handling query from [%s]', req.get('host'));
    if (req.body) {
        logger.debug(context, JSON.stringify(req.body , null, 4));
    }
    
    const nss  = req.params.entity.replace('urn:ngsi-ld:', '');
    const contextEntity = {
        id: req.params.entity,
        type: nss.substring(0, nss.indexOf(':'))

    };

    createQueryRequest( 
        req.query.attrs ? req.query.attrs.split(',') : null, 
        contextEntity, handleQueryContextRequests);
}

/**
 * Error handler for NGSI-LD context query requests.
 *
 * @param {Object} error            Incoming error
 * @param {Object} req              Request that was handled in first place.
 * @param {Object} res              Response that will be sent.
 */
function queryErrorHandlingNgsiLD(error, req, res, next) {
    var code = 500;

    logger.debug(context, 'Query NGSI-LD error [%s] handling request: %s', error.name, error.message);

    if (error.code && String(error.code).match(/^[2345]\d\d$/)) {
        code = error.code;
    }

    res.status(code).json({
        error: error.name,
        description: error.message.replace(/[<>\"\'=;\(\)]/g, '')
    });
}

/**
 * Express middleware to manage incoming notification requests using NGSI-LD.
 *
 * @param {Object} req              Request that was handled in first place.
 * @param {Object} res              Response that will be sent.
 */

function handleNotificationNgsiLD(req, res, next) {
    function extractInformation(dataElement, callback) {
        var atts = [];
        for (var key in dataElement) {
            if (dataElement.hasOwnProperty(key)) {
                if (key !== 'id' && key !== 'type') {
                    var att = {};
                    att.type = dataElement[key].type;
                    att.value = dataElement[key].value;
                    att.name = key;
                    atts.push(att);
                }
            }
        }
        deviceService.getDeviceByName(
            dataElement.id,
            contextServerUtils.getLDTenant(req),
            contextServerUtils.getLDPath(req),
            function(error, device) {
                if (error) {
                    callback(error);
                } else {
                    callback(null, device, atts);
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
        async.map(req.body.data, createNotificationHandler, handleNotificationRequests);
    } else {
        var errorNotFound = new Error({
            message: 'Notification handler not found'
        });

        logger.error(context, 'Tried to handle a notification before notification handler was established.');

        next(errorNotFound);
    }
}

/**
 * Error handler for NGSI-LD update requests.
 *
 * @param {Object} error            Incoming error
 * @param {Object} req              Request that was handled in first place.
 * @param {Object} res              Response that will be sent.
 */
function updateErrorHandlingNgsiLD(error, req, res, next) {
    var code = 500;

    logger.debug(context, 'Update NGSI-LD error [%s] handing request: %s', error.name, error.message);

    if (error.code && String(error.code).match(/^[2345]\d\d$/)) {
        code = error.code;
    }

    res.status(code).json({
        error: error.name,
        description: error.message.replace(/[<>\"\'=;\(\)]/g, '')
    });
}

/**
 * Load the routes related to context dispatching (NGSI10 calls).
 *
 * @param {Object} router      Express request router object.
 */
function loadContextRoutesNGSILD(router) {
    // In a more evolved implementation, more endpoints could be added to queryPathsNgsi2
    // according to http://fiware.github.io/specifications/ngsiv2/stable.

    var i;

    logger.info(context, 'Loading NGSI-LD Context server routes');
    for (i = 0; i < updatePaths.length; i++) {
        router.patch(updatePaths[i], [
            middlewares.ensureType,
            middlewares.validateJson(updateContextTemplateNgsiLD),
            handleUpdateNgsiLD,
            updateErrorHandlingNgsiLD
        ]);
    }
    for (i = 0; i < queryPaths.length; i++) {
        router.get(queryPaths[i], [handleQueryNgsiLD, queryErrorHandlingNgsiLD]);
    }
    router.post('/notify', [
        middlewares.ensureType,
        middlewares.validateJson(notificationTemplateNgsiLD),
        handleNotificationNgsiLD,
        queryErrorHandlingNgsiLD
    ]);
}

exports.loadContextRoutes = loadContextRoutesNGSILD;
