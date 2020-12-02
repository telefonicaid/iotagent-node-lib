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

const contextServerHandlerLD = require('./contextServer-NGSI-LD');
const contextServerHandlerV2 = require('./contextServer-NGSI-v2');

/**
 * Load the routes related to context dispatching (NGSI10 calls) for both v2 and LD (mixed mode)
 *
 * @param {Object} router      Express request router object.
 */
function loadContextRoutesMixed(router) {
    contextServerHandlerLD.loadContextRoutes(router);
    contextServerHandlerV2.loadContextRoutes(router);
}

exports.loadContextRoutes = loadContextRoutesMixed;
