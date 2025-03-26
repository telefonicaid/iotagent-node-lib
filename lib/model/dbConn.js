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
 */

/**
 * This module sets up the connection with the mongodb through mongoose. This connection will be used
 * in mongoose schemas to persist objects.
 */

const mongoose = require('mongoose');
const config = require('../commonConfig');
const constants = require('../constants');
const alarms = require('../services/common/alarmManagement');
const logger = require('logops');
const errors = require('../errors');
let defaultDb;
const DEFAULT_DB_NAME = 'iotagent';
const context = {
    op: 'IoTAgentNGSI.DbConn'
};

function loadModels() {
    require('./Device').load();
    require('./Group').load();
    require('./Command').load();
}

/**
 * Creates a new connection to the Mongo DB.
 *
 * @this Reference to the dbConn module itself.
 */

function init(host, db, port, options, callback) {
    let url;
    let retries = 0;
    let lastError;
    const maxRetries = config.getConfig().mongodb?.retries || constants.DEFAULT_MONGODB_RETRIES;

    function addPort(item) {
        return `${item}:${port}`;
    }

    url = 'mongodb://';

    if (options.auth) {
        url += `${encodeURIComponent(options.auth.user)}:${encodeURIComponent(options.auth.password)}@`;
    }

    const hosts = host.split(',').map(addPort).join(',');
    url += `${hosts}/${db}`;

    if (options.extraArgs) {
        const query = new URLSearchParams(options.extraArgs).toString();
        if (query) {
            url += `?${query}`;
        }
        delete options.extraArgs;
    }

    function connectionAttempt(callback) {
        logger.info(context, `Attempting to connect to MongoDB at ${url}. Attempt ${retries + 1}`);

        mongoose
            .connect(url, options)
            .then(() => {
                defaultDb = mongoose.connection;
                logger.info(context, 'Successfully connected to MongoDB.');
                loadModels();
                defaultDb.on('error', function (error) {
                    logger.error(context, 'Mongo Driver error: %j', error);
                    lastError = error;
                    alarms.raise(constants.MONGO_ALARM, error);
                });
                /* eslint-disable-next-line no-unused-vars */
                defaultDb.on('connecting', function (error) {
                    logger.debug(context, 'Mongo Driver connecting');
                });
                defaultDb.on('connected', function () {
                    logger.debug(context, 'Mongo Driver connected');
                });
                defaultDb.on('reconnected', function () {
                    logger.debug(context, 'Mongo Driver reconnected');
                });
                defaultDb.on('disconnected', function () {
                    logger.debug(context, 'Mongo Driver disconnected');
                });
                defaultDb.on('reconnectFailed', function () {
                    logger.error(context, 'MONGODB-004: MongoDB connection was lost');
                    process.exit(1);
                });
                defaultDb.on('disconnecting', function () {
                    logger.debug(context, 'Mongo Driver disconnecting');
                });
                defaultDb.on('open', function () {
                    logger.debug(context, 'Mongo Driver open');
                });
                defaultDb.on('close', function () {
                    logger.debug(context, 'Mongo Driver close');
                });
                callback();
            })
            .catch((err) => {
                logger.error(context, `MONGODB-001: Error trying to connect to MongoDB: ${err}`);
                lastError = err;
                retries++;
                if (retries < maxRetries) {
                    const retryTime = config.getConfig().mongodb?.retryTime || constants.DEFAULT_MONGODB_RETRY_TIME;
                    logger.info(context, `Retrying in ${retryTime} seconds...`);
                    setTimeout(() => connectionAttempt(callback), retryTime * 1000);
                } else {
                    logger.error(
                        context,
                        'MONGODB-002: Error to connect found after %d attempts: %s',
                        retries,
                        lastError
                    );
                    callback(err);
                }
            });
    }

    connectionAttempt(callback);
}

function configureDb(callback) {
    const currentConfig = config.getConfig();
    if (currentConfig.deviceRegistry?.type === 'mongodb') {
        if (!currentConfig.mongodb?.host) {
            logger.fatal(context, 'MONGODB-003: No host found for MongoDB driver.');
            callback(new errors.BadConfiguration('No host found for MongoDB driver'));
        } else {
            const dbName = currentConfig.mongodb.db || DEFAULT_DB_NAME;
            const port = currentConfig.mongodb.port || 27017;
            const options = {};

            if (currentConfig.mongodb.replicaSet) options.replicaSet = currentConfig.mongodb.replicaSet;
            if (currentConfig.mongodb.ssl) options.ssl = currentConfig.mongodb.ssl;
            if (currentConfig.mongodb.extraArgs) options.extraArgs = currentConfig.mongodb.extraArgs;

            if (currentConfig.mongodb.user && currentConfig.mongodb.password) {
                options.auth = {
                    user: currentConfig.mongodb.user,
                    password: currentConfig.mongodb.password
                };
                if (currentConfig.mongodb.authSource) {
                    options.extraArgs = {
                        ...options.extraArgs,
                        authSource: currentConfig.mongodb.authSource
                    };
                }
            }

            init(currentConfig.mongodb.host, dbName, port, options, callback);
        }
    } else {
        callback();
    }
}

exports.configureDb = configureDb;
exports.db = defaultDb;
exports.DEFAULT_DB_NAME = DEFAULT_DB_NAME;
