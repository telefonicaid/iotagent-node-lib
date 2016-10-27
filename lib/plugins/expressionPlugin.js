
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
 */

'use strict';

var _ = require('underscore'),
    parser = require('./expressionParser');

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
    function processEntityUpdate(entity) {
        var expressionAttributes = [],
            context = parser.extractContext(entity.attributes);

        if (typeInformation.active) {
            expressionAttributes = parser.processExpressionAttributes(typeInformation, typeInformation.active, context);
        }

        entity.attributes = mergeAttributes(entity.attributes, expressionAttributes);

        return entity;
    }

    try {
        entity.contextElements = entity.contextElements.map(processEntityUpdate);
        callback(null, entity, typeInformation);
    } catch (e) {
        callback(e);
    }
}


exports.update = update;
