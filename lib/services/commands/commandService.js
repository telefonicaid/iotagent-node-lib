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
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 */

'use strict';

var async = require('async'),
    intoTrans = require('../common/domain').intoTrans,
    logger = require('logops'),
    config = require('../../commonConfig'),
    errors = require('../../errors'),
    context = {
        op: 'IoTAgentNGSI.CommandService'
    };

function listGroups(service, subservice, deviceId, callback) {
    config.getCommandRegistry().list(service, subservice, deviceId, callback);
}

function addCommand(service, subservice, deviceId, command, callback) {
    config.getCommandRegistry().add(service, subservice, deviceId, command, callback);
}

function updateCommand(id, callback) {
    config.getCommandRegistry().update(id, callback);
}

exports.list = intoTrans(context, listGroups);
exports.add = addCommand;
exports.update = updateCommand;