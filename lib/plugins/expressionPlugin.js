
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

'use strict';

var _ = require('underscore'),
    parser = require('./expressionParser'),
    config = require('../commonConfig'),
     /*jshint unused:false*/
    logger = require('logops'),
     /*jshint unused:false*/
    context = {
        op: 'IoTAgentNGSI.expressionPlugin'
    },
    utils = require('./pluginUtils');

function mergeAttributes(attrList1, attrList2) {
    var finalCollection = _.clone(attrList1),
        additionalItems = [],
        found;

    for (var i = 0; i < attrList2.length; i++) {
        found = false;

        for (var j = 0; j < finalCollection.length; j++) {
            if (finalCollection[j].name === attrList2[i].name) {
                finalCollection[j].value = attrList2[i].value;
                found = true;
            }
        }

        if (!found) {
            additionalItems.push(attrList2[i]);
        }
    }

    return finalCollection.concat(additionalItems);
}


function update(entity, typeInformation, callback) {
    function processEntityUpdateNgsi1(entity) {
        var expressionAttributes = [],
            ctx = parser.extractContext(entity.attributes);

        if (typeInformation.active) {
            expressionAttributes = parser.processExpressionAttributes(typeInformation, typeInformation.active, ctx);
        }

        entity.attributes = mergeAttributes(entity.attributes, expressionAttributes);

        return entity;
    }

    function processEntityUpdateNgsi2(attributes) {
        var expressionAttributes = [],
            ctx = parser.extractContext(attributes);

        if (typeInformation.active) {
            expressionAttributes = parser.processExpressionAttributes(typeInformation, typeInformation.active, ctx);
        }

        attributes = mergeAttributes(attributes, expressionAttributes);
        return attributes;
    }

    try {
        if (config.checkNgsi2()) {
            var attsArray = utils.extractAttributesArrayFromNgsi2Entity(entity);
            attsArray = processEntityUpdateNgsi2(attsArray);
            entity = utils.createNgsi2Entity(entity.id, entity.type, attsArray, true);
        } else {
            entity.contextElements = entity.contextElements.map(processEntityUpdateNgsi1);
        }

        callback(null, entity, typeInformation);
    } catch (e) {
        callback(e);
    }
}

exports.update = update;
