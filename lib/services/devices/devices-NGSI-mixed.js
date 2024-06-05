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
const deviceHandlerLD = require('./devices-NGSI-LD');
const deviceHandlerV2 = require('./devices-NGSI-v2');

/**
 * Updates the register of an existing device identified by the Id and Type in the Context Broker, and the internal
 * registry. It uses both NGSI-LD and NGSI-v2
 *
 * The device id and type are required fields for a registration updated. Only the following attributes will be
 * updated: lazy, active and internalId. Any other change will be ignored. The registration for the lazy attributes
 * of the updated entity will be updated if existing, and created if not. If new active attributes are created,
 * the entity will be updated creating the new attributes.
 *
 * @param {Object} deviceObj                    Object with all the device information (mandatory).
 */
function updateRegisterDeviceNgsiMixed(deviceObj, previousDevice, entityInfoUpdated, callback) {
    if (config.checkNgsiLD(deviceObj)) {
        deviceHandlerLD.updateRegisterDevice(deviceObj, previousDevice, entityInfoUpdated, callback);
    } else {
        deviceHandlerV2.updateRegisterDevice(deviceObj, previousDevice, entityInfoUpdated, callback);
    }
}

exports.updateRegisterDevice = updateRegisterDeviceNgsiMixed;
