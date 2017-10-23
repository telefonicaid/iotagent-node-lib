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
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 *
 * Modified work Copyright 2017 Atos Spain S.A
 */

'use strict';

var errors = require('../errors'),
    constants = require('../constants'),
    logger = require('logops'),
    context = {
        op: 'IoTAgentNGSI.TimestampProcessPlugin'
    };

/**
 * Looks for Thinking Thing modules and parses them, updating the entity with the transformed value.
 *
 * @param {Object} entity           NGSI Entity as it would have been sent before the plugin.
 */
function updatePlugin(entity, entityType, callback) {
    var timestamp;

    function insertMetadata(element) {

        if (element.name !== constants.TIMESTAMP_ATTRIBUTE) {
            var metadata = {};
            metadata[constants.TIMESTAMP_ATTRIBUTE] = {
                type: constants.TIMESTAMP_TYPE_NGSI2,
                value: timestamp.value
            };
            element.metadata = metadata;
        }

        return element;
    }


    var updatedEntity = {};
    var attsArray = [];

    for (var i in entity) {
        if (i !== 'id' && i !== 'type') {
            var attWithName = entity[i];
            attWithName.name = i;
            attsArray.push(attWithName);
        }
        else {
            updatedEntity[i] = entity[i];
        }

        if (i !== 'id' && i !== 'type' && i === constants.TIMESTAMP_ATTRIBUTE) {
            timestamp = entity[i];
        }
    }

    if (attsArray.length === 0) {
        logger.error(context, 'Bad payload received while processing timestamps');
        callback(new errors.WrongSyntax(entity));
    }

    if (timestamp) {
        attsArray = attsArray.map(insertMetadata);
    }

    for (i = 0; i < attsArray.length; i++) {
        updatedEntity[attsArray[i].name] = {'type' : attsArray[i].type,
        'value' : attsArray[i].value, 'metadata' : attsArray[i].metadata};
    }

    callback(null, updatedEntity, entityType);

}

exports.update = updatePlugin;
