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

var logger = require('logops'),
    dbService = require('../../model/dbConn'),
    intoTrans = require('../common/domain').intoTrans,
    errors = require('../../errors'),
    Command = require('../../model/Command'),
    async = require('async'),
    context = {
        op: 'IoTAgentNGSI.MongoDBCommandRegister'
    };

function findCommand(service, subservice, deviceId, name, callback) {
    var query,
        queryObj = {
            service: service,
            subservice: subservice,
            deviceId: deviceId,
            name: name
        };

    logger.debug(context, 'Looking for command [%s] for device [%s]', name, deviceId);

    query = Command.model.findOne(queryObj);

    query.select({__v: 0});

    query.exec(function handleGet(error, data) {
        if (error) {
            logger.debug(context, 'Internal MongoDB Error getting command: %s', error);

            callback(new errors.InternalDbError(error));
        } else if (data) {
            callback(null, data);
        } else {
            logger.debug(context, 'Command for DeviceID [%j] with name [%j] not found', deviceId, name);

            callback(new errors.CommandNotFound());
        }
    });
}

function updateCommand(service, subservice, deviceId, command, callback) {
    findCommand(service, subservice, deviceId, command.name, function(error, commandDAO) {
        if (error) {
            callback(error);
        } else {
            commandDAO.value = command.value;

            commandDAO.save(function(error) {
                callback(error, commandDAO.toObject());
            });
        }
    });
}

function createCommand(service, subservice, deviceId, command, callback) {
    var commandObj = new Command.model(),
        attributeList = [
            'name',
            'type',
            'value'
        ];

    for (var i = 0; i < attributeList.length; i++) {
        commandObj[attributeList[i]] = command[attributeList[i]];
    }

    commandObj.deviceId = deviceId;
    commandObj.service = service;
    commandObj.subservice = subservice;

    logger.debug(context, 'Storing command for deviceId [%s] with name [%s]', deviceId, command.name);

    commandObj.save(function saveHandler(error, commandDAO) {
        if (error) {
            logger.debug(context, 'Error storing command information: %s', error);

            callback(new errors.InternalDbError(error));
        } else {
            callback(null, commandDAO.toObject());
        }
    });
}

function addCommand(service, subservice, deviceId, command, callback) {
    findCommand(service, subservice, deviceId, command.name, function(error) {
        if (error && error.name === 'COMMAND_NOT_FOUND') {
            createCommand(service, subservice, deviceId, command, callback);
        } else if (!error) {
            updateCommand(service, subservice, deviceId, command, callback);
        } else {
            callback(error);
        }
    });
}

function listCommands(service, subservice, deviceId, callback) {
    var condition = {},
        query;

    function toObjectFn(obj) {
        return obj.toObject();
    }

    condition.service = service;
    condition.subservice = subservice;
    condition.deviceId = deviceId;

    query = Command.model.find(condition).sort();

    async.series([
        query.exec.bind(query),
        Command.model.count.bind(Command.model, condition)
    ], function(error, results) {
        callback(error, {
            count: results[1],
            commands: results[0].map(toObjectFn)
        });
    });
}

function remove(service, subservice, deviceId, name, callback) {
    logger.debug(context, 'Removing command for service [%s] subservice [%s] and DeviceID [%s] with name [%s]',
        service, subservice, deviceId, name);

    findCommand(service, subservice, deviceId, name, function(error, command) {
        if (error) {
            callback(error);
        } else {
            Command.model.remove({ _id: command._id }, function(error, commandResult) {
                if (error) {
                    logger.debug(context, 'Internal MongoDB Error getting command: %s', error);

                    callback(new errors.InternalDbError(error));
                } else if (commandResult && commandResult.result && commandResult.result.n === 1) {
                    logger.debug(context, 'Command [%s] successfully removed.', name);

                    callback(null, commandResult);
                } else {
                    logger.debug(context, 'Entity [%s] not found for removal.', name);

                    callback(new errors.CommandNotFound(name));
                }
            });
        }
    });
}

function listToObject(commandList) {
    var result = [];

    for (var i = 0; i < commandList.length; i++) {
        result.push(commandList[i].toObject());
    }

    return result;
}

function removeFromDate(creationDate, callback) {
    var query = { creationDate: { $lt: creationDate } };

    if (Command.model) {
        Command.model.find(query).exec(function(error, commandList) {
            if (!error && commandList && commandList.length > 0) {
                Command.model.remove(query, function(error, commandResult) {
                    if (error) {
                        logger.debug(context, 'Internal MongoDB Error removing expired commands: %s', error);

                        callback(new errors.InternalDbError(error));
                    } else if (commandResult && commandResult.result && commandResult.result.n > 0) {
                        logger.debug(context, 'Expired commands successfully removed from MongoDB for date [%s]',
                            creationDate);

                        callback(null, listToObject(commandList));
                    } else {
                        logger.debug(context, 'Expired commands not found for removal for date [%s]', creationDate);

                        callback(new errors.CommandNotFound('Expired'));
                    }
                });
            }
        });
    } else {
        callback(null, []);
    }
}

function clear(callback) {
    dbService.db.db.dropDatabase(callback);
}

function init(newConfig, callback) {
    callback(null);
}

exports.init = intoTrans(context, init);
exports.add = intoTrans(context, addCommand);
exports.list = intoTrans(context, listCommands);
exports.remove = intoTrans(context, remove);
exports.clear = intoTrans(context, clear);
exports.removeFromDate = intoTrans(context, removeFromDate);
