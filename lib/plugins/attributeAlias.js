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
    /* jshint camelcase: false */

    previous.direct[current.object_id] = current.name;
    previous.types[current.object_id] = current.type;
    previous.inverse[current.name] = current.object_id;
    return previous;
}

/**
 * Extract all the alias information for the attributes from the provisioning information provided for a device.
 *
 * @param {Object} typeInformation          Provisioning information about the device represented by the entity.
 * @return {{direct: {}, inverse: {}}}      Object containing the direct and reverse name mappings.
 */
function extractAllMappings(typeInformation) {
    var mappings = { direct: {}, inverse: {}, types: {}};

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

/**
 * Create a map function to apply a set of mappings to a vector of attributes.
 *
 * @param {Object} mappings             Mappings to be applied.
 * @return {aliasApplier}               Map function that will apply the mappings to collections of objects.
 */
function applyAlias(mappings) {
    return function aliasApplier(attribute) {
        if (mappings.direct[attribute.name]) {
            attribute.type = mappings.types[attribute.name];
            attribute.name = mappings.direct[attribute.name];
        }

        return attribute;
    };
}

/**
 * Filter to map attribute Ids into attribute names based on provisioning information.
 *
 * @param {Object} entity                   The entity to be modified, representing the information in a device.
 * @param {Object} typeInformation          Provisioning information about the device represented by the entity.
 */
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
