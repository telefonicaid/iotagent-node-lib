/*
 * Copyright 2014 Telefonica Investigación y Desarrollo, S.A.U
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
    logger = require('logops'),
    errors = require('../../errors'),
    ngsi = require('../ngsi/ngsiService'),
    deviceService = require('../devices/deviceService'),
    revalidator = require('revalidator'),
    _ = require('underscore'),
    context = {
        op: 'IoTAgentNGSI.ContextServer'
    },
    updateContextTemplate = require('../../templates/updateContext.json'),
    queryContextTemplate = require('../../templates/queryContext.json'),
    notificationTemplate = require('../../templates/notificationTemplate.json'),
    ngsiParser = require('../ngsi/ngsiParser'),
    mustache = require('mustache'),
    fs = require('fs'),
    queryTemplates = {
        template: '',
        contextElementTemplate: '',
        attributeTemplate: ''
    },
    updateTemplates = {
        template: '',
        contextElementTemplate: '',
        attributeTemplate: ''
    },
    updateHandler,
    commandHandler,
    queryHandler,
    notificationHandler;

/**
 * Generates an XML Response payload for a queryContext or updateContext operations, based on the JSON representation
 * that is used internally.
 *
 * @param {Object} template         Object containing the string templates to use to generate the XML Response.
 * @return {Function}               Function that returns a string XML representation of the action Response.
 */
function generateXmlResponse(template) {
    return function xmlGenerator(response) {
        var queryContextValues = {
            contextResponses: ''
        };

        for (var i = 0; i < response.contextResponses.length; i++) {
            var contextElement = response.contextResponses[i].contextElement,
                contextElementValues = {
                    id: contextElement.id,
                    type: contextElement.type,
                    attributeList: ''
                };

            for (var p = 0; p < contextElement.attributes.length; p++) {
                contextElementValues.attributeList += mustache.render(template.attributeTemplate,
                    contextElement.attributes[p]);
            }

            queryContextValues.contextResponses += mustache.render(template.contextElementTemplate,
                contextElementValues);
        }

        return mustache.render(template.template, queryContextValues);
    };
}

/**
 * Create the response for an UpdateContext operation, based on the results of the individual updates. The signature
 * retains the results object for homogeinity with the createQuery* version.
 *
 * @param {Object} req              Request that was handled in first place.
 * @param {Object} res              Response that will be sent.
 * @param {Object} results          Ignored for this function. TODO: to be removed in later versions.
 * @return {{contextResponses: Array}}
 */
function createUpdateResponse(req, res, results) {
    var result = {
        contextResponses: []
    };

    for (var i = 0; i < req.body.contextElements.length; i++) {
        var contextResponse = {
            contextElement: {
                attributes: req.body.contextElements[i].attributes,
                id: req.body.contextElements[i].id,
                isPattern: false,
                type: req.body.contextElements[i].type
            },
            statusCode: {
                code: 200,
                reasonPhrase: 'OK'
            }
        };

        for (var j = 0; j < contextResponse.contextElement.attributes.length; j++) {
            contextResponse.contextElement.attributes[i].value = '';
        }

        result.contextResponses.push(contextResponse);
    }

    logger.debug(context, 'Generated update response: %j', result);

    return result;
}

/**
 * Create the response for a queryContext operation based on the individual results gathered from the query handlers.
 * The returned response is in the NGSI Response format.
 *
 * @param {Object} req              Request that was handled in first place.
 * @param {Object} res              Response that will be sent.
 * @param {Object} results          Individual Context Element results from the query handlers.
 * @return {{contextResponses: Array}}
 */
function createQueryResponse(req, res, results) {
    var result = {
        contextResponses: []
    };

    for (var i = 0; i < results.length; i++) {
        var contextResponse = {
            contextElement: results[i],
            statusCode: {
                code: 200,
                reasonPhrase: 'OK'
            }
        };

        contextResponse.contextElement.isPattern = false;

        result.contextResponses.push(contextResponse);
    }

    logger.debug(context, 'Generated query response: %j', result);

    return result;
}

