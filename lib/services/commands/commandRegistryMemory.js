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

let registeredCommands = {};
const async = require('async');
const apply = async.apply;
const logger = require('logops');
const intoTrans = require('../common/domain').intoTrans;
const errors = require('../../errors');
const _ = require('underscore');
const context = {
    op: 'IoTAgentNGSI.InMemoryCommandRegister'
};
let commandIds = 1;

function findCommand(service, subservice, deviceId, name) {
    const keys = Object.keys(registeredCommands).filter(function filterByCriteria(item) {
        return (
            registeredCommands[item].service === service &&
                registeredCommands[item].subservice === subservice &&
                registeredCommands[item].deviceId === deviceId,
            registeredCommands[item].name === name
        );
    });

    if (keys.length === 1) {
        return registeredCommands[keys[0]];
    }
    return null;
}

function exists(service, subservice, deviceId, name) {
    const keys = _.keys(registeredCommands);

    for (const i in keys) {
        if (
            registeredCommands[keys[i]].service === service &&
            registeredCommands[keys[i]].subservice === subservice &&
            registeredCommands[keys[i]].name === name &&
            registeredCommands[keys[i]].deviceId === deviceId
        ) {
            return true;
        }
    }

    return false;
}

function updateCommand(service, subservice, deviceId, command, callback) {
    const foundCommand = findCommand(service, subservice, deviceId, command.name);

    if (foundCommand) {
        foundCommand.type = command.type;
        foundCommand.value = command.value;

        callback(null, foundCommand);
    } else {
        const deviceInfo = {
            service,
            subservice,
            deviceId
        };
        callback(new errors.CommandNotFound(command.name, deviceInfo));
    }
}

function addCommand(service, subservice, deviceId, command, callback) {
    if (exists(service, subservice, deviceId, command.name)) {
        updateCommand(service, subservice, deviceId, command, callback);
    } else {
        const storeCommand = _.clone(command);

        storeCommand._id = commandIds++;

        registeredCommands[storeCommand._id] = storeCommand;
        registeredCommands[storeCommand._id].creationDate = Date.now();
        registeredCommands[storeCommand._id].service = service;
        registeredCommands[storeCommand._id].subservice = subservice;
        registeredCommands[storeCommand._id].deviceId = deviceId;

        logger.debug(
            context,
            'Storing device command [%s] for service [%s], subservice [%s] and deviceId [%s]',
            command.name,
            storeCommand.service,
            storeCommand.subservice,
            deviceId
        );

        callback(null);
    }
}

function getFilteredCommands(service, subservice, deviceId) {
    return Object.keys(registeredCommands).filter(function filterByCriteria(item) {
        return (
            registeredCommands[item].service === service &&
            registeredCommands[item].subservice === subservice &&
            registeredCommands[item].deviceId === deviceId
        );
    });
}

/**
 * Retrieve all the commands for a given Id in a service and subservice.
 *
 * @param {Number} service      Service for wich all the commands want to be retrieved.
 * @param {Number} subservice   Subservice where the commands are stored.
 * @param {Number} deviceId     Id of the target device for the commands.
 */
function listCommands(service, subservice, deviceId, callback) {
    const result = [];
    const filteredCommands = getFilteredCommands(service, subservice, deviceId);

    for (const i in filteredCommands) {
        result.push(registeredCommands[filteredCommands[i]]);
    }

    callback(null, {
        count: filteredCommands.length,
        commands: result
    });
}

function remove(service, subservice, deviceId, name, callback) {
    const foundCommand = findCommand(service, subservice, deviceId, name);

    if (foundCommand) {
        delete registeredCommands[foundCommand._id];
        callback(null, foundCommand);
    } else {
        const deviceInfo = {
            service,
            subservice,
            deviceId
        };
        callback(new errors.CommandNotFound(name, deviceInfo));
    }
}

function clear(callback) {
    registeredCommands = {};

    callback();
}

function getExpiredCommands(creationDate) {
    return Object.keys(registeredCommands).filter(function filterByDate(item) {
        return registeredCommands[item].creationDate < creationDate;
    });
}

function removeFromDate(creationDate, callback) {
    const expiredCommands = getExpiredCommands(creationDate);
    const removalOrders = [];

    for (const i in expiredCommands) {
        removalOrders.push(
            apply(
                remove,
                registeredCommands[expiredCommands[i]].service,
                registeredCommands[expiredCommands[i]].subservice,
                registeredCommands[expiredCommands[i]].deviceId,
                registeredCommands[expiredCommands[i]].name
            )
        );
    }

    async.series(removalOrders, function (error) {
        if (error) {
            callback(error);
        } else {
            callback(null, expiredCommands);
        }
    });
}

exports.add = intoTrans(context, addCommand);
exports.list = intoTrans(context, listCommands);
exports.remove = intoTrans(context, remove);
exports.clear = intoTrans(context, clear);
exports.removeFromDate = intoTrans(context, removeFromDate);
