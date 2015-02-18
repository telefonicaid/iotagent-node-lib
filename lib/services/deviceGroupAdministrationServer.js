/*
 * Copyright 2015 Telefonica Investigación y Desarrollo, S.A.U
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

var logger = require('fiware-node-logger'),
    errors = require('../errors'),
    groupService = require('./groupService'),
    _ = require('underscore'),
    revalidator = require('revalidator'),
    templateGroup = require('../templates/deviceGroup.json'),
    context = {
        op: 'IoTAgentNGSI.GroupServer'
    },
    mandatoryHeaders = [
        'fiware-service',
        'fiware-servicepath'
    ];

/**
 * Checks for the pressence of all the mandatory headers, returning a BAD_REQUEST error if any one is not found.
 *
 * @param {Object} req           Incoming request.
 * @param {Object} res           Outgoing response.
 * @param {Function} next        Invokes the next middleware in the chain.
 */
function checkHeaders(req, res, next) {
    var headerKeys = _.keys(req.headers),
        missing = [];

    for (var i = 0; i < mandatoryHeaders.length; i++) {
        if (headerKeys.indexOf(mandatoryHeaders[i]) < 0) {
            missing.push(mandatoryHeaders[i]);
        }
    }

    if (missing.length !== 0) {
        next(new errors.MissingHeaders(JSON.stringify(missing)));
    } else {
        next();
    }
}

/**
 * Generates a middleware that checks the request body against the given revalidator template.
 *
 * @param {Object} template         Loaded JSON Scheam Template.
 * @return {Function}               Express middleware that checks the validity of the body.
 */
function checkBody(template) {
    return function bodyMiddleware(req, res, next) {
        var errorList = revalidator.validate(req.body, template);

        if (errorList.valid) {
            next();
        } else {
            logger.debug(context, 'Errors found validating request: %j', errorList);
            next(new errors.WrongSyntax('Errors found validating request.'));
        }
    };
}

/**
 * Handle the device group creation requests, adding the header information to the device group body.
 *
 * @param {Object} req           Incoming request.
 * @param {Object} res           Outgoing response.
 * @param {Function} next        Invokes the next middleware in the chain.
 */
function handleCreateDeviceGroup(req, res, next) {
    for (var i = 0; i < req.body.services.length; i++) {
        req.body.services[i].service = req.headers['fiware-service'];
        req.body.services[i].subservice = req.headers['fiware-servicepath'];
    }

    groupService.create(req.body, function(error) {
        if (error) {
            next(error);
        } else {
            res.status(200).send({});
        }
    });
}

/**
 * Handle GET requests for device groups. Two kind of requests kind arrive: those with the wildcard servicepath ('/*')
 * and requests for a specific subservice. The former ones are considered service listings, and an array of all the
 * subservices is returned. For the latter, the description of the specific subservice is returned instead.
 *
 * @param {Object} req           Incoming request.
 * @param {Object} res           Outgoing response.
 * @param {Function} next        Invokes the next middleware in the chain.
 */
function handleListDeviceGroups(req, res, next) {
    if (req.headers['fiware-servicepath'] === '/*') {
        groupService.list(function(error, groupList) {
            if (error) {
                next(error);
            } else {
                res.status(200).send({
                    count: groupList.length,
                    services: groupList
                });
            }
        });
    } else {
        groupService.find(req.headers['fiware-service'], req.headers['fiware-servicepath'], function(error, group) {
            if (error) {
                next(error);
            } else {
                res.status(200).send(group);
            }
        });
    }
}

/**
 * Handle a request for modifications of device groups.
 *
 * @param {Object} req           Incoming request.
 * @param {Object} res           Outgoing response.
 * @param {Function} next        Invokes the next middleware in the chain.
 */
function handleModifyDeviceGroups(req, res, next) {
    groupService.update(req.headers['fiware-service'], req.headers['fiware-servicepath'], req.body, function(error) {
        if (error) {
            next(error);
        } else {
            res.status(200).send({});
        }
    });
}

function handleDeleteDeviceGroups(req, res, next) {
    groupService.remove(req.headers['fiware-service'], req.headers['fiware-servicepath'], function(error) {
        if (error) {
            next(error);
        } else {
            res.status(200).send({});
        }
    });
}

/**
 * Load the routes related to device provisioning in the Express App.
 *
 * @param {Object} router      Express request router object.
 */
function loadContextRoutes(router, name) {
    router.post('/iot/agents/' + name, checkHeaders, checkBody(templateGroup), handleCreateDeviceGroup);
    router.get('/iot/agents/' + name, checkHeaders, handleListDeviceGroups);
    router.put('/iot/agents/' + name, checkHeaders, handleModifyDeviceGroups);
    router.delete('/iot/agents/' + name, checkHeaders, handleDeleteDeviceGroups);
}

exports.loadContextRoutes = loadContextRoutes;
