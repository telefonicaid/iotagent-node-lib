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

var restUtils = require('./restUtils'),
    groupService = require('./../groups/groupService'),
    async = require('async'),
    apply = async.apply,
    templateGroup = require('../../templates/deviceGroup.json'),
    configurationHandler,
    configurationMiddleware = [],
    _ = require('underscore'),
    mandatoryHeaders = [
        'fiware-service',
        'fiware-servicepath'
    ],
    mandatoryParameters = [
        'resource',
        'apikey'
    ],
    apiToInternal = {
        'entity_type': 'type',
        'internal_attributes': 'internalAttributes',
        'static_attributes': 'staticAttributes'
    },
    internalToApi = {
        'type': 'entity_type',
        'internalAttributes': 'internal_attributes',
        'staticAttributes': 'static_attributes'
    };

function applyMap(translation, body) {
    var newBody = _.clone(body);

    for (var i in newBody) {
        if (newBody.hasOwnProperty(i) && translation[i]) {
            newBody[translation[i]] = newBody[i];
            delete newBody[i];
        }
    }

    return newBody;
}

/**
 * Apply the handler for configuration updates if there is any.
 *
 * @param {Object} newConfiguration         New configuration that is being loaded.
 */
function applyConfigurationHandler(newConfiguration, callback) {
    if (configurationHandler && newConfiguration) {
        if (newConfiguration.services) {
            async.map(newConfiguration.services, configurationHandler, callback);
        } else {
            configurationHandler(newConfiguration, callback);
        }
    } else {
        callback();
    }
}

/**
 * Apply the configured list of middlewares before applying the global configuration handler.
 *
 * @param {Object} newConfiguration         New configuration that is being loaded.
 */
function applyConfigurationMiddlewares(newConfiguration, callback) {
    if (configurationMiddleware.length > 0) {
        var firstMiddleware = configurationMiddleware.slice(0, 1)[0],
            rest = configurationMiddleware.slice(1),
            executingMiddlewares = [apply(firstMiddleware, newConfiguration)];

        executingMiddlewares = executingMiddlewares.concat(rest);

        async.waterfall(executingMiddlewares, callback);
    } else {
        callback(null, newConfiguration);
    }
}


/**
 * Handle the device group creation requests, adding the header information to the device group body.
 *
 * @param {Object} req           Incoming request.
 * @param {Object} res           Outgoing response.
 * @param {Function} next        Invokes the next middleware in the chain.
 */
function handleCreateDeviceGroup(req, res, next) {
    /*jshint sub:true */

    for (var i = 0; i < req.body.services.length; i++) {
        req.body.services[i] = applyMap(apiToInternal, req.body.services[i]);
        req.body.services[i].service = req.headers['fiware-service'];
        req.body.services[i].subservice = req.headers['fiware-servicepath'];
    }

    async.series([
        apply(groupService.create, req.body),
        apply(applyConfigurationMiddlewares, req.body),
        apply(applyConfigurationHandler, req.body)
    ], function(error) {
        if (error) {
            next(error);
        } else {
            res.status(201).send({});
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
    var listHandler = function(error, group) {
        if (error) {
            next(error);
        } else {
            var translatedGroup = _.clone(group);

            if (group.services) {
                translatedGroup.services = group.services.map(applyMap.bind(null, internalToApi));
            } else {
                translatedGroup = applyMap(internalToApi, group);
            }

            res.status(200).send(translatedGroup);
        }
    };

    if (req.headers['fiware-servicepath'] === '/*') {
        groupService.list(
            req.headers['fiware-service'],
            req.query.limit,
            req.query.offset,
            listHandler);
    } else {
        groupService.find(req.headers['fiware-service'], req.headers['fiware-servicepath'], listHandler);
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
    /*jshint sub:true */
    req.body = applyMap(apiToInternal, req.body);

    async.series([
        apply(groupService.update, req.headers['fiware-service'], req.headers['fiware-servicepath'],
            req.query.resource, req.query.apikey, req.body),
        apply(applyConfigurationHandler, req.body)
    ], function(error) {
        if (error) {
            next(error);
        } else {
            res.status(204).send({});
        }
    });
}

/**
 * Handle a request for the removal of a device group.
 *
 * @param {Object} req           Incoming request.
 * @param {Object} res           Outgoing response.
 * @param {Function} next        Invokes the next middleware in the chain.
 */

function handleDeleteDeviceGroups(req, res, next) {
    groupService.remove(
        req.headers['fiware-service'], req.headers['fiware-servicepath'],
        req.query.resource, req.query.apikey,
        function(error) {
            if (error) {
                next(error);
            } else {
                res.status(204).send({});
            }
        });
}

/**
 * Load the routes related to device provisioning in the Express App.
 *
 * @param {Object} router      Express request router object.
 */
function loadContextRoutes(router) {
    router.post('/iot/services',
        restUtils.checkRequestAttributes('headers', mandatoryHeaders),
        restUtils.checkBody(templateGroup),
        handleCreateDeviceGroup);

    router.get('/iot/services',
        restUtils.checkRequestAttributes('headers', mandatoryHeaders),
        handleListDeviceGroups);

    router.put('/iot/services',
        restUtils.checkRequestAttributes('headers', mandatoryHeaders),
        restUtils.checkRequestAttributes('query', mandatoryParameters),
        handleModifyDeviceGroups);

    router.delete('/iot/services',
        restUtils.checkRequestAttributes('headers', mandatoryHeaders),
        restUtils.checkRequestAttributes('query', mandatoryParameters),
        handleDeleteDeviceGroups);
}

function setConfigurationHandler(newHandler) {
    configurationHandler = newHandler;
}

function addConfigurationProvisionMiddleware(newHandler) {
    configurationMiddleware.push(newHandler);
}

function clear(callback) {
    configurationHandler = null;
    configurationMiddleware = [];
    callback();
}

exports.loadContextRoutes = loadContextRoutes;
exports.setConfigurationHandler = setConfigurationHandler;
exports.addConfigurationProvisionMiddleware = addConfigurationProvisionMiddleware;
exports.clear = clear;
