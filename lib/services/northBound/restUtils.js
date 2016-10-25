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

var logger = require('logops'),
    errors = require('../../errors'),
    constants = require('../../constants'),
    intoTrans = require('../common/domain').intoTrans,
    revalidator = require('revalidator'),
    context = {
        op: 'IoTAgentNGSI.RestUtils'
    },
    _ = require('underscore');

/**
 * Checks all the mandatory attributes in the selected array are present in the presented body object.
 *
 * @param {Array}  mandatoryAttributes      List of the names of the attributes that must be present in the body.
 * @param {Object} body                     Body whose attributes are going to be checked.
 */
function checkMandatoryQueryParams(mandatoryAttributes, body, callback) {
    var missing = [];

    for (var p in mandatoryAttributes) {
        var found = false;

        for (var i in body) {
            if (body.hasOwnProperty(i)) {
                if (i === mandatoryAttributes[p]) {
                    found = true;
                }
            }
        }

        if (!found) {
            missing.push(mandatoryAttributes[p]);
        }
    }

    if (missing.length !== 0) {
        var error = new errors.MissingAttributes('Missing attributes: ' + JSON.stringify(missing));
        error.code = '400';

        callback(error);
    } else {
        callback(null, body);
    }
}

/**
 * Middleware that makes Express read the incoming body if the content-type is text/xml or application/xml (the default
 * behavior is to read the body if it can be parsed and leave it unread in any other case).
 *
 * @param {Object} req           Incoming request.
 * @param {Object} res           Outgoing response.
 * @param {Function} next        Invokes the next middleware in the chain.
 */
function xmlRawBody(req, res, next) {
    if (!req.is('xml')) {
        next();
    } else {
        var data = '';
        req.setEncoding('utf8');
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            req.rawBody = data;
            next();
        });
    }
}

/**
 * Generates a Express middleware that checks for the pressence of all the mandatory attributes of a certain kind
 * (headers, query params, and so), returning a BAD_REQUEST error if any one is not found. The kind of attribute
 * to check can be specified with the 'attribute' parameter.
 *
 * @param {Array} attribute                     Request attribute against which the list will be matched.
 * @param {Array} mandatoryAttributes           List of mandatory headers.
 * @return {Function}                           The generated middleware.
 */
function checkRequestAttributes(attribute, mandatoryAttributes) {
    return function headerChecker(req, res, next) {
        var headerKeys = _.keys(req[attribute]),
            missing = [];

        for (var i = 0; i < mandatoryAttributes.length; i++) {
            if (headerKeys.indexOf(mandatoryAttributes[i]) < 0) {
                missing.push(mandatoryAttributes[i]);
            }
        }

        if (missing.length !== 0) {
            next(new errors.MissingHeaders(JSON.stringify(missing)));
        } else {
            next();
        }
    };
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

function isTimestamped(payload) {
    for (var i in payload.contextElements[0].attributes) {
        if (payload.contextElements[0].attributes[i].name === constants.TIMESTAMP_ATTRIBUTE) {
            return true;
        }
    }

    return false;
}

exports.checkMandatoryQueryParams = intoTrans(context, checkMandatoryQueryParams);
exports.xmlRawBody = intoTrans(context, xmlRawBody);
exports.checkRequestAttributes = intoTrans(context, checkRequestAttributes);
exports.checkBody = intoTrans(context, checkBody);
exports.isTimestamped = isTimestamped;
