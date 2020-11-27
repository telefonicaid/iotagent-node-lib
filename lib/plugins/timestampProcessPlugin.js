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
const config = require('../commonConfig');
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
 * Looks for Thinking Thing modules and parses them, updating the entity (NGSIv1) with the transformed value.
 *
 * @param {Object} entity           NGSI Entity as it would have been sent before the plugin.
 */
function updatePluginNgsi1(entity, entityType, callback) {
    let timestamp;

    function insertMetadata(element) {
        if (element.name !== constants.TIMESTAMP_ATTRIBUTE) {
            element.metadatas = [
                {
                    name: constants.TIMESTAMP_ATTRIBUTE,
                    type: constants.TIMESTAMP_TYPE,
                    value: timestamp.value
                }
            ];
        }

        return element;
    }

    if (entity.contextElements && entity.contextElements[0] && entity.contextElements[0].attributes) {
        for (const i in entity.contextElements[0].attributes) {
            if (entity.contextElements[0].attributes[i].name === constants.TIMESTAMP_ATTRIBUTE) {
                timestamp = entity.contextElements[0].attributes[i];
            }
        }

        if (timestamp) {
            entity.contextElements[0].attributes = entity.contextElements[0].attributes.map(insertMetadata);
        }

        callback(null, entity, entityType);
    } else {
        logger.error(context, 'Bad payload received while processing timestamps');
        callback(new errors.WrongSyntax(entity));
    }
}

/**
 * Looks for Thinking Thing modules and parses them, updating the entity with the transformed value.
 *
 * @param {Object} entity           NGSI Entity as it would have been sent before the plugin.
 */
function updatePlugin(entity, entityType, callback) {
    if (config.checkNgsi2() || config.checkNgsiLD()) {
        updatePluginNgsi2(entity, entityType, callback);
    } else {
        updatePluginNgsi1(entity, entityType, callback);
    }
}

exports.update = updatePlugin;
