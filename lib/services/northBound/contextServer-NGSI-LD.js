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

/* eslint-disable no-useless-escape */
/* eslint-disable no-unused-vars */
/* eslint-disable consistent-return */

const async = require('async');
const apply = async.apply;
const logger = require('logops');
const errors = require('../../errors');
const constants = require('../../constants');
const deviceService = require('../devices/deviceService');
const middlewares = require('../common/genericMiddleware');
const _ = require('underscore');
const context = {
    op: 'IoTAgentNGSI.ContextServer-LD'
};
const updateContextTemplateNgsiLD = require('../../templates/updateContextNgsiLD.json');
const notificationTemplateNgsiLD = require('../../templates/notificationTemplateNgsiLD.json');
const contextServerUtils = require('./contextServerUtils');
const ngsiLD = require('../ngsi/entities-NGSI-LD');
const config = require('../../commonConfig');

const overwritePaths = ['/ngsi-ld/v1/entities/:entity/attrs', '/ngsi-ld/v1/entities/:entity/attrs/:attr'];
const updatePaths = ['/ngsi-ld/v1/entities/:entity/attrs', '/ngsi-ld/v1/entities/:entity/attrs/:attr'];
const queryPaths = ['/ngsi-ld/v1/entities/:entity'];

/**
 * Replacement of NGSI-LD Null placeholders with real null values
 *
 */
function replaceNGSILDNull(payload) {
    Object.keys(payload).forEach((key) => {
        const value = payload[key];
        if (value === constants.NGSI_LD_NULL) {
            payload[key] = null;
        } else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
            payload[key] = replaceNGSILDNull(payload[key]);
        }
    });
    return payload;
}

/**
 * Check to see if the payload or its subattributes contain null values
 *
 */
function containsNulls(payload, result) {
    Object.keys(payload).forEach((key) => {
        const value = payload[key];
        if (value === null) {
            result.nulls = true;
        } else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
            containsNulls(payload[key], result);
        }
    });
    return result;
}

/**
 * An Express middleware for preprocessing NGSI-LD payloads. Converts NGSI-LD Nulls
 * to real nulls and checks for the presence of null and datasetId
 *
 */
function preprocessNGSILD(req, res, next) {
    res.locals.hasDatasetId = false;
    const payload = req.body;
    if (payload && typeof payload === 'object') {
        Object.keys(payload).forEach((key) => {
            if (_.isArray(payload[key])) {
                payload[key].forEach((obj) => {
                    if (obj.datasetId) {
                        res.locals.hasDatasetId = true;
                    }
                });
            } else if (payload[key] && payload[key].datasetId && payload[key].datasetId !== '@none') {
                res.locals.hasDatasetId = true;
            }
        });
        req.body = replaceNGSILDNull(payload);
        const result = { nulls: false };
        containsNulls(payload, result);
        res.locals.hasNulls = result.nulls;
    }
    next();
}

/**
 * A configurable Middleware that makes additional NGSI-LD checks within the payload.

 *
 * @param {Boolean} supportNull          Whether to support NGSI-LD nulls in the payload
 * @param {Boolean} supportDatasetId     Whether to support multiattributes in the payload.
 * @return {Object}            Express middleware used in request validation.
 */
function validateNGSILD(supportNull, supportDatasetId) {
    return function validate(req, res, next) {
        if (!supportNull && res.locals.hasNulls) {
            next(
                new errors.BadRequest(
                    'NGSI-LD Null found within the payload. This IoT Agent does not support nulls for this endpoint.'
                )
            );
        } else if (!supportDatasetId && res.locals.hasDatasetId) {
            next(
                new errors.BadRequest(
                    'datasetId found within the payload. This IoT Agent does not support multi-attribute requests.'
                )
            );
        } else {
            next();
        }
    };
}

/**
 * Extract metadata attributes from input.
 *
 * @param {Object} obj                  input object
 */
function getMetaData(obj) {
    const excludedKeys = ['datasetId', 'value', 'type'];
    const metaData = {};
    _.keys(obj).forEach((key) => {
        if (!excludedKeys.includes(key)) {
            metaData[key] = obj[key];
        }
    });
    return !_.isEmpty(metaData) ? metaData : {};
}
/**
 * Generate all the update actions corresponding to a update context request using Ngsi2.
 * Update actions include updates in attributes and execution of commands.
 *
 * @param {Object} req                  Update request to generate Actions from
 * @param {Object} contextElement       Context Element whose actions will be extracted.
 */
