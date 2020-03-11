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

const logger = require('logops');
const errors = require('../../errors');
var constants = require('../../constants');
const intoTrans = require('../common/domain').intoTrans;
const revalidator = require('revalidator');
const moment = require('moment');
const context = {
    op: 'IoTAgentNGSI.RestUtils'
};
const _ = require('underscore');
const request = require('request');
const async = require('async');
const apply = async.apply;
var constants = require('../../constants');
const ngsiService = require('../ngsi/ngsiService');
const config = require('../../commonConfig');

/**
 * Checks all the mandatory attributes in the selected array are present in the presented body object.
 *
 * @param {Array}  mandatoryAttributes      List of the names of the attributes that must be present in the body.
 * @param {Object} body                     Body whose attributes are going to be checked.
 */
function checkMandatoryQueryParams(mandatoryAttributes, body, callback) {
    const missing = [];

    for (const p in mandatoryAttributes) {
        let found = false;

        for (const i in body) {
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
        const error = new errors.MissingAttributes('Missing attributes: ' + JSON.stringify(missing));
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
        const headerKeys = _.keys(req[attribute]);
        const missing = [];

        for (let i = 0; i < mandatoryAttributes.length; i++) {
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
        const errorList = revalidator.validate(req.body, template);

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
    for (const i in payload.contextElements[0].attributes) {
        if (
            payload.contextElements[0].attributes[i].name === constants.TIMESTAMP_ATTRIBUTE &&
            !moment(payload.contextElements[0].attributes[i].value, moment.ISO_8601).isValid()
        ) {
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
        for (const i in entity) {
            if (entity.hasOwnProperty(i)) {
                if (i === constants.TIMESTAMP_ATTRIBUTE && !moment(entity[i].value, moment.ISO_8601).isValid()) {
                    return false;
                }
            }
        }

        return true;
    }

    if (payload instanceof Array) {
        for (let i = 0; i < payload.length; i++) {
            if (!isValidTimestampedNgsi2Entity(payload[i])) {
                return false;
            }
        }

        return true;
    }
    return isValidTimestampedNgsi2Entity(payload);
}

/**
 * Checks if timestamp attributes are included in NGSIv1 entities.
 *
 * @param {Object} payload         NGSIv1 payload to be analyzed.
 * @return {Boolean}               true if timestamp attributes are included. false if not.
 */
function isTimestamped(payload) {
    for (const i in payload.contextElements[0].attributes) {
        if (payload.contextElements[0].attributes[i].name === constants.TIMESTAMP_ATTRIBUTE) {
            return true;
        }
    }

    return false;
}

/**
 * Checks if timestamp attributes are included in NGSIv2 entities.
 *
 * @param {Object} payload         NGSIv2 payload to be analyzed.
 * @return {Boolean}               true if timestamp attributes are included. false if not.
 */
function isTimestampedNgsi2(payload) {
    function isTimestampedNgsi2Entity(entity) {
        for (const i in entity) {
            if (entity.hasOwnProperty(i)) {
                if (i === constants.TIMESTAMP_ATTRIBUTE) {
                    return true;
                }
            }
        }

        return false;
    }

    if (payload instanceof Array) {
        for (let i = 0; i < payload.length; i++) {
            if (!isTimestampedNgsi2Entity(payload[i])) {
                return false;
            }
        }

        return true;
    }
    return isTimestampedNgsi2Entity(payload);
}

/**
 * Executes a request operation using security information if available
 *
 * @param {String} requestOptions   Request options to be sent.
 * @param {String} deviceData       Device data.
 */
function executeWithSecurity(requestOptions, deviceData, callback) {
    logger.debug(context, 'executeWithSecurity');
    config.getGroupRegistry().getType(deviceData.type, function(error, deviceGroup) {
        let typeInformation;
        if (error) {
            logger.debug(context, 'error %j in get group device', error);
        }

        if (deviceGroup) {
            typeInformation = deviceGroup;
        } else {
            typeInformation = config.getConfig().types[deviceData.type];
        }

        if (config.getConfig().authentication && config.getConfig().authentication.enabled) {
            const security = config.getSecurityService();
            if (typeInformation && typeInformation.trust) {
                async.waterfall(
                    [
                        apply(security.auth, typeInformation.trust),
                        apply(ngsiService.updateTrust, deviceGroup, null, typeInformation.trust),
                        apply(security.getToken, typeInformation.trust)
                    ],
                    function(error, token) {
                        if (error) {
                            callback(new errors.SecurityInformationMissing(typeInformation.type));
                        } else {
                            requestOptions.headers[config.getConfig().authentication.header] = token;
                            request(requestOptions, callback);
                        }
                    }
                );
            } else {
                callback(
                    new errors.SecurityInformationMissing(typeInformation ? typeInformation.type : deviceData.type)
                );
            }
        } else {
            request(requestOptions, callback);
        }
    });
}

exports.executeWithSecurity = executeWithSecurity;
exports.checkMandatoryQueryParams = intoTrans(context, checkMandatoryQueryParams);
exports.checkRequestAttributes = intoTrans(context, checkRequestAttributes);
exports.checkBody = intoTrans(context, checkBody);
exports.isTimestamped = isTimestamped;
exports.IsValidTimestamped = IsValidTimestamped;
exports.isTimestampedNgsi2 = isTimestampedNgsi2;
exports.IsValidTimestampedNgsi2 = IsValidTimestampedNgsi2;