/**
 * Retrieve the Device that corresponds to a Context Update, and execute the update side effects
 * if there were any (e.g.: creation of attributes related to comands).
 *
 * @param {String} id               Entity ID of the device to find.
 * @param {String} type             Type of the device to find.
 * @param {String} service          Service of the device.
 * @param {String} subservice       Subservice of the device.
 * @param {Array}  attributes       List of attributes to update with their types and values.
 */
function executeUpdateSideEffects(device, id, type, service, subservice, attributes, callback) {
    var sideEffects = [];

    if (device.commands) {
        for (var i = 0; i < device.commands.length; i++) {
            for (var j = 0; j < attributes.length; j++) {
                if (device.commands[i].name === attributes[j].name) {
                    var newAttributes = [
                        {
                            name: device.commands[i].name + '_status',
                            type: device.commands[i].type,
                            value: 'PENDING'
                        }
                    ];

                    sideEffects.push(
                        apply(ngsi.update,
                            device.name,
                            device.resource,
                            device.apikey,
                            newAttributes,
                            device
                        )
                    );
                }
            }
        }
    }

    async.series(sideEffects, callback);
}

/**
 * Generate all the update actions corresponding to a update context request. Update actions include updates in
 * attributes and execution of commands. This action will be called once per Context Element in the request.
 *
 * @param {Object} req                  Update request to generate Actions from
 * @param {Object} contextElement       Context Element whose actions will be extracted.
 */
function generateUpdateActions(req, contextElement, callback) {
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

        if (updateHandler) {
            updateActions.push(
                async.apply(
                    updateHandler,
                    contextElement.id,
                    contextElement.type,
                    attributes)
            );
        }

        if (commandHandler) {
            updateActions.push(
                async.apply(
                    commandHandler,
                    contextElement.id,
                    contextElement.type,
                    commands)
            );
        }

        updateActions.push(
            async.apply(
                executeUpdateSideEffects,
                device,
                contextElement.id,
                contextElement.type,
                req.headers['fiware-service'],
                req.headers['fiware-servicepath'],
                contextElement.attributes)
        );

        callback(null, updateActions);
    }

    async.waterfall([
        apply(deviceService.getDeviceByName, contextElement.id),
        splitUpdates,
        createActionsArray
    ], callback);
}

/**
 * Express middleware to manage incoming UpdateContext requests. As NGSI10 requests can affect multiple entities, for
 * each one of them a call to the user update handler function is made.
 */
function handleUpdate(req, res, next) {

    function reduceActions(actions, callback) {
        callback(null, _.flatten(actions));
    }

    if (updateHandler) {
        logger.debug(context, 'Handling update from [%s]', req.get('host'));
        logger.debug(context, req.body);

        async.waterfall([
            apply(async.map, req.body.contextElements, apply(generateUpdateActions, req)),
            reduceActions,
            async.series
        ], function(error, result) {
            if (error) {
                logger.debug(context, 'There was an error handling the update action: %s.', error);

                next(error);
            } else {
                logger.debug(context, 'Update action from [%s] handled successfully.', req.get('host'));

                if (req.is('xml')) {
                    res.set('Content-Type', 'application/xml');
                    res
                        .status(200)
                        .send(generateXmlResponse(updateTemplates)(createUpdateResponse(req, res, result)));
                } else {
                    res.status(200).json(createUpdateResponse(req, res, result));
                }
            }
        });
    } else {
        logger.error(context, 'Tried to handle an update request before the update handler was stablished.');

        var errorNotFound = new Error({
            message: 'Update handler not found'
        });
        next(errorNotFound);
    }
}

/**
 * Express middleware to manage incoming QueryContext requests. As NGSI10 requests can affect multiple entities, for
 * each one of them a call to the user query handler function is made.
 */
