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
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 *
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */
'use strict';

var logger = require('logops'),
    errors = require('../../errors'),
    constants = require('../../constants'),
    intoTrans = require('../common/domain').intoTrans,
    revalidator = require('revalidator'),
    moment = require('moment'),
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

/**
 * Checks if the timestamp properties of NGSIv1 entities are valid ISO8601 dates.
 *
 * @param {Object} payload         NGSIv1 payload to be analyzed.
 * @return {Boolean}               true if timestamp attributes are valid ISO8601. false if not.
 */
function IsValidTimestamped(payload) {
    for (var i in payload.contextElements[0].attributes) {
        if (payload.contextElements[0].attributes[i].name === constants.TIMESTAMP_ATTRIBUTE &&
            ! moment(payload.contextElements[0].attributes[i].value, moment.ISO_8601).isValid()) {
            return false;
        }
    }

    return true;
}

/**
 * Checks if the timestamp properties of NGSIv2 entities are valid ISO8601 dates.
 *
 * @param {Object} payload         NGSIv2 payload to be analyzed.
 * @return {Boolean}               true if timestamp attributes are valid ISO8601. false if not.
 */
function IsValidTimestampedNgsi2(payload) {
    function isValidTimestampedNgsi2Entity(entity) {
        for (var i in entity) {
            if (entity.hasOwnProperty(i)) {
                if (i === constants.TIMESTAMP_ATTRIBUTE &&
                    ! moment(entity[i].value, moment.ISO_8601).isValid()) {
                    return false;
                }
            }
        }

        return true;
    }

    if (payload instanceof Array) {
        for (var i = 0; i < payload.length; i++) {
            if (!isValidTimestampedNgsi2Entity(payload[i])) {
                return false;
            }
        }

        return true;
    } else {
        return isValidTimestampedNgsi2Entity(payload);
    }
}

/**
 * Checks if timestamp attributes are included in NGSIv1 entities.
 *
 * @param {Object} payload         NGSIv1 payload to be analyzed.
 * @return {Boolean}               true if timestamp attributes are included. false if not.
 */
function isTimestamped(payload) {
    for (var i in payload.contextElements[0].attributes) {
        if (payload.contextElements[0].attributes[i].name === constants.TIMESTAMP_ATTRIBUTE) {
            return true;
        }
    }

    return false;
}

/**
 * Checks if timestamp attributes are included in NGSIv2 entities.
 *
 * @param {Object} payload         NGSIv1 payload to be analyzed.
 * @return {Boolean}               true if timestamp attributes are included. false if not.
 */
function isTimestampedNgsi2(payload) {

    function isTimestampedNgsi2Entity(entity) {
        for (var i in entity) {
            if (entity.hasOwnProperty(i)) {
                if (i === constants.TIMESTAMP_ATTRIBUTE) {
                    return true;
                }
            }
        }

        return false;
    }

    if (payload instanceof Array) {
        for (var i = 0; i < payload.length; i++) {
            if (!isTimestampedNgsi2Entity(payload[i])) {
                return false;
            }
        }

        return true;
    } else {
        return isTimestampedNgsi2Entity(payload);
    }
}

exports.checkMandatoryQueryParams = intoTrans(context, checkMandatoryQueryParams);
exports.checkRequestAttributes = intoTrans(context, checkRequestAttributes);
exports.checkBody = intoTrans(context, checkBody);
exports.isTimestamped = isTimestamped;
exports.IsValidTimestamped = IsValidTimestamped;
exports.isTimestampedNgsi2 = isTimestampedNgsi2;
exports.IsValidTimestampedNgsi2 = IsValidTimestampedNgsi2;
