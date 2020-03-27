
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
 * If not, see http://www.gnu.org/licenses/.
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
function auth(trust, callback) {
    var options = {
        url: config.getConfig().authentication.url +
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

    logger.debug(context, 'Authentication with Keystone using trust [%s]', trust);

    request(options, function handleResponse(error, response, body) {
        if (error) {
            logger.error(context, 'KEYSTONE-001: Error retrieving token from Keystone: %s', error);
            callback(new errors.TokenRetrievalError(trust, error));
        } else if (response.statusCode === 201) {
            logger.debug(context, 'Authentication completed for trust [%s]', trust);
            callback(null, response);
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

/**
 * Extract the token from the response
 * @param {String} trust    Trust generated in Keystone to act on behalf of a user.
 * @param {String} response The authentication response
 */

function getToken(trust, response, callback) {

    logger.debug(context, 'Retrieving token from the KEYSTONE response');

    if (response.headers['x-subject-token']) {
        logger.debug(context, 'Token found [%s] for trust [%s]', response.headers['x-subject-token'], trust);

        callback(null, response.headers['x-subject-token']);
    } else {
        logger.error(context, 'KEYSTONE-003: Token missing in the response headers', response.headers);
        callback(new errors.TokenRetrievalError(
            trust, 'Unexpected response format', response.headers));
    }
}

exports.getToken = intoTrans(context, getToken);
exports.auth = intoTrans(context, auth);
