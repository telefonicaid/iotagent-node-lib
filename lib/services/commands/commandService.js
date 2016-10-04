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

var intoTrans = require('../common/domain').intoTrans,
    logger = require('logops'),
    config = require('../../commonConfig'),
    daemonId,
    context = {
        op: 'IoTAgentNGSI.CommandService'
    };

function listCommands(service, subservice, deviceId, callback) {
    logger.debug(context, 'Listing all commands for device [%s]', deviceId);

    config.getCommandRegistry().list(service, subservice, deviceId, callback);
}

function addCommand(service, subservice, deviceId, command, callback) {
    logger.debug(context, 'Adding command [%s] to the queue for device [%s]', command.name, deviceId);

    config.getCommandRegistry().add(service, subservice, deviceId, command, callback);
}

function updateCommand(service, subservice, deviceId, name, value, callback) {
    logger.debug(context, 'Updating command [%] for device [%s] with value [%s]', deviceId, name, value);

    config.getCommandRegistry().update(service, subservice, deviceId, value, callback);
}

function removeCommand(service, subservice, deviceId, name, callback) {
    logger.debug(context, 'Removing command [%] from device [%s]', deviceId, name);

    config.getCommandRegistry().remove(service, subservice, deviceId, name, callback);
}

function expirationDaemon() {
    if (config.getConfig().pollingExpiration) {
        config.getCommandRegistry().removeFromDate(Date.now() - config.getConfig().pollingExpiration, function(error) {
            logger.debug(context, 'Executed expiration daemon');
        });
    }
}

function startExpirationDaemon(callback) {
    if (config.getConfig().pollingDaemonFrequency) {
        daemonId = setInterval(expirationDaemon, config.getConfig().pollingDaemonFrequency);

        if (callback) {
            callback();
        }
    }
}

function stopExpirationDaemon(callback) {
    if (daemonId) {
        clearInterval(daemonId);
    }

    if (callback) {
        callback();
    }
}

exports.list = intoTrans(context, listCommands);
exports.add = addCommand;
exports.update = updateCommand;
exports.remove = removeCommand;
exports.start = startExpirationDaemon;
exports.stop = stopExpirationDaemon;
