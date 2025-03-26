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
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 *
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */

/* eslint-disable no-prototype-builtins */

const restUtils = require('./restUtils');
const groupService = require('./../groups/groupService');
const async = require('async');
const apply = async.apply;
const templateGroupService = require('../../templates/deviceGroup.json');
let configurationHandler;
let removeConfigurationHandler;
let configurationMiddleware = [];
const _ = require('underscore');
const mandatoryHeaders = ['fiware-service', 'fiware-servicepath'];
const mandatoryParameters = ['resource', 'apikey'];
const constants = require('../../constants');

// Create new template for configuration groups replacing services by CONFIGGROUP_TERM
const templateGroup = JSON.parse(JSON.stringify(templateGroupService));
templateGroup.properties[constants.CONFIGGROUP_TERM] = templateGroup.properties.services;
delete templateGroup.properties.services;

const apiToInternal = {
    entity_type: 'type',
    internal_attributes: 'internalAttributes',
    static_attributes: 'staticAttributes'
};
const internalToApi = {
    type: 'entity_type',
    internalAttributes: 'internal_attributes',
    staticAttributes: 'static_attributes'
};

function applyMap(translation, body) {
    const newBody = _.clone(body);

    for (const i in newBody) {
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
 * Apply the handler for configuration removal.
 *
 * @param {String} groupToDelete   Configuration to be deleted.
 */
function applyRemoveConfigurationHandler(groupToDelete, callback) {
    if (removeConfigurationHandler && groupToDelete) {
        removeConfigurationHandler(groupToDelete, callback);
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
        const firstMiddleware = configurationMiddleware.slice(0, 1)[0];
        const rest = configurationMiddleware.slice(1);
        let executingMiddlewares = [apply(firstMiddleware, newConfiguration)];

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
    req.body = checkAndModifyGroupRecv(req._parsedUrl.pathname, req.body); // #FIXME1649: This line should be removed when /iot/services support is removed

    for (let i = 0; i < req.body.services.length; i++) {
        req.body.services[i] = applyMap(apiToInternal, req.body.services[i]);
        req.body.services[i].service = req.headers['fiware-service'];
        req.body.services[i].subservice = req.headers['fiware-servicepath'];
    }

    async.series(
        [
            apply(groupService.create, req.body),
            apply(applyConfigurationMiddlewares, req.body),
            apply(applyConfigurationHandler, req.body)
        ],
        function (error) {
            if (error) {
                next(error);
            } else {
                res.status(201).send({});
            }
        }
    );
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
    const listHandler = function (error, group) {
        if (error) {
            next(error);
        } else {
            let translatedGroup = _.clone(group);

            if (group.services) {
                translatedGroup.services = group.services.map(applyMap.bind(null, internalToApi));
            } else {
                translatedGroup = applyMap(internalToApi, group);
            }
            res.status(200).send(checkAndModifyGroupResp(req._parsedUrl.pathname, translatedGroup)); // #FIXME1649: Response should not use checkAndModifyGroupResp function when /iot/services support is removed
        }
    };

    if (req.headers['fiware-servicepath'] === '/*') {
        groupService.list(req.headers['fiware-service'], req.query.limit, req.query.offset, listHandler);
    } else {
        groupService.find(req.headers['fiware-service'], req.headers['fiware-servicepath'], null, listHandler);
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
    req.body = applyMap(apiToInternal, req.body);

    function addInformation(group, callback) {
        group.service = req.headers['fiware-service'];
        group.subservice = req.headers['fiware-servicepath'];
        group.resource = req.query.resource;
        group.apikey = req.query.apikey;
        callback(null, group);
    }

    async.series(
        [
            apply(
                groupService.update,
                req.headers['fiware-service'],
                req.headers['fiware-servicepath'],
                req.query.resource,
                req.query.apikey,
                req.body
            ),
            apply(addInformation, req.body),
            apply(applyConfigurationHandler, req.body)
        ],
        function (error) {
            if (error) {
                next(error);
            } else {
                res.status(204).send({});
            }
        }
    );
}

/**
 * Handle a request for the removal of a device group.
 *
 * @param {Object} req           Incoming request.
 * @param {Object} res           Outgoing response.
 * @param {Function} next        Invokes the next middleware in the chain.
 */

function handleDeleteDeviceGroups(req, res, next) {
    function getGroup(req, callback) {
        groupService.get(req.query.resource, req.query.apikey, function (error, group) {
            if (error) {
                callback(error);
            } else {
                callback(null, group);
            }
        });
    }
    function deleteGroup(req, groupToDelete, callback) {
        groupService.remove(
            req.headers['fiware-service'],
            req.headers['fiware-servicepath'],
            req.query.resource,
            req.query.apikey,
            req.query.device,
            function (error) {
                if (error) {
                    callback(error);
                } else {
                    callback(null, groupToDelete);
                }
            }
        );
    }

    async.waterfall([apply(getGroup, req), apply(deleteGroup, req), applyRemoveConfigurationHandler], function (error) {
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
// #FIXME1649: Routes using /iot/services path should be removed when support for it is removed
function loadContextRoutes(router) {
    router.post(
        '/iot/services',
        restUtils.checkRequestAttributes('headers', mandatoryHeaders),
        restUtils.checkBody(templateGroupService),
        handleCreateDeviceGroup
    );

    router.post(
        '/iot/groups',
        restUtils.checkRequestAttributes('headers', mandatoryHeaders),
        restUtils.checkBody(templateGroup),
        handleCreateDeviceGroup
    );

    router.get(
        ['/iot/services', '/iot/groups'],
        restUtils.checkRequestAttributes('headers', mandatoryHeaders),
        handleListDeviceGroups
    );

    router.put(
        ['/iot/services', '/iot/groups'],
        restUtils.checkRequestAttributes('headers', mandatoryHeaders),
        restUtils.checkRequestAttributes('query', mandatoryParameters),
        handleModifyDeviceGroups
    );

    router.delete(
        ['/iot/services', '/iot/groups'],
        restUtils.checkRequestAttributes('headers', mandatoryHeaders),
        restUtils.checkRequestAttributes('query', mandatoryParameters),
        handleDeleteDeviceGroups
    );
}

function setConfigurationHandler(newHandler) {
    configurationHandler = newHandler;
}

function setRemoveConfigurationHandler(newHandler) {
    removeConfigurationHandler = newHandler;
}

function addConfigurationProvisionMiddleware(newHandler) {
    configurationMiddleware.push(newHandler);
}

function clear(callback) {
    configurationHandler = null;
    configurationMiddleware = [];
    callback();
}

// #FIXME1649: This function should be removed when /iot/services support is removed
function checkAndModifyGroupResp(route, payload) {
    if (route === '/iot/groups') {
        payload['groups'] = payload['services'];
        delete payload['services'];
    }
    return payload;
}
// #FIXME1649: This function should be removed when /iot/services support is removed
function checkAndModifyGroupRecv(route, payload) {
    if (route === '/iot/groups') {
        payload['services'] = payload['groups'];
        delete payload['groups'];
    }
    return payload;
}

exports.loadContextRoutes = loadContextRoutes;
exports.setConfigurationHandler = setConfigurationHandler;
exports.setRemoveConfigurationHandler = setRemoveConfigurationHandler;
exports.addConfigurationProvisionMiddleware = addConfigurationProvisionMiddleware;
exports.clear = clear;
