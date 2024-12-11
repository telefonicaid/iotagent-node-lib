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

const logger = require('logops');
const mongoose = require('mongoose');
const intoTrans = require('../common/domain').intoTrans;
const errors = require('../../errors');
const Command = require('../../model/Command');
const async = require('async');
const context = {
    op: 'IoTAgentNGSI.MongoDBCommandRegister'
};

function findCommand(service, subservice, deviceId, name, callback) {
    const queryObj = {
        service,
        subservice,
        deviceId,
        name
    };

    logger.debug(context, 'Looking for command [%s] for device [%s] with [%j]', name, deviceId, queryObj);

    const query = Command.model.findOne(queryObj);

    query.select({ __v: 0 });

    query
        .exec({})
        .then((data) => {
            if (data) {
                callback(null, data);
            } else {
                logger.debug(
                    context,
                    'Command for DeviceID [%j] with name [%j] not found with [%j]',
                    deviceId,
                    name,
                    queryObj
                );
                callback(new errors.CommandNotFound(name, queryObj));
            }
        })
        .catch((error) => {
            logger.debug(context, 'Internal MongoDB Error getting command: %s', error);
            callback(new errors.InternalDbError(error));
        });
}

function updateCommand(service, subservice, deviceId, command, callback) {
    findCommand(service, subservice, deviceId, command.name, function (error, commandDAO) {
        if (error) {
            callback(error);
        } else {
            commandDAO.value = command.value;

            commandDAO
                .save({})
                .then((commandDAOs) => {
                    callback(null, commandDAOs.toObject());
                })
                .catch((error) => {
                    callback(error);
                });
        }
    });
}

function createCommand(service, subservice, deviceId, command, callback) {
    /* eslint-disable-next-line new-cap */
    const commandObj = new Command.model();
    const attributeList = ['name', 'type', 'value'];

    for (let i = 0; i < attributeList.length; i++) {
        commandObj[attributeList[i]] = command[attributeList[i]];
    }

    commandObj.deviceId = deviceId;
    commandObj.service = service;
    commandObj.subservice = subservice;

    logger.debug(context, 'Storing command for deviceId [%s] with name [%s]', deviceId, command.name);

    commandObj
        .save({})
        .then((commandDAO) => {
            callback(null, commandDAO.toObject());
        })
        .catch((error) => {
            logger.debug(context, 'Error storing command information: %s', error);
            callback(new errors.InternalDbError(error));
        });
}

function addCommand(service, subservice, deviceId, command, callback) {
    findCommand(service, subservice, deviceId, command.name, function (error) {
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
    const condition = {};

    function toObjectFn(obj) {
        return obj.toObject();
    }

    condition.service = service;
    condition.subservice = subservice;
    condition.deviceId = deviceId;

    const query = Command.model.find(condition).sort();
    const queryCount = Command.model.countDocuments(condition);
    function funcQuery(cb) {
        query
            .exec({})
            .then((res) => {
                cb(null, res);
            })
            .catch((error) => {
                cb(error);
            });
    }
    function funcQueryCount(cb) {
        queryCount
            .exec({})
            .then((res) => {
                cb(null, res);
            })
            .catch((error) => {
                cb(error);
            });
    }
    async.series([funcQuery, funcQueryCount], function (error, results) {
        callback(error, {
            count: results[1],
            commands: results[0].map(toObjectFn)
        });
    });
}

function remove(service, subservice, deviceId, name, callback) {
    logger.debug(
        context,
        'Removing command for service [%s] subservice [%s] and DeviceID [%s] with name [%s]',
        service,
        subservice,
        deviceId,
        name
    );

    findCommand(service, subservice, deviceId, name, function (error, command) {
        if (error) {
            callback(error);
        } else {
            const query = Command.model.deleteOne({ _id: command._id });
            query
                .exec({})
                .then((commandResult) => {
                    if (commandResult && commandResult.result && commandResult.result.n === 1) {
                        logger.debug(context, 'Command [%s] successfully removed.', name);

                        callback(null, commandResult);
                    } else {
                        const deviceInfo = {
                            service,
                            subservice,
                            deviceId,
                            name
                        };
                        logger.debug(context, 'Command [%s] not found for removal with %j', name, deviceInfo);
                        callback(new errors.CommandNotFound(name, deviceInfo));
                    }
                })
                .catch((error) => {
                    logger.debug(context, 'Internal MongoDB Error getting command: %s', error);
                    callback(new errors.InternalDbError(error));
                });
        }
    });
}

function listToObject(commandList) {
    const result = [];

    for (let i = 0; i < commandList.length; i++) {
        result.push(commandList[i].toObject());
    }

    return result;
}

function removeFromDate(creationDate, callback) {
    const condition = { creationDate: { $lt: creationDate } };

    if (Command.model) {
        const query = Command.model.find(condition);
        query
            .exec({})
            .then((commandList) => {
                if (commandList && commandList.length > 0) {
                    const queryDel = Command.model.deleteOne(condition);
                    queryDel
                        .exec({})
                        .then(() => {
                            logger.debug(
                                context,
                                'Expired commands successfully removed from MongoDB for date [%s]',
                                creationDate
                            );
                            callback(null, listToObject(commandList));
                        })
                        .catch((error) => {
                            logger.debug(context, 'Internal MongoDB Error removing expired commands: %s', error);
                            callback(new errors.InternalDbError(error));
                        });
                }
            })
            .catch((error) => {
                logger.debug(context, 'Internal MongoDB Error looking for expired commands: %s', error);
            });
    } else {
        callback(null, []);
    }
}

function clear(callback) {
    mongoose.connection
        .dropDatabase()
        .then(() => {
            callback(null);
        })
        .catch((error) => {
            callback(error);
        });
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
