
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
 * This code was contributed by Federico M. Facca on behalf of Martel Innovate
 *
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */

'use strict';

var request = require('request'),
    queryString = require('query-string'),
    errors = require('../../errors'),
    config = require('../../commonConfig'),
    intoTrans = require('../common/domain').intoTrans,
    logger = require('logops'),
    context = {
        op: 'IoTAgentNGSI.SecurityService'
    };


/**
 * Send a request to the Authorization Server.
 *
 * @param {String} trust            refresh_token for the OAuth2 provider to act on behalf of a user.
 */
/* jshint camelcase: false */
function auth(trust, callback) {

    if (config.getConfig().authentication.permanentToken) {
        return callback(null, trust);
    }

    var form = {
      grant_type: 'refresh_token',
      client_id: config.getConfig().authentication.clientId,
      client_secret: config.getConfig().authentication.clientSecret,
      refresh_token: trust
    };

    var formData = queryString.stringify(form);
    var url = config.getConfig().authentication.url + config.getConfig().authentication.tokenPath;

    var options = {
        url: url,
        method: 'POST',
        headers: {
          'Content-Length': formData.length,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
    };

    logger.debug(context, 'Authentication on the OAuth2 provider [%s]', url);

    request(options, function handleResponse(error, response, body) {
        if (error) {
            logger.error(context, 'OAUTH2-001: Error retrieving token from OAuth2 provider: %s', error);
            callback(new errors.TokenRetrievalError(trust, error));
        } else if (response.statusCode === 201 || response.statusCode === 200 /* Keyrock response */) {
            logger.debug(context, 'Authentication with trust [%s] was succesful', trust);
            logger.debug(context,
                'Received the following response from the OAuth2 provider:\n\n%s\n\n', JSON.stringify(body, null, 4));
            callback(null, response);
        } else if (response.statusCode === 401 || (response.statusCode === 400 &&
            JSON.parse(response.body).error_description === 'Invalid refresh token')) {
            logger.error(context, 'Authentication rejected: %s', trust);
            callback(new errors.AuthenticationError(trust));
        } else if (response.statusCode === 400 &&
                JSON.parse(response.body).error === 'invalid_client') { //Keyrock response
            logger.error(context, 'Authentication rejected: %s', trust);
            callback(new errors.AuthenticationError(trust));
        } else if (response.statusCode === 400 &&
                JSON.parse(response.body).error === 'invalid_grant') { //Keyrock response
            logger.error(context, 'Authentication rejected: %s', trust);
            callback(new errors.AuthenticationError(trust));
        } else {
            logger.error(context, 'OAUTH2-002: Unexpected status code: %d', response.statusCode);
            callback(new errors.TokenRetrievalError(
                trust, 'Unexpected status code retrieving token: %d', response.statusCode));
        }
    });
}

/**
 * Extract the token from the response
 * @param {String} trust    refresh_token for the OAuth2 provider to act on behalf of a user.
 * @param {String} response The authentication response
 */
/* jshint camelcase: false */
function getToken(trust, response, callback) {

    logger.debug(context, 'Retrieving token from the OAuth2 response');

    if (config.getConfig().authentication.permanentToken) {
        return callback(null, 'Bearer ' + trust);
    }

    var body = JSON.parse(response.body);

    if (body.access_token) {
        logger.debug(context, 'Token found [%s] for trust [%s]', body.access_token, trust);

        callback(null, 'Bearer ' + body.access_token);
    } else {
        logger.error(context, 'OAUTH2-003: Token missing in the response body', body);
        callback(new errors.TokenRetrievalError(
            trust, 'Unexpected response format', body));
    }
}

exports.getToken = intoTrans(context, getToken);
exports.auth = intoTrans(context, auth);
