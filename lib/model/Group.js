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

class ExplicitAttrsType extends mongoose.SchemaType {
    constructor(key, options) {
        super(key, options, 'ExplicitAttrsType');
    }
    // `cast()` takes a parameter that can be anything. You need to
    // validate the provided `val` and throw a `CastError` if you
    // can't convert it.
    cast(val) {
        if (!(typeof val === 'boolean' || typeof val === 'string')) {
            throw new Error('ExplicitAttrsType: ' + val + ' is not Boolean or String');
        }
        return val;
    }
}

mongoose.Schema.Types.ExplicitAttrsType = ExplicitAttrsType;

const Group = new Schema({
    url: String,
    resource: String,
    apikey: String,
    endpoint: String,
    transport: String,
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
    explicitAttrs: ExplicitAttrsType,
    defaultEntityNameConjunction: String,
    ngsiVersion: String,
    entityNameExp: String,
    payloadType: String,
    useCBflowControl: Boolean,
    storeLastMeasure: Boolean
});

function load() {
    Group.index({ apikey: 1, resource: 1 }, { unique: true });
    module.exports.model = mongoose.model('Group', Group);
    module.exports.internalSchema = Group;
}

module.exports.load = load;
module.exports.ExplicitAttrsType = ExplicitAttrsType;
