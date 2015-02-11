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
    logger = require('fiware-node-logger'),
    errors = require('../errors'),
    revalidator = require('revalidator'),
    context = {
        op: 'IoTAgentNGSI.ContextServer'
    },
    updateContextTemplate = require('../templates/updateContext.json'),
    queryContextTemplate = require('../templates/queryContext.json'),
    ngsiParser = require('./ngsiParser'),
    mustache = require('mustache'),
    fs = require('fs'),
    queryTemplate,
    queryContextElementTemplate,
    queryAttributeTemplate,
    updateHandler,
    queryHandler;

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
 * Express middleware to manage incoming UpdateContext requests. As NGSI10 requests can affect multiple entities, for
 * each one of them a call to the user update handler function is made.
 */
function handleUpdate(req, res, next) {
    if (updateHandler) {
        var updateActions = [];

        logger.debug(context, 'Handling update from [%s]', req.get('host'));
        logger.debug(context, req.body);

        for (var i = 0; i < req.body.contextElements.length; i++) {
            updateActions.push(
                async.apply(
                    updateHandler,
                    req.body.contextElements[i].id,
                    req.body.contextElements[i].type,
                    req.body.contextElements[i].attributes)
            );
        }

        async.series(updateActions, function(error, result) {
            if (error) {
                logger.debug(context, 'There was an error handling the update action: %s.', error);

                next(error);
            } else {
                logger.debug(context, 'Update action from [%s] handled successfully.', req.get('host'));

                res.status(200).json(createUpdateResponse(req, res, result));
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

function generateXmlResponse(response) {
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
            contextElementValues.attributeList += mustache.render(queryAttributeTemplate,
                contextElement.attributes[p]);
        }

        queryContextValues.contextResponses += mustache.render(queryContextElementTemplate, contextElementValues);
    }

    return mustache.render(queryTemplate, queryContextValues);
}

/**
 * Express middleware to manage incoming QueryContext requests. As NGSI10 requests can affect multiple entities, for
 * each one of them a call to the user query handler function is made.
 */
function handleQuery(req, res, next) {
    if (queryHandler) {
        var queryRequests = [];

        logger.debug(context, 'Handling query from [%s]', req.get('host'));

        for (var i = 0; i < req.body.entities.length; i++) {
            queryRequests.push(
                async.apply(
                    queryHandler,
                    req.body.entities[i].id,
                    req.body.entities[i].type,
                    req.body.attributes)
            );
        }

        async.series(queryRequests, function(error, result) {
            if (error) {
                logger.debug(context, 'There was an error handling the query: %s.', error);
                next(error);
            } else {
                logger.debug(context, 'Query from [%s] handled successfully.', req.get('host'));

                if (req.is('application/xml')) {
                    res.set('Content-Type', 'application/xml');
                    res
                        .status(200)
                        .send(generateXmlResponse(createQueryResponse(req, res, result)));
                } else {
                    res.status(200).json(createQueryResponse(req, res, result));
                }
            }
        });
    } else {
        var errorNotFound = new Error({
            message: 'Query handler not found'
        });

        logger.error(context, 'Tried to handle a query before the query handler was stablished.');

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

function ensureType(req, res, next) {
    if (req.headers['content-type'] === 'application/json' || req.headers['content-type'] === 'application/xml') {
        next();
    } else {
        next(new errors.UnsupportedContentType(req.headers['content-type']));
    }
}

function validateJson(template) {
    return function validate(req, res, next) {
        if (req.headers['content-type'] === 'application/json') {
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
        async.apply(fs.readFile, dirname + '/../templates/queryContext.xml', 'utf8'),
        async.apply(fs.readFile, dirname + '/../templates/attributeTemplate.xml', 'utf8'),
        async.apply(fs.readFile, dirname + '/../templates/contextResponse.xml', 'utf8')
    ], function templateLoaded(error, results) {
        if (error) {
            logger.fatal('[VALIDATION-FATAL-001] Validation Request templates not found');
            throw new errors.TemplateLoadingError(error);
        } else {
            queryTemplate = results[0];
            queryAttributeTemplate = results[1];
            queryContextElementTemplate = results[2];
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

    loadTemplates();
}

exports.loadContextRoutes = loadContextRoutes;
exports.setUpdateHandler = setUpdateHandler;
exports.setQueryHandler = setQueryHandler;
