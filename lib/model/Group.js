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

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Group = new Schema({
    url: String,
    resource: String,
    apikey: String,
    type: String,
    service: { type: String, lowercase: true },
    subservice: String,
    description: String,
    trust: String,
    cbHost: String,
    timezone: String,
    timestamp: Boolean,
    commands: Array,
    staticAttributes: Array,
    lazy: Array,
    attributes: Array,
    internalAttributes: Array,
    autoprovision: Boolean,
    expressionLanguage: String,
    explicitAttrs: Boolean,
    defaultEntityNameConjunction: String,
    ngsiVersion: String,
    cache: Boolean
});

function load(db) {
    Group.index({ apikey: 1, resource: 1 }, { unique: true });
    module.exports.model = db.model('Group', Group);
    module.exports.internalSchema = Group;
}

module.exports.load = load;
