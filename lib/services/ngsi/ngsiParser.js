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
 * please contact with::[contacto@tid.es]
 */
'use strict';

/*jshint unused:false*/
var async = require('async'),
    errors = require('../../errors'),
    logger = require('logops'),
    intoTrans = require('../common/domain').intoTrans,
    context = {
        op: 'IoTAgentNGSI.NGSIParser'
    };

/**
 * Given a NGSI Body, determines whether it contains any NGSI error.
 *
 * @param {String} body             String representing a NGSI body in JSON format.
 * @return {Number|*}
 */
function getErrorField(body) {
    var errorField = body.errorCode ||
        body.orionError;

    if (body && body.contextResponses) {
        for (var i in body.contextResponses) {
            if (body.contextResponses[i].statusCode && body.contextResponses[i].statusCode.code !== '200') {
                errorField = body.contextResponses[i].statusCode;
            }
        }
    }

    return errorField;
}

exports.getErrorField = intoTrans(context, getErrorField);