function handleQuery(req, res, next) {
    function getName(element) {
        return element.name;
    }

    function addStaticAttributes(device, contextElement, callback) {
        if (device.staticAttributes) {
            if (contextElement.attributes) {
                contextElement.attributes = contextElement.attributes.concat(device.staticAttributes);
            } else {
                contextElement.attributes = device.staticAttributes;
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
        deviceService.getDeviceByName(contextEntity.id, function handleFindDevice(error, device) {
            var executeCompleteAttributes = apply(
                    completeAttributes,
                    attributes,
                    device
                ),
                executeQueryHandler = apply(
                    queryHandler,
                    contextEntity.id,
                    contextEntity.type
                ),
                executeAddStaticAttributes = apply(
                    addStaticAttributes,
                    device
                );

            callback(error, apply(async.waterfall, [
                executeCompleteAttributes,
                executeQueryHandler,
                executeAddStaticAttributes
            ]));
        });
    }

    function handleQueryContextRequests(error, result) {
        if (error) {
            logger.debug(context, 'There was an error handling the query: %s.', error);
            next(error);
        } else {
            logger.debug(context, 'Query from [%s] handled successfully.', req.get('host'));

            if (req.is('xml')) {
                res.set('Content-Type', 'application/xml');
                res.status(200)
                    .send(generateXmlResponse(queryTemplates)(createQueryResponse(req, res, result)));
            } else {
                res.status(200).json(createQueryResponse(req, res, result));
            }
        }
    }

    if (queryHandler) {
        logger.debug(context, 'Handling query from [%s]', req.get('host'));

        async.waterfall([
            apply(async.map, req.body.entities, apply(createQueryRequests, req.body.attributes)),
            async.series
        ], handleQueryContextRequests);

    } else {
        var errorNotFound = new Error({
            message: 'Query handler not found'
        });

        logger.error(context, 'Tried to handle a query before the query handler was stablished.');

        next(errorNotFound);
    }
}

function handleNotification(req, res, next) {

    function checkStatus(statusCode, callback) {
        if (statusCode.code && statusCode.code === '200') {
            callback();
        } else {
            callback(new errors.NotificationError(statusCode.code));
        }
    }

    function extractInformation(contextResponse, callback) {
        deviceService.getDeviceByName(contextResponse.contextElement.id, function(error, device) {
            if (error) {
                callback(error);
            } else {
                callback(null, device, contextResponse.contextElement.attributes);
            }
        });
    }

    function createNotificationHandler(contextResponse, callback) {
        async.waterfall([
            apply(checkStatus, contextResponse.statusCode),
            apply(extractInformation, contextResponse),
            notificationHandler
        ], callback);
    }

    function handleNotificationRequests(error) {
        if (error) {
            logger.error(context, 'Error found when processing notification: %j', error);
        }

        next();
    }

    if (notificationHandler) {
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

/**
 * Sets the new user handler for Entity update requests. This handler will be called whenever an update request arrives
 * with the following parameters: (id, type, attributes, callback). The callback is in charge of updating the
 * corresponding values in the devices with the appropriate protocol.
 *
 * In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each
 * entity, and all the results will be combined into a single response.
 *
 * @param {Function} newHandler         User handler for update requests
 */
function setUpdateHandler(newHandler) {
    updateHandler = newHandler;
}

/**
 * Sets the new user handler for commadn execution requests. This handler will be called whenever an update request
 * arrives to a with the following parameters: (id, type, attributes, callback). The callback is in charge of updating
 * the corresponding values in the devices with the appropriate protocol.
 *
 * In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each
 * entity, and all the results will be combined into a single response.
 *
 * @param {Function} newHandler         User handler for update requests
 */
function setCommandHandler(newHandler) {
    commandHandler = newHandler;
}

/**
 * Sets the new user handler for Entity query requests. This handler will be called whenever an update request arrives
 * with the following parameters: (id, type, attributes, callback). The handler must retrieve all the corresponding
 * information from the devices and return a NGSI entity with the requested values.
 *
 * In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each
 * entity, and all the results will be combined into a single response.

 * @param {Function} newHandler         User handler for query requests
 */
function setQueryHandler(newHandler) {
    queryHandler = newHandler;
}

/**
 * Sets the new user handler for entity change notifications. This candler will be called for each notification in an
 * entity the IOTA is subscribed to.
 *
 * In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each
 * entity, and all the results will be combined into a single response.
 *
 * @param {Function} newHandler         User handler for incoming notifications
 *
 */
function setNotificationHandler(newHandler) {
    notificationHandler = newHandler;
}


function ensureType(req, res, next) {
    if (req.is('json') || req.is('xml')) {
        next();
    } else {
        next(new errors.UnsupportedContentType(req.headers['content-type']));
    }
}

function validateJson(template) {
    return function validate(req, res, next) {
        if (req.is('json')) {
            var errorList = revalidator.validate(req.body, template);

            if (errorList.valid) {
                next();
            } else {
                logger.debug(context, 'Errors found validating request: %j', errorList);
                next(new errors.BadRequest('Errors found validating request.'));
            }
        } else {
            next();
        }
    };
}

/**
 * Load the templates that will be used to generate XML Payloads for Orion.
 */
function loadTemplates() {
    var dirname = __dirname;
    logger.debug('Loading access validation Templates');

    async.series([
        async.apply(fs.readFile, dirname + '/../../templates/queryContext.xml', 'utf8'),
        async.apply(fs.readFile, dirname + '/../../templates/attributeTemplate.xml', 'utf8'),
        async.apply(fs.readFile, dirname + '/../../templates/contextResponse.xml', 'utf8'),
        async.apply(fs.readFile, dirname + '/../../templates/updateContext.xml', 'utf8')
    ], function templateLoaded(error, results) {
        if (error) {
            logger.fatal('[VALIDATION-FATAL-001] Validation Request templates not found');
            throw new errors.TemplateLoadingError(error);
        } else {
            queryTemplates.template = results[0];
            queryTemplates.attributeTemplate = results[1];
            queryTemplates.contextElementTemplate = results[2];
            updateTemplates.template = results[3];
            updateTemplates.attributeTemplate = results[1];
            updateTemplates.contextElementTemplate = results[2];
        }
    });
}

/**
 * Load the routes related to context dispatching (NGSI10 calls).
 *
 * @param {Object} router      Express request router object.
 */
function loadContextRoutes(router) {
    //TODO: remove '//' paths when the appropriate patch comes to Orion
    var updateMiddlewares = [
            ensureType,
            ngsiParser.readUpdateBody,
            validateJson(updateContextTemplate),
            handleUpdate
        ],
        queryMiddlewares = [
            ensureType,
            ngsiParser.readQueryBody,
            validateJson(queryContextTemplate),
            handleQuery
        ],
        updatePaths = [
            '/v1/updateContext',
            '/NGSI10/updateContext',
            '//updateContext'
        ],
        queryPaths = [
            '/v1/queryContext',
            '/NGSI10/queryContext',
            '//queryContext'
        ];

    logger.info(context, 'Loading NGSI Contect server routes');

    for (var i = 0; i < updatePaths.length; i++) {
        router.post(updatePaths[i], updateMiddlewares);
        router.post(queryPaths[i], queryMiddlewares);
    }

    router.post('/notify', [
        ensureType,
        validateJson(notificationTemplate),
        handleNotification
    ]);

    loadTemplates();
}

exports.loadContextRoutes = loadContextRoutes;
exports.setUpdateHandler = setUpdateHandler;
exports.setCommandHandler = setCommandHandler;
exports.setNotificationHandler = setNotificationHandler;
exports.setQueryHandler = setQueryHandler;
