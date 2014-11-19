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

var errors = require('../errors');

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
        var error = new errors.BadRequestError('Missing attributes: ');
        error.code = '400';

        callback(error);
    } else {
        callback(null, body);
    }
}

exports.checkMandatoryQueryParams = checkMandatoryQueryParams;
