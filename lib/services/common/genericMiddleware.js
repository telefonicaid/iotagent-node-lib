/*
 * Copyright 2016 Telefonica Investigación y Desarrollo, S.A.U
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
 */

'use strict';

var logger = require('logops'),
    revalidator = require('revalidator'),
    errors = require('../../errors'),
    iotaInformation,
    context = {
        op: 'IoTAgentNGSI.GenericMiddlewares'
    };

/**
 * Express middleware for handling errors in the IoTAs. It extracts the code information to return from the error itself
 * returning 500 when no error code has been found.
 *
 * @param {Object} error        Error object with all the information.
 */
function handleError(error, req, res, next) {
    var code = 500;

    logger.debug(context, 'Error [%s] handling request: %s', error.name, error.message);

    if (error.code && String(error.code).match(/^[2345]\d\d$/)) {
        code = error.code;
    }

    res.status(code).json({
        name: error.name,
        message: error.message
    });
}

/**
 *  Express middleware for tracing the complete request arriving to the IoTA in debug mode.
 */
function traceRequest(req, res, next) {
    logger.debug(context, 'Request for path [%s] from [%s]', req.path, req.get('host'));

    if (req.is('json') || req.is('application/ld+json')) {
        logger.debug(context, 'Body:\n\n%s\n\n', JSON.stringify(req.body, null, 4));
    }

    next();
}

/**
 * Changes the log level to the one specified in the request.
 */
function changeLogLevel(req, res, next) {
    var levels = ['INFO', 'ERROR', 'FATAL', 'DEBUG', 'WARNING'];

    if (!req.query.level) {
        res.status(400).json({
            error: 'log level missing'
        });
    } else if (levels.indexOf(req.query.level.toUpperCase()) < 0) {
        res.status(400).json({
            error: 'invalid log level'
        });
    } else {
        logger.setLevel(req.query.level.toUpperCase());
        res.status(200).send('');
    }
}

/**
 * Return the current log level.
 */
function getLogLevel(req, res, next) {
    res.status(200).json({
        level: logger.getLevel()
    });
}

/**
 * Ensures the request type is one of the supported ones.
 */
function ensureType(req, res, next) {
    if (req.is('json')) {
        next();
    } else if (req.is('application/ld+json')) {
        next();
    } else {
        next(new errors.UnsupportedContentType(req.headers['content-type']));
    }
}

/**
 * Generates a Middleware that validates incoming requests based on the JSON Schema template passed as a parameter.
 *
 * @param {Object} template     JSON Schema template to validate the request.
 * @return {Object}            Express middleware used in request validation with the given template.
 */
function validateJson(template) {
    return function validate(req, res, next) {
        if (req.is('json') || req.is('application/ld+json')) {
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
 *  Middleware that returns all the IoTA information stored in the module.
 */
function retrieveVersion(req, res, next) {
    res.status(200).json(iotaInformation);
}

/**
 * Stores the information about the IoTAgent for further use in the `retrieveVersion()` middleware.
 *
 * @param {Object} newIoTAInfo              Object containing all the IoTA Information.
 */
function setIotaInformation(newIoTAInfo) {
    iotaInformation = newIoTAInfo;
}

exports.handleError = handleError;
exports.traceRequest = traceRequest;
exports.changeLogLevel = changeLogLevel;
exports.ensureType = ensureType;
exports.validateJson = validateJson;
exports.retrieveVersion = retrieveVersion;
exports.setIotaInformation = setIotaInformation;
exports.getLogLevel = getLogLevel;
