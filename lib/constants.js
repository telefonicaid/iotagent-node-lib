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

const LOCATION_TYPE = 'geo:point';
const LOCATION_DEFAULT = '0, 0';
const DATETIME_TYPE = 'DateTime';
const DATETIME_DEFAULT = '1970-01-01T00:00:00.000Z';
const ATTRIBUTE_DEFAULT = ' ';

/**
 * Provides a default value for DateTime, GeoProperty and Property Attributes.
 *
 * @param      {String}   type       The type of attribute being created.
 * @return     {String}              A default value to use in the entity
 */
function getInitialValueForType(type) {
    switch (type) {
        case LOCATION_TYPE:
            return LOCATION_DEFAULT;
        case DATETIME_TYPE:
            return DATETIME_DEFAULT;
        default:
            return ATTRIBUTE_DEFAULT;
    }
}

module.exports = {
    TIMESTAMP_ATTRIBUTE: 'TimeInstant',
    TIMESTAMP_TYPE: 'ISO8601',
    TIMESTAMP_TYPE_NGSI2: 'DateTime',
    SERVICE_HEADER: 'fiware-service',
    SUBSERVICE_HEADER: 'fiware-servicepath',
    NGSI_LD_TENANT_HEADER: 'NGSILD-Tenant',
    NGSI_LD_PATH_HEADER: 'NGSILD-Path',
    //FIXME: check Keystone support this in lowercase, then change
    AUTH_HEADER: 'X-Auth-Token',

    COMMAND_RESULT_SUFIX: '_info',
    COMMAND_STATUS_SUFIX: '_status',
    COMMAND_STATUS: 'commandStatus',
    COMMAND_RESULT: 'commandResult',

    COMMAND_STATUS_ERROR: 'ERROR',
    COMMAND_EXPIRED_MESSAGE: 'EXPIRED',

    DEFAULT_RESOURCE: '/iot/d',

    DEFAULT_MONGODB_RETRIES: 5,
    DEFAULT_MONGODB_RETRY_TIME: 5,

    MONGO_ALARM: 'MONGO-ALARM',
    ORION_ALARM: 'ORION-ALARM',
    IOTAM_ALARM: 'IOTAM-ALARM',

    getInitialValueForType
};
