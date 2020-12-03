/*
 * Copyright 2020 Telefonica Investigación y Desarrollo, S.A.U
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
 * Modified by: Jason Fox - FIWARE Foundation
 */

const config = require('../../commonConfig');
const entityHandlerLD = require('./entities-NGSI-LD');
const entityHandlerV2 = require('./entities-NGSI-v2');

/**
 * Makes a query to the Device's entity in the context broker using NGSI-LD, with the list
 * of attributes given by the 'attributes' array.
 *
 * @param {String} entityName       Name of the entity to query.
 * @param {Array} attributes        Attribute array containing the names of the attributes to query.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
function sendQueryValueNgsiMixed(entityName, attributes, typeInformation, token, callback) {
    if (config.checkNgsiLD(typeInformation)) {
        entityHandlerLD.sendQueryValue(entityName, attributes, typeInformation, token, callback);
    } else {
        entityHandlerV2.sendQueryValue(entityName, attributes, typeInformation, token, callback);
    }
}

/**
 * Makes an update in the Device's entity in the context broker, with the values given
 * in the 'attributes' array. This array should comply to the NGSI-LD or NGSI-v2 attribute format.
 *
 * @param {String} entityName       Name of the entity to register.
 * @param {Array} attributes        Attribute array containing the values to update.
 * @param {Object} typeInformation  Configuration information for the device.
 * @param {String} token            User token to identify against the PEP Proxies (optional).
 */
function sendUpdateValueNgsiMixed(entityName, attributes, typeInformation, token, callback) {
    if (config.checkNgsiLD(typeInformation)) {
        entityHandlerLD.sendUpdateValue(entityName, attributes, typeInformation, token, callback);
    } else {
        entityHandlerV2.sendUpdateValue(entityName, attributes, typeInformation, token, callback);
    }
}

exports.sendUpdateValue = sendUpdateValueNgsiMixed;
exports.sendQueryValue = sendQueryValueNgsiMixed;
