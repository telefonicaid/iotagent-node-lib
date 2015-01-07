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
    DOMParser = require('xmldom').DOMParser,
    context = {
        op: 'IoTAgentNGSI.ContextServer'
    },
    updateContextTemplate = require('../templates/updateContext.json'),
    queryContextTemplate = require('../templates/queryContext.json'),
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

    return result;
}

function createQueryResponse(req, res, results) {
    var result = {
        contextResponses: []
    };

    for (var i = 0; i < results.length; i++) {
        var contextResponse = {
            contextElement: results[i][0],
            statusCode: {
                code: 200,
                reasonPhrase: 'OK'
            }
        };

        contextResponse.contextElement.isPattern = false;

        result.contextResponses.push(contextResponse);
    }

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

/**
 * Express middleware to manage incoming QueryContext requests. As NGSI10 requests can affect multiple entities, for
 * each one of them a call to the user query handler function is made.
 */
function handleQuery(req, res, next) {
    if (queryHandler) {
        var queryRequests = [];

        logger.debug(context, 'Handling query from [%s]', req.get('host'));
        logger.debug(context, req.body);

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
                res.status(200).json(createQueryResponse(req, res, result));
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
                next(new errors.BadRequest('Errors found validating request.'));
            }
        } else {
            next();
        }
    };
}

function readUpdatePayload(req, callback) {
    var doc = new DOMParser().parseFromString(req.rawBody),
        contextElements = doc.getElementsByTagName('contextElement'),
        body = {
            contextElements: [],
            updateAction: null
        },
        updateActionNodes = doc.getElementsByTagName('updateAction');

    if (updateActionNodes.length !== 1) {
        callback(new errors.BadRequest('Error parsing XML: update action element not found'));
        return;
    }

    body.updateAction = updateActionNodes.item(0).firstChild.nodeValue;

    for (var i = 0; i < contextElements.length; i++) {
        var element = {
                attributes: []
            },
            node = contextElements.item(i),
            entityIdNodes = node.getElementsByTagName('entityId'),
            idNodes,
            attributeList = node.getElementsByTagName('contextAttribute');

        if (!entityIdNodes || entityIdNodes.length !== 1) {
            callback(new errors.BadRequest('Error parsing XML: context element not found'));
            return;
        }

        idNodes = entityIdNodes.item(0).getElementsByTagName('id');

        if (!entityIdNodes || entityIdNodes.length !== 1) {
            callback(new errors.BadRequest('Error parsing XML: context id not found'));
            return;
        }

        element.id = idNodes.item(0).firstChild.nodeValue;
        element.type = entityIdNodes.item(0).getAttribute('type');
        element.isPattern = entityIdNodes.item(0).getAttribute('isPattern');

        for (var q = 0; q < attributeList.length; q++) {
            var attribute = {},
                attributeNames = attributeList.item(q).getElementsByTagName('name'),
                attributeTypes = attributeList.item(q).getElementsByTagName('type'),
                attributeValues = attributeList.item(q).getElementsByTagName('contextValue');

            if (attributeNames.length === 1) {
                attribute.name = attributeNames.item(0).firstChild.nodeValue;
            }

            if (attributeTypes.length === 1) {
                attribute.type = attributeTypes.item(0).firstChild.nodeValue;
            }

            if (attributeValues.length === 1) {
                attribute.value = attributeValues.item(0).firstChild.nodeValue;
            }

            element.attributes.push(attribute);
        }
        body.contextElements.push(element);
    }

    req.body = body;
    callback();
}

function readQueryPayload() {

}

function readBody(parseFunction) {
    return function readMiddleware(req, res, next) {
        if (req.headers['content-type'] === 'application/xml') {
            parseFunction(req, next);
        } else {
            next();
        }
    };
}

/**
 * Load the routes related to context dispatching (NGSI10 calls).
 *
 * @param {Object} router      Express request router object.
 */
function loadContextRoutes(router) {
    logger.info(context, 'Loading NGSI Contect server routes');
    router.post('/NGSI10/updateContext',
        ensureType,
        readBody(readUpdatePayload),
        validateJson(updateContextTemplate),
        handleUpdate);

    router.post('/NGSI10/queryContext',
        ensureType,
        readBody(readQueryPayload),
        validateJson(queryContextTemplate),
        handleQuery);
}

exports.loadContextRoutes = loadContextRoutes;
exports.setUpdateHandler = setUpdateHandler;
exports.setQueryHandler = setQueryHandler;
