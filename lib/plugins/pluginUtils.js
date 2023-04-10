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
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::daniel.moranjimenez@telefonica.com
 *
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */

/**
 * Creates an array of attributes from an entity
 * @param       {Object}             entity
 * @return      {Object}             Array of attributes extracted from the entity
 */
function extractAttributesArrayFromNgsi2Entity(entity) {
    const attsArray = [];
    for (const i in entity) {
        /* eslint-disable-next-line  no-prototype-builtins */
        if (entity.hasOwnProperty(i)) {
            if (i !== 'id' && i !== 'type') {
                const att = Object.assign({}, entity[i]);
                if (att.multi) {
                    // jshint maxdepth:5
                    for (const j in att.multi) {
                        const matt = Object.assign({}, entity[i].multi[j]);
                        matt.name = i;
                        attsArray.push(matt);
                    }
                    delete att.multi;
                }
                att.name = i;
                attsArray.push(att);
            }
        }
    }

    return attsArray;
}

/**
 * Creates an array of attributes from an device including id, type, service and subservice
 * @param       {Object}             device
 * @return      {Object}             Array of id, type, service and subservice extracted from device
 */
function getIdTypeServSubServiceFromDevice(typeInformation) {
    let attrList = [
        { name: 'id', type: 'String', value: typeInformation.id },
        { name: 'type', type: 'String', value: typeInformation.type },
        { name: 'service', type: 'String', value: typeInformation.service },
        { name: 'subservice', type: 'String', value: typeInformation.subservice },
        { name: 'entity_name', type: 'String', value: typeInformation.name }
    ];
    return attrList;
}

exports.extractAttributesArrayFromNgsi2Entity = extractAttributesArrayFromNgsi2Entity;
exports.getIdTypeServSubServiceFromDevice = getIdTypeServSubServiceFromDevice;
