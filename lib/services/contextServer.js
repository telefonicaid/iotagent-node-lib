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
    logger = require('fiware-node-logger'),
    errors = require('../errors'),
    ngsi = require('./ngsiService'),
    revalidator = require('revalidator'),
    context = {
        op: 'IoTAgentNGSI.ContextServer'
    },
    updateContextTemplate = require('../templates/updateContext.json'),
    queryContextTemplate = require('../templates/queryContext.json'),
    ngsiParser = require('./ngsiParser'),
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
    queryHandler;

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

                if (req.is('application/xml')) {
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
            contextElement.attributes = contextElement.attributes.concat(device.staticAttributes);
        }

        callback(null, contextElement);
    }

    function completeAttributes(attributes, device, callback) {
        if (attributes) {
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
        ngsi.getDeviceByName(contextEntity.id, function handleFindDevice(error, device) {
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

            if (req.is('application/xml')) {
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
        async.apply(fs.readFile, dirname + '/../templates/contextResponse.xml', 'utf8'),
        async.apply(fs.readFile, dirname + '/../templates/updateContext.xml', 'utf8')
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

    loadTemplates();
}

exports.loadContextRoutes = loadContextRoutes;
exports.setUpdateHandler = setUpdateHandler;
exports.setQueryHandler = setQueryHandler;
