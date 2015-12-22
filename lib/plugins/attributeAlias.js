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

function extractSingleMapping(previous, current) {
    previous.direct[current.id] = current.name;
    previous.inverse[current.name] = current.id;
    return previous;
}

function extractAllMappings(typeInformation) {
    var mappings = { direct: {}, inverse: {} };

    if (typeInformation.active) {
        mappings = typeInformation.active.reduce(extractSingleMapping, mappings);
    }

    if (typeInformation.lazy) {
        mappings = typeInformation.lazy.reduce(extractSingleMapping, mappings);
    }

    if (typeInformation.commands) {
        mappings = typeInformation.commands.reduce(extractSingleMapping, mappings);
    }

    return mappings;
}

function applyAlias(mappings) {
    return function aliasApplier(attribute) {
        if (mappings.direct[attribute.name]) {
            attribute.name = mappings.direct[attribute.name];
        }

        return attribute;
    };
}

function updateAttribute(entity, typeInformation, callback) {
    var mappings = extractAllMappings(typeInformation);

    entity.contextElements[0].attributes = entity.contextElements[0].attributes.map(applyAlias(mappings));

    callback(null, entity, typeInformation);
}

function queryAttribute(entity, typeInformation, callback) {
    callback(null, entity, typeInformation);
}

exports.update = updateAttribute;
exports.query = queryAttribute;
