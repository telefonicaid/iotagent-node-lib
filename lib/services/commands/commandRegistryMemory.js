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

var registeredCommands = {},
    logger = require('logops'),
    intoTrans = require('../common/domain').intoTrans,
    errors = require('../../errors'),
    _ = require('underscore'),
    context = {
        op: 'IoTAgentNGSI.InMemoryCommandRegister'
    },
    commandIds = 1;

function exists(command) {
    var keys = _.keys(registeredCommands);

    for (var i in keys) {
        if (registeredCommands[keys[i]].service === command.service &&
            registeredCommands[keys[i]].subservice === command.subservice &&
            registeredCommands[keys[i]].name === command.name &&
            registeredCommands[keys[i]].deviceId === command.deviceId) {
            return true;
        }
    }

    return false;
}

function addCommand(service, subservice, deviceId, command, callback) {
    if (exists(command)) {
        callback(new errors.DuplicateCommand(command.resource, command.apikey));
    } else {
        var storeCommand = _.clone(command);

        storeCommand._id = commandIds++;

        registeredCommands[storeCommand._id] = storeCommand;
        registeredCommands[storeCommand._id].creationDate = Date.now();
        registeredCommands[storeCommand._id].service = service;
        registeredCommands[storeCommand._id].subservice = subservice;
        registeredCommands[storeCommand._id].deviceId = deviceId;

        logger.debug('Storing device command [%s] for service [%s], subservice [%s] and deviceId [%s]',
            command.name, storeCommand.service, storeCommand.subservice, deviceId);

        callback(null);
    }
}

function getFilteredCommands(service, subservice, deviceId) {
    return Object.keys(registeredCommands).filter(function filterByCriteria(item) {
        return registeredCommands[item].service === service &&
            registeredCommands[item].subservice === subservice &&
            registeredCommands[item].deviceId === deviceId;
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
    var result = [],
        filteredCommands = getFilteredCommands(service, subservice, deviceId);

    for (var i in filteredCommands) {
        result.push(registeredCommands[filteredCommands[i]]);
    }

    callback(null, {
        count: filteredCommands.length,
        commands: result
    });
}

function remove(id, callback) {
    var removedObject = registeredCommands[id];
    delete registeredCommands[id];

    callback(null, removedObject);
}

function clear(callback) {
    registeredCommands = {};

    callback();
}

exports.add = intoTrans(context, addCommand);
exports.list = intoTrans(context, listCommands);
exports.remove = intoTrans(context, remove);
exports.clear = intoTrans(context, clear);