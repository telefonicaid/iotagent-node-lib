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

/* eslint-disable no-useless-escape */
/* eslint-disable no-unused-vars */
/* eslint-disable no-prototype-builtins */
/* eslint-disable consistent-return */

const async = require('async');
const apply = async.apply;
const logger = require('logops');
const errors = require('../../errors');
const deviceService = require('../devices/deviceService');
const middlewares = require('../common/genericMiddleware');
const _ = require('underscore');
const context = {
    op: 'IoTAgentNGSI.ContextServer-v2'
};
const updateContextTemplateNgsi2 = require('../../templates/updateContextNgsi2.json');
const notificationTemplateNgsi2 = require('../../templates/notificationTemplateNgsi2.json');
const contextServerUtils = require('./contextServerUtils');

const updatePaths = ['/v2/op/update', '//op/update'];
const queryPaths = ['/v2/op/query', '//op/query'];
/**
 * Generate all the update actions corresponding to a update context request using Ngsi2.
 * Update actions include updates in attributes and execution of commands.
 *
 * @param {Object} req                  Update request to generate Actions from
 * @param {Object} contextElement       Context Element whose actions will be extracted.
 */
function generateUpdateActionsNgsi2(req, contextElement, callback) {
    let entityId;
    let entityType;

    if (contextElement.id && contextElement.type) {
        entityId = contextElement.id;
        entityType = contextElement.type;
    } else if (req.params.entity) {
        entityId = req.params.entity;
    }

    function splitUpdates(device, callback) {
        const attributes = [];
        const commands = [];
        let found;
        let newAtt;
        let i;

        if (device.commands) {
            attributeLoop: for (i in contextElement) {
                for (const j in device.commands) {
                    if (i === device.commands[j].name) {
                        newAtt = {};
                        newAtt[i] = contextElement[i];
                        newAtt[i].name = i;
                        commands.push(newAtt[i]);
                        found = true;
                        continue attributeLoop;
                    }
                }
            }
        }

        for (i in contextElement) {
            if (i !== 'type' && i !== 'id') {
                newAtt = {};
                newAtt = contextElement[i];
                newAtt.name = i;
                attributes.push(newAtt);
            }
        }

        callback(null, attributes, commands, device);
    }

    function createActionsArray(attributes, commands, device, callback) {
        const updateActions = [];

        if (!entityType) {
            entityType = device.type;
        }

        if (contextServerUtils.updateHandler) {
            updateActions.push(
                async.apply(
                    contextServerUtils.updateHandler,
                    entityId,
                    entityType,
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
                        entityId,
                        entityType,
                        req.headers['fiware-service'],
                        req.headers['fiware-servicepath'],
                        attributes
                    )
                );
            } else {
                updateActions.push(
                    async.apply(
                        contextServerUtils.commandHandler,
                        entityId,
                        entityType,
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
                entityId,
                entityType,
                req.headers['fiware-service'],
                req.headers['fiware-servicepath'],
                attributes
            )
        );

        callback(null, updateActions);
    }

    deviceService.getDeviceByNameAndType(
        entityId,
        entityType,
        req.headers['fiware-service'],
        req.headers['fiware-servicepath'],
        function (error, deviceObj) {
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

/** Express middleware to manage incoming update requests using NGSIv2.
 *
 * @param {Object} req              Request that was handled in first place.
 * @param {Object} res              Response that will be sent.
 */
function handleUpdateNgsi2(req, res, next) {
    function reduceActions(actions, callback) {
        callback(null, _.flatten(actions));
    }

    if (contextServerUtils.updateHandler || contextServerUtils.commandHandler) {
        logger.debug(context, 'Handling v2 update from [%s]', req.get('host'));
        if (req.body) {
            logger.debug(context, JSON.stringify(req.body, null, 4));
        }

        async.waterfall(
            [apply(async.map, req.body.entities, apply(generateUpdateActionsNgsi2, req)), reduceActions, async.series],
            function (error, result) {
                if (error) {
                    logger.debug(context, 'There was an error handling the update action: %j.', error);

                    next(error);
                } else {
                    logger.debug(context, 'Update action from [%s] handled successfully.', req.get('host'));
                    res.status(204).json();
                }
            }
        );
    } else {
        logger.error(
            context,
            'Tried to handle an update request [%j] before the update handler was stablished.',
            req.body
        );

        const errorNotFound = new Error({
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
function defaultQueryHandlerNgsi2(id, type, service, subservice, attributes, callback) {
    const contextElement = {
        type,
        id
    };
    deviceService.getDeviceByNameAndType(id, type, service, subservice, function (error, ngsiDevice) {
        if (error) {
            callback(error);
        } else {
            for (let i = 0; i < attributes.length; i++) {
                const lazyAttribute = _.findWhere(ngsiDevice.lazy, { name: attributes[i] });
                const command = _.findWhere(ngsiDevice.commands, { name: attributes[i] });
                let attributeType = 'string';

                if (command) {
                    attributeType = command.type;
                } else if (lazyAttribute) {
                    attributeType = lazyAttribute.type;
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
 * Express middleware to manage incoming query context requests using NGSIv2.
 *
 * @param {Object} req              Request that was handled in first place.
 * @param {Object} res              Response that will be sent.
 */
function handleNotificationNgsi2(req, res, next) {
    function extractInformation(dataElement, callback) {
        const atts = [];
        for (const key in dataElement) {
            if (dataElement.hasOwnProperty(key)) {
                if (key !== 'id' && key !== 'type') {
                    const att = {};
                    att.type = dataElement[key].type;
                    att.value = dataElement[key].value;
                    att.metadata = dataElement[key].metadata || {};
                    att.name = key;
                    atts.push(att);
                }
            }
        }
        deviceService.getDeviceByNameAndType(
            dataElement.id,
            dataElement.type,
            req.headers['fiware-service'],
            req.headers['fiware-servicepath'],
            function (error, device) {
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
            const firstMiddleware = contextServerUtils.notificationMiddlewares.slice(0, 1)[0];
            const rest = contextServerUtils.notificationMiddlewares.slice(1);
            const startMiddleware = apply(firstMiddleware, device, values);
            const composedMiddlewares = [startMiddleware].concat(rest);

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
        const errorNotFound = new Error({
            message: 'Notification handler not found'
        });

        logger.error(context, 'Tried to handle a notification before notification handler was established.');

        next(errorNotFound);
    }
}

/**
 * Error handler for NGSIv2 context query requests.
 *
 * @param {Object} error            Incoming error
 * @param {Object} req              Request that was handled in first place.
 * @param {Object} res              Response that will be sent.
 */
function queryErrorHandlingNgsi2(error, req, res, next) {
    let code = 500;

    logger.debug(context, 'Query NGSIv2 error [%s] handling request: %s', error.name, error.message);

    if (error.code && String(error.code).match(/^[2345]\d\d$/)) {
        code = error.code;
    }

    res.status(code).json({
        error: error.name,
        description: error.message.replace(/[<>\"\'=;\(\)]/g, '')
    });
}

/**
 * Error handler for NGSIv2 update requests.
 *
 * @param {Object} error            Incoming error
 * @param {Object} req              Request that was handled in first place.
 * @param {Object} res              Response that will be sent.
 */
function updateErrorHandlingNgsi2(error, req, res, next) {
    let code = 500;

    logger.debug(context, 'Update NGSIv2 error [%j] handing request: %j', error, req.body);

    if (error.code && String(error.code).match(/^[2345]\d\d$/)) {
        code = error.code;
    }

    res.status(code).json({
        error: error.name,
        description: error.message.replace(/[<>\"\'=;\(\)]/g, '')
    });
}

/**
 * Express middleware to manage incoming query context requests using NGSIv2.
 */
function handleQueryNgsi2(req, res, next) {
    function getName(element) {
        return element.name;
    }

    function addStaticAttributes(attributes, device, contextElement, callback) {
        function inAttributes(item) {
            return item.name && attributes.indexOf(item.name) >= 0;
        }

        if (device.staticAttributes) {
            let selectedAttributes = [];
            if (attributes === undefined || attributes.length === 0) {
                selectedAttributes = device.staticAttributes;
            } else {
                selectedAttributes = device.staticAttributes.filter(inAttributes);
            }

            for (const att in selectedAttributes) {
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
            const results = device.lazy.map(getName);
            callback(null, results);
        } else {
            logger.debug(context, "Couldn't find any attributes. Handling with null reference");
            callback(null, null);
        }
    }

    function finishQueryForDevice(attributes, contextEntity, actualHandler, device, callback) {
        let contextId = contextEntity.id;
        let contextType = contextEntity.type;
        if (!contextId) {
            contextId = device.id;
        }

        if (!contextType) {
            contextType = device.type;
        }

        deviceService.findConfigurationGroup(device, function (error, group) {
            logger.debug(context, 'finishQueryForDevice %j', group);
            const executeCompleteAttributes = apply(completeAttributes, attributes, group);
            const executeQueryHandler = apply(
                actualHandler,
                contextId,
                contextType,
                req.headers['fiware-service'],
                req.headers['fiware-servicepath']
            );
            const executeAddStaticAttributes = apply(addStaticAttributes, attributes, group);

            async.waterfall([executeCompleteAttributes, executeQueryHandler, executeAddStaticAttributes], callback);
        });
    }

    function createQueryRequest(attributes, contextEntity, callback) {
        let actualHandler;
        let getFunction;

        if (contextServerUtils.queryHandler) {
            actualHandler = contextServerUtils.queryHandler;
        } else {
            actualHandler = defaultQueryHandlerNgsi2;
        }

        if (contextEntity.id) {
            getFunction = apply(
                deviceService.getDeviceByNameAndType,
                contextEntity.id,
                contextEntity.type,
                req.headers['fiware-service'],
                req.headers['fiware-servicepath']
            );
        } else {
            getFunction = apply(
                deviceService.listDevicesWithType,
                contextEntity.type,
                req.headers['fiware-service'],
                req.headers['fiware-servicepath'],
                null,
                null
            );
        }

        getFunction(function handleFindDevice(error, innerDevice) {
            let deviceList = [];
            if (!innerDevice) {
                return callback(new errors.DeviceNotFound(contextEntity.id), contextEntity);
            }

            if (innerDevice.count) {
                if (innerDevice.count === 0) {
                    return callback(null, []);
                }
                deviceList = innerDevice.devices;
            } else {
                deviceList = [innerDevice];
            }
            logger.debug(context, 'handleFindDevice from %j', deviceList);
            async.map(
                deviceList,
                async.apply(finishQueryForDevice, attributes, contextEntity, actualHandler),
                function (error, results) {
                    if (error) {
                        callback(error);
                    } else if (innerDevice.count) {
                        callback(null, results);
                    } else if (Array.isArray(results) && results.length > 0) {
                        callback(null, results);
                    } else {
                        callback(null, results);
                    }
                }
            );
        });
    }

    function handleQueryContextRequests(error, result) {
        if (error) {
            logger.debug(context, 'There was an error handling the query: %s.', error);
            next(error);
        } else {
            logger.debug(context, 'Query from [%s] handled successfully. req %s', req.get('host'), req);
            res.status(200).json(result);
        }
    }

    logger.debug(context, 'Handling query from [%s]', req.get('host'));
    if (req.body) {
        logger.debug(context, JSON.stringify(req.body, null, 4));
    }
    const contextEntity = {};
    const entities = req.body.entities || [];

    if (!req.is('json')) {
        logger.warn(
            'queries must offer JSON entities, content-type not supported (%s found)',
            req.header('content-type')
        );
        return handleQueryContextRequests(new errors.UnsupportedContentType(req.header('content-type')));
    }

    // At the present moment, IOTA supports query request with one entity and without patterns. This is aligned
    // with the utilization cases in combination with ContextBroker. Other cases are returned as error
    if (entities.length !== 1) {
        logger.warn('queries with entities number different to 1 are not supported (%d found)', entities.length);
        return handleQueryContextRequests({
            code: 400,
            name: 'BadRequest',
            message: 'query does not contain a single entity'
        });
    }
    if (entities[0].idPattern) {
        logger.warn('queries with idPattern are not supported');
        return handleQueryContextRequests({
            code: 400,
            name: 'BadRequest',
            message: 'idPattern usage in query'
        });
    }

    contextEntity.id = entities[0].id;
    contextEntity.type = entities[0].type;
    const queryAtts = req.body.attrs;
    createQueryRequest(queryAtts, contextEntity, handleQueryContextRequests);
}

/**
 * Load the routes related to context dispatching (NGSI10 calls).
 *
 * @param {Object} router      Express request router object.
 */
function loadContextRoutesNGSIv2(router) {
    // In a more evolved implementation, more endpoints could be added to queryPathsNgsi2
    // according to http://fiware.github.io/specifications/ngsiv2/stable.

    let i;
    logger.info(context, 'Loading NGSI-v2 Context server routes');
    for (i = 0; i < updatePaths.length; i++) {
        router.post(updatePaths[i], [
            middlewares.ensureType,
            middlewares.validateJson(updateContextTemplateNgsi2),
            handleUpdateNgsi2,
            updateErrorHandlingNgsi2
        ]);
    }
    for (i = 0; i < queryPaths.length; i++) {
        router.post(queryPaths[i], [handleQueryNgsi2, queryErrorHandlingNgsi2]);
    }
    router.post('/notify', [
        middlewares.ensureType,
        middlewares.validateJson(notificationTemplateNgsi2),
        handleNotificationNgsi2,
        queryErrorHandlingNgsi2
    ]);
}

exports.loadContextRoutes = loadContextRoutesNGSIv2;
