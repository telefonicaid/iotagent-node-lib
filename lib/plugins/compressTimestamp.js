
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

var pluginUtils = require('./pluginUtils'),
    constants = require('../constants');

/**
 * Takes a string representation of a date in ISO8601 basic calendar format and transforms it into
 * the extended format (with separators).
 *
 * @param {String} date         Date in basic format.
 * @return {String}             Date in extended format.
 */
function fromBasicToExtended(date) {
    var split = date.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);

    if (split) {
        return '+00' + split[1] + '-' + split[2] + '-' + split[3] + 'T' +
            split[4] + ':' + split[5] + ':' + split[6];
    } else {
        return null;
    }
}

/**
 * Takes a string representation of a date in ISO8601 extended calendar format and transforms it into
 * the basic format (without separators).
 *
 * @param {String} date         Date in extended format.
 * @return {String}             Date in basic format.
 */
function fromExtendedToBasic(date) {
    var split = date.match(/\+00(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);

    if (split) {
        return split[1] + split[2] + split[3] + 'T' + split[4] + split[5] + split[6];
    } else {
        return null;
    }
}

exports.update = pluginUtils.createUpdateFilter(fromBasicToExtended, constants.TIMESTAMP_TYPE);
exports.query = pluginUtils.createQueryFilter(fromExtendedToBasic, constants.TIMESTAMP_TYPE);
