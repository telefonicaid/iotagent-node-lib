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

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Device = new Schema({
    id: String,
    type: String,
    name: String,
    lazy: Array,
    active: Array,
    commands: Array,
    apikey: String,
    endpoint: String,
    resource: String,
    protocol: String,
    transport: String,
    staticAttributes: Array,
    subscriptions: Array,
    service: String,
    subservice: String,
    polling: Boolean,
    timezone: String,
    timestamp: Boolean,
    registrationId: String,
    internalId: String,
    creationDate: { type: Date, default: Date.now },
    internalAttributes: Object
});

function load(db) {
    module.exports.model = db.model('Device', Device);
    module.exports.internalSchema = Device;
}

module.exports.load = load;
