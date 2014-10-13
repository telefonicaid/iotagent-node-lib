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
 * please contact with::[contacto@tid.es]
 */
'use strict';

var http = require('http'),
    https = require('https'),
    fs = require('fs'),
    express = require('express'),
    request = require('request'),
    async = require('async'),
    logger = require('fiware-node-logger'),
    contextServer,
    updateHandler,
    queryHandler;

function handleError(error, req, res, next) {
    switch (error.name) {
        default:
            res.json(500, {
                message: error
            });
    }
}

function createUpdateResponse(req, res, result) {
    var result = {
        contextResponses: []
    };

    for(var i = 0; i < req.body.contextElements.length; i++) {
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

function handleUpdate(req, res, next) {
    if (updateHandler) {
        var updateActions = [];

        for (var i=0; i < req.body.contextElements.length; i++) {
            updateActions.push(
                async.apply(
                    updateHandler,
                    req.body.contextElements[i].id,
                    req.body.contextElements[i].type,
                    req.body.contextElements[i].attributes)
            );
        }

        async.series(updateActions, function (error, result) {
            if (error) {
                next(error);
            } else {
                res.json(200, createUpdateResponse(req, res, result));
            }
        });
    } else {
        var errorNotFound = new Error({
            message: "Update handler not found"
        });
        next(errorNotFound);
    }
}

function start(config, callback) {
    contextServer = {
        server: null,
        app: express()
    };

    contextServer.app.set('port', config.port);
    contextServer.app.set('host', '0.0.0.0');
    contextServer.app.use(express.json());
    contextServer.app.use(express.urlencoded());
    contextServer.app.use(handleError);

    contextServer.app.post('/NGSI10/updateContext', handleUpdate);

    contextServer.server = http.createServer(contextServer.app);

    contextServer.server.listen(contextServer.app.get('port'), contextServer.app.get('host'), callback);
}

function stop(callback) {
    contextServer.server.close(callback);
}

function setUpdateHandler(newHandler) {
    updateHandler = newHandler;
}

function setQueryHandler(newHandler) {
    queryHandler = newHandler;
}

exports.setUpdateHandler=setUpdateHandler;
exports.setQueryHandler=setQueryHandler;
exports.start=start;
exports.stop=stop;