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
 * please contact with::[contacto@tid.es]
 */

/* eslint-disable no-unused-vars */

const Redis = require('ioredis');
const async = require('async');

function cleanDb(host, port, db, callback) {
    const redis = new Redis({
        port,
        host,
        db
    });

    redis.flushdb(function (err, succeeded) {
        callback(err);
    });
}

function cleanDbs(host, port, callback) {
    const redis = new Redis({
        port,
        host
    });

    redis.flushall(function (err, succeeded) {
        callback(err);
    });
}

exports.cleanDb = cleanDb;
exports.cleanDbs = cleanDbs;
