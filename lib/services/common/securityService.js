
/*
 * Copyright 2014 Telefonica Investigación y Desarrollo, S.A.U
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

var request = require('request'),
    errors = require('../../errors'),
    config = require('../../commonConfig'),
    intoTrans = require('../common/domain').intoTrans,
    logger = require('logops'),
    context = {
        op: 'IoTAgentNGSI.SecurityService'
    };


/**
 * Send a request to the Authorization Server to retrieve a token using the given trust.
 *
 * @param {String} trust            Trust generated in Keystone to act on behalf of a user.
 */
function getToken(trust, callback) {
    var options = {
        url: 'http://' + config.getConfig().authentication.host + ':' + config.getConfig().authentication.port +
            '/v3/auth/tokens',
        method: 'POST',
        json: {
            auth: {
                identity: {
                    methods: [
                        'password'
                    ],
                    password: {
                        user: {
                            domain: {
                                name: 'Default'
                            },
                            name: config.getConfig().authentication.user,
                            password: config.getConfig().authentication.password
                        }
                    }
                },
                scope: {
                    'OS-TRUST:trust': {
                        id: trust
                    }
                }
            }
        }
    };

    logger.debug(context, 'Retrieving token from Keystone using trust [%s]', trust);

    request(options, function handleResponse(error, response, body) {
        if (error) {
            logger.error(context, 'KEYSTONE-001: Error retrieving token from Keystone: %s', error);
            callback(new errors.TokenRetrievalError(trust, error));
        } else if (response.statusCode === 201 && response.headers['x-subject-token']) {
            logger.debug(context, 'Token found for trust [%s] = [%s]', trust, response.headers['x-subject-token']);
            callback(null, response.headers['x-subject-token']);
        } else if (response.statusCode === 401) {
            logger.error(context, 'Authentication rejected: %s', trust);
            callback(new errors.AuthenticationError(trust));
        } else {
            logger.error(context, 'KEYSTONE-002: Unexpected status code: %d', response.statusCode);
            callback(new errors.TokenRetrievalError(
                trust, 'Unexpected status code retrieving token: %d', response.statusCode));
        }
    });
}

exports.getToken = intoTrans(context, getToken);
