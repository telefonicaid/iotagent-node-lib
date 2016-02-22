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
 * please contact with::daniel.moranjimenez@telefonica.com
 */
'use strict';

/**
 * This module sets up the connection with the mongodb through mongoose. This connection will be used
 * in mongoose schemas to persist objects.
 */

var mongoose = require('mongoose'),
    config = require('../commonConfig'),
    logger = require('logops'),
    errors = require('../errors'),
    defaultDb,
    DEFAULT_DB_NAME = 'iotagent',
    context = {
        op: 'IoTAgentNGSI.DbConn'
    };

function loadModels() {
    require('./Device').load(defaultDb);
    require('./Group').load(defaultDb);
}

/**
 * Creates a new connection to the Mongo DB.
 *
 * @this Reference to the dbConn module itself.
 */
function init(host, db, port, options, callback) {
    /*jshint camelcase:false, validthis:true */

    defaultDb = mongoose.createConnection(host, db, port, options);

    defaultDb.on('error', function mongodbErrorHandler(error) {
        throw new Error(error);
    });

    module.exports.db = defaultDb;

    loadModels();

    callback(null);
}

function configureDb(callback) {
    var currentConfig = config.getConfig();

    if (currentConfig.deviceRegistry && currentConfig.deviceRegistry.type === 'mongodb') {
        if (!currentConfig.mongodb || !currentConfig.mongodb.host) {
            logger.fatal(context, 'No host found for MongoDB driver.');
            callback(new errors.BadConfiguration('No host found for MongoDB driver'));
        } else {
            var dbName = currentConfig.mongodb.db,
                port = currentConfig.mongodb.port || 27017;

            if (!currentConfig.mongodb.db) {
                dbName = DEFAULT_DB_NAME;
            }

            init(config.getConfig().mongodb.host, dbName, port, {}, callback);
        }
    } else {
        callback();
    }
}

exports.configureDb = configureDb;
exports.db = defaultDb;
exports.DEFAULT_DB_NAME = DEFAULT_DB_NAME;