function generateUpdateActionsNgsiLD(req, contextElement, callback) {
    let entityId;
    let entityType;

    const attribute = req.params.attr;
    const value = req.body.value;
    const datasetId = req.body.datasetId;
    const incomingAttrs = !req.params.attr ? _.keys(req.body) : [];

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

        if (device.commands) {
            for (const j in device.commands) {
                const name = device.commands[j].name;
                if (attribute === name) {
                    if (_.isArray(req.body)) {
                        req.body[name].forEach((obj) => {
                            commands.push({
                                type: device.commands[j].type,
                                value: obj.value,
                                name: name,
                                datasetId: obj.datasetId,
                                metadata: getMetaData(obj)
                            });
                        });
                    } else {
                        commands.push({
                            type: device.commands[j].type,
                            value,
                            name,
                            datasetId,
                            metadata: getMetaData(req.body)
                        });
                    }
                    found = true;
                } else if (incomingAttrs.includes(name)) {
                    if (_.isArray(req.body[name])) {
                        req.body[name].forEach((obj) => {
                            commands.push({
                                type: device.commands[j].type,
                                value: obj.value,
                                name: name,
                                datasetId: obj.datasetId,
                                metadata: getMetaData(obj)
                            });
                        });
                    } else {
                        const obj = req.body[name];
                        commands.push({
                            type: device.commands[j].type,
                            value: obj.value,
                            name: name,
                            datasetId: obj.datasetId,
                            metadata: getMetaData(obj)
                        });
                    }
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

    deviceService.getDeviceByName(
        entityId,
        contextServerUtils.getLDTenant(req),
        contextServerUtils.getLDPath(req),
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
            logger.debug(context, JSON.stringify(req.body, null, 4));
        }

        async.waterfall(
            [apply(async.map, [req.body], apply(generateUpdateActionsNgsiLD, req)), reduceActions, async.series],
            function (error, result) {
                if (error) {
                    logger.debug(context, 'There was an error handling the update action: %s.', error);
                    next(error);
                } else {
                    logger.debug(context, 'Update action from [%s] handled successfully.', req.get('host'));
                    res.status(204).json();
                }
            }
        );
    } else {
        logger.error(context, 'Tried to handle an update request before the update handler was established.');

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
function defaultQueryHandlerNgsiLD(id, type, service, subservice, attributes, callback) {
    const contextElement = {
        type,
        id
    };

    deviceService.getDeviceByName(id, service, subservice, function (error, ngsiDevice) {
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

                contextElement[attributes[i]] = ngsiLD.convertAttrNGSILD({
                    type: attributeType,
                    value: ''
                });
            }

            callback(null, contextElement);
        }
    });
}

/**
 * Generate a merge-patch action corresponding to the request using NGSI-LD.
 * Merge-patch is an NGSI-LD specific action.
 *
 * @param {Object} req                  Update request to generate Actions from
 */
function generateMergePatchActionNgsiLD(req, callback) {
    const entityId = req.params.entity;

    function addAttributes(deviceData, body, attributes) {
        const keys = Object.keys(body);

        for (const j in deviceData) {
            if (keys.includes(deviceData[j].name)) {
                const obj = body[deviceData[j].name];
                if (obj === null) {
                    attributes.push({
                        type: deviceData[j].type,
                        value: null,
                        name: deviceData[j].name
                    });
                } else {
                    attributes.push({
                        type: deviceData[j].type,
                        value: obj.value,
                        name: deviceData[j].name
                    });
                }
            }
        }
        return attributes;
    }

    deviceService.getDeviceByName(
        entityId,
        contextServerUtils.getLDTenant(req),
        contextServerUtils.getLDPath(req),
        function (error, deviceObj) {
            if (error) {
                callback(error);
            } else {
                const attributes = [];
                addAttributes(deviceObj.commands, req.body, attributes);
                addAttributes(deviceObj.lazy, req.body, attributes);
                const executeMergePatchHandler = apply(
                    contextServerUtils.mergePatchHandler,
                    entityId,
                    deviceObj.type,
                    contextServerUtils.getLDTenant(req),
                    contextServerUtils.getLDPath(req),
                    attributes
                );
                async.waterfall([executeMergePatchHandler], callback());
            }
        }
    );
}

/**
 * Express middleware to manage incoming merge-patch requests using NGSI-LD.
 *
 * @param {Object} req              Request that was handled in first place.
 * @param {Object} res              Response that will be sent.
 */
function handleMergePatchNgsiLD(req, res, next) {
    function handleMergePatchRequest(error, result) {
        if (error) {
            logger.debug(context, 'There was an error handling the merge-patch: %s.', error);
            next(error);
        } else {
            logger.debug(context, 'Merge-patch from [%s] handled successfully.', req.get('host'));
            res.status(200).json(result);
        }
    }

    logger.debug(context, 'Handling merge-patch from [%s]', req.get('host'));
    if ((req.is('json') || req.is('application/ld+json')) === false) {
        return handleMergePatchRequest(new errors.UnsupportedContentType(req.header('content-type')));
    }

    if (req.body) {
        logger.debug(context, JSON.stringify(req.body, null, 4));
    }

    if (contextServerUtils.mergePatchHandler) {
        generateMergePatchActionNgsiLD(req, handleMergePatchRequest);
    } else {
        return handleMergePatchRequest(new errors.MethodNotSupported(req.method, req.path));
    }
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
            let selectedAttributes = [];
            if (attributes === null || attributes === undefined || attributes.length === 0) {
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
            logger.debug(context, "Couldn't find any attributes. Handling with empty reference");
            callback(null, []);
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
            const executeCompleteAttributes = apply(completeAttributes, attributes, group);
            const executeQueryHandler = apply(
                actualHandler,
                contextId,
                contextType,
                contextServerUtils.getLDTenant(req),
                contextServerUtils.getLDPath(req)
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
                return callback(new errors.DeviceNotFound(contextEntity.id, contextEntity));
            }

            if (innerDevice.count) {
                if (innerDevice.count === 0) {
                    return callback(null, []);
                }
                deviceList = innerDevice.devices;
            } else {
                deviceList = [innerDevice];
            }

            async.map(
                deviceList,
                async.apply(finishQueryForDevice, attributes, contextEntity, actualHandler),
                function (error, results) {
                    if (error) {
                        callback(error);
                    } else if (innerDevice.count) {
                        callback(null, results);
                    } else if (Array.isArray(results) && results.length > 1) {
                        callback(null, results);
                    } else {
                        callback(null, results[0]);
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
            logger.debug(context, 'Query from [%s] handled successfully.', req.get('host'));
            res.status(200).json(result);
        }
    }

    logger.debug(context, 'Handling query from [%s]', req.get('host'));
    if ((req.is('json') || req.is('application/ld+json')) === false) {
        return handleQueryContextRequests(new errors.UnsupportedContentType(req.header('content-type')));
    }

    if (req.body) {
        logger.debug(context, JSON.stringify(req.body, null, 4));
    }

    const nss = req.params.entity.replace('urn:ngsi-ld:', '');
    const contextEntity = {
        id: req.params.entity,
        type: nss.substring(0, nss.indexOf(':'))
    };

    createQueryRequest(req.query.attrs ? req.query.attrs.split(',') : null, contextEntity, handleQueryContextRequests);
}

/**
 * Error handler for NGSI-LD context query requests.
 *
 * @param {Object} error            Incoming error
 * @param {Object} req              Request that was handled in first place.
 * @param {Object} res              Response that will be sent.
 */
function ErrorHandlingNgsiLD(action) {
    return function errorHandle(error, req, res, next) {
        let code = 500;

        logger.debug(context, action + ' NGSI-LD error [%s] handling request: %s', error.name, error.message);

        if (error.code && String(error.code).match(/^[2345]\d\d$/)) {
            code = error.code;
        }

        res.status(code).json({
            error: error.name,
            description: error.message.replace(/[<>\"\'=;\(\)]/g, '')
        });
    };
}

/**
 * Express middleware to manage incoming notification requests using NGSI-LD.
 *
 * @param {Object} req              Request that was handled in first place.
 * @param {Object} res              Response that will be sent.
 */

function handleNotificationNgsiLD(req, res, next) {
    function extractInformation(dataElement, callback) {
        const atts = [];
        for (const key in dataElement) {
            /* eslint-disable-next-line  no-prototype-builtins */
            if (dataElement.hasOwnProperty(key)) {
                if (key !== 'id' && key !== 'type') {
                    if (_.isArray(dataElement[key])) {
                        dataElement[key].forEach((obj) => {
                            atts.push({
                                type: obj.type,
                                value: obj.value,
                                name: key,
                                datasetId: obj.datasetId,
                                metadata: getMetaData(obj)
                            });
                        });
                    } else {
                        atts.push({
                            type: dataElement[key].type,
                            value: dataElement[key].value,
                            name: key,
                            datasetId: dataElement[key].datasetId,
                            metadata: getMetaData(dataElement[key])
                        });
                    }
                }
            }
        }
        deviceService.getDeviceByName(
            dataElement.id,
            contextServerUtils.getLDTenant(req),
            contextServerUtils.getLDPath(req),
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
 * Load unsupported NGSI-LD entity routes and return proper NGSI-LD not supported responses
 *
 * @param {Object} router      Express request router object.
 */
function loadUnsupportedEndpointsNGSILD(router) {
    const unsupportedEndpoint = function (req, res) {
        return res.status(501).send(new errors.MethodNotSupported(req.method, req.path));
    };
    router.get('/ngsi-ld/v1/entities', unsupportedEndpoint);
    router.post('/ngsi-ld/v1/entities', unsupportedEndpoint);
    router.delete('/ngsi-ld/v1/entities/:entity', unsupportedEndpoint);
    router.delete('/ngsi-ld/v1/entities/:entity/attrs/:attr', unsupportedEndpoint);
}

/**
 * Load the routes related to context dispatching (NGSI10 calls).
 *
 * @param {Object} router      Express request router object.
 */
function loadContextRoutesNGSILD(router) {
    // In a more evolved implementation, more endpoints could be added to queryPathsNgsi2
    // according to https://www.etsi.org/standards-search#page=1&search=GS%20CIM%20009

    const support = config.getConfig().server.ldSupport;
    let i;

    logger.info(context, 'Loading NGSI-LD Context server routes');
    // Update Patch endpoints - this endpoint may accept NGSI-LD Null
    for (i = 0; i < updatePaths.length; i++) {
        router.patch(updatePaths[i], [
            middlewares.ensureType,
            middlewares.validateJson(updateContextTemplateNgsiLD),
            preprocessNGSILD,
            validateNGSILD(support.null, support.datasetId),
            handleUpdateNgsiLD,
            ErrorHandlingNgsiLD('Partial Update')
        ]);
    }
    // Merge Patch endpoints - this endpoint may accept NGSI-LD Null
    router.patch('/ngsi-ld/v1/entities/:entity', [
        preprocessNGSILD,
        validateNGSILD(support.null, support.datasetId),
        handleMergePatchNgsiLD,
        ErrorHandlingNgsiLD('Merge-Patch')
    ]);

    // Overwrite/PUT endpoints - this endpoint does not accept NGSI-LD Null
    for (i = 0; i < overwritePaths.length; i++) {
        router.put(overwritePaths[i], [
            middlewares.ensureType,
            middlewares.validateJson(updateContextTemplateNgsiLD),
            preprocessNGSILD,
            validateNGSILD(false, support.datasetId),
            handleUpdateNgsiLD,
            ErrorHandlingNgsiLD('Overwrite')
        ]);
    }
    // Query/GET endpoints - no payload to check.
    for (i = 0; i < queryPaths.length; i++) {
        router.get(queryPaths[i], [handleQueryNgsiLD, ErrorHandlingNgsiLD('Query')]);
    }
    router.post('/notify', [
        middlewares.ensureType,
        middlewares.validateJson(notificationTemplateNgsiLD),
        preprocessNGSILD,
        validateNGSILD(false, support.datasetId),
        handleNotificationNgsiLD,
        ErrorHandlingNgsiLD('Notify')
    ]);
    loadUnsupportedEndpointsNGSILD(router);
}

exports.loadContextRoutes = loadContextRoutesNGSILD;
