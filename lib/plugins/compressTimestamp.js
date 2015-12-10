/*
 * Copyright 2015 Telefonica Investigación y Desarrollo, S.A.U
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

function fromBasicToExtended(date) {
    var split = date.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);

    if (split) {
        return '+00' + split[1] + '-' + split[2] + '-' + split[3] + 'T' +
            split[4] + ':' + split[5] + ':' + split[6];
    } else {
        return null;
    }
}

function fromExtendedToBasic(date) {
    var split = date.match(/\+00(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);

    if (split) {
        return split[1] + split[2] + split[3] + 'T' + split[4] + split[5] + split[6];
    } else {
        return null;
    }
}

function createProcessAttribute(fn) {
    return function(attribute) {
        if (attribute.type && attribute.type.toLowerCase && attribute.type.toLowerCase() === 'timestamp') {
            attribute.value = fn(attribute.value);
        }

        return attribute;
    };
}

function processEntityUpdate(entity) {
    entity.attributes = entity.attributes.map(createProcessAttribute(fromBasicToExtended));
    return entity;
}

function processEntityQuery(entity) {
    entity.contextElement.attributes = entity.contextElement.attributes.map(
        createProcessAttribute(fromExtendedToBasic));
    return entity;
}

function update(entity, callback) {
    entity.contextElements = entity.contextElements.map(processEntityUpdate);

    callback(null, entity);
}

function query(entity, callback) {
    entity.contextResponses = entity.contextResponses.map(processEntityQuery);

    callback(null, entity);
}

exports.update = update;
exports.query = query;
