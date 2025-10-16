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

/*
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
function init(host, db, port, options, callback, fullUri = null) {
    let url;
    let retries = 0;
    let lastError;
    const maxRetries = config.getConfig().mongodb?.retries || constants.DEFAULT_MONGODB_RETRIES;

    if (fullUri) {
        url = fullUri;
    } else {
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
                defaultDb.on('connecting', () => logger.debug(context, 'Mongo Driver connecting'));
                defaultDb.on('connected', () => logger.debug(context, 'Mongo Driver connected'));
                defaultDb.on('reconnected', () => logger.debug(context, 'Mongo Driver reconnected'));
                defaultDb.on('disconnected', () => logger.debug(context, 'Mongo Driver disconnected'));
                defaultDb.on('reconnectFailed', () => {
                    logger.error(context, 'MONGODB-004: MongoDB connection was lost');
                    process.exit(1);
                });
                defaultDb.on('disconnecting', () => logger.debug(context, 'Mongo Driver disconnecting'));
                defaultDb.on('open', () => logger.debug(context, 'Mongo Driver open'));
                defaultDb.on('close', () => logger.debug(context, 'Mongo Driver close'));
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
        const mongoCfg = currentConfig.mongodb;

        if (mongoCfg?.uri) {
            const options = {};
            logger.info(context, `Using full MongoDB URI from configuration`);
            init(null, null, null, options, callback, mongoCfg.uri);
            return;
        }

        if (!mongoCfg?.host) {
            logger.fatal(context, 'MONGODB-003: No host found for MongoDB driver.');
            callback(new errors.BadConfiguration('No host found for MongoDB driver'));
            return;
        }

        const dbName = mongoCfg.db || DEFAULT_DB_NAME;
        const port = mongoCfg.port || 27017;
        const options = {};

        if (mongoCfg.replicaSet) options.replicaSet = mongoCfg.replicaSet;
        if (mongoCfg.ssl) options.ssl = mongoCfg.ssl;
        if (mongoCfg.extraArgs) options.extraArgs = mongoCfg.extraArgs;

        if (mongoCfg.user && mongoCfg.password) {
            options.auth = {
                user: mongoCfg.user,
                password: mongoCfg.password
            };
            if (mongoCfg.authSource) {
                options.extraArgs = {
                    ...options.extraArgs,
                    authSource: mongoCfg.authSource
                };
            }
        }

        init(mongoCfg.host, dbName, port, options, callback);
    } else {
        callback();
    }
}

exports.configureDb = configureDb;
exports.db = defaultDb;
exports.DEFAULT_DB_NAME = DEFAULT_DB_NAME;
