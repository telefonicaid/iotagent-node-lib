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
 *
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */

/* eslint-disable no-prototype-builtins */

const errors = require('../errors');
const constants = require('../constants');
const logger = require('logops');
const context = {
    op: 'IoTAgentNGSI.TimestampProcessPlugin'
};
const utils = require('./pluginUtils');

/**
 * Looks for Thinking Thing modules and parses them, updating the entity (NGSIv2) with the transformed value.
 *
 * @param {Object} entity           NGSI Entity as it would have been sent before the plugin.
 */
function updatePluginNgsi2(entity, entityType, callback) {
    let timestamp;

    function insertMetadata(element) {
        if (element.name !== constants.TIMESTAMP_ATTRIBUTE) {
            const metadata = element.metadata || {};
            metadata[constants.TIMESTAMP_ATTRIBUTE] = {
                type: constants.TIMESTAMP_TYPE_NGSI2,
                value: timestamp.value
            };
            element.metadata = metadata;
        }

        return element;
    }

    function updateSingleEntity(entity) {
        let attsArray = utils.extractAttributesArrayFromNgsi2Entity(entity);

        if (entity && entity[constants.TIMESTAMP_ATTRIBUTE]) {
            if (entity.hasOwnProperty(constants.TIMESTAMP_ATTRIBUTE)) {
                timestamp = entity[constants.TIMESTAMP_ATTRIBUTE];
            }
        } else if (!entity) {
            logger.error(context, 'Bad payload received while processing timestamps');
            callback(new errors.WrongSyntax(entity));
        }

        if (timestamp) {
            attsArray = attsArray.map(insertMetadata);
        }
        timestamp = false; // reset for possible next entity
        entity = utils.createNgsi2Entity(entity.id, entity.type, attsArray);
        return entity;
    }

    if (entity instanceof Array) {
        const results = entity.map(updateSingleEntity);
        callback(null, results, entityType);
    } else {
        const newEntity = updateSingleEntity(entity);
        callback(null, newEntity, entityType);
    }
}

/**
 * Looks for Thinking Thing modules and parses them, updating the entity with the transformed value.
 *
 * @param {Object} entity           NGSI Entity as it would have been sent before the plugin.
 */
function updatePlugin(entity, entityType, callback) {
    updatePluginNgsi2(entity, entityType, callback);
}

exports.update = updatePlugin;
