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

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Command = new Schema({
    deviceId: String,
    type: String,
    name: String,
    value: Object,
    service: { type: String, lowercase: true },
    subservice: String,
    creationDate: { type: Date, default: Date.now }
});

function load() {
    module.exports.model = mongoose.model('Command', Command);
    module.exports.internalSchema = Command;
}

module.exports.load = load;
