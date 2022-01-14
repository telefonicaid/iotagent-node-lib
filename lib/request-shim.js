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

const got = require('got');
const logger = require('logops');
const context = {
    op: 'IoTAgentNGSI.Request'
};

/**
 *  Transform the "request" options into "got" options and add additional "got" defaults
 *
 *  The following options are currently exposed:
 *   - `method` - HTTP Method
 *   - `searchParams` - query string params
 *   - `qs` - alias for query string params
 *   - `headers`
 *   - `responseType` - either `text` or `json`. `json` is the default
 *   - `json` - a supplied JSON object as the request body
 *   - `body` - any ASCII text as  the request body
 *   - `url` - the request URL
 *   - `uri` - alternative alias for the request URL.
 *
 * @param {Object} options          Original definition of the request using the request library
 * @return {Object}                 Updated definition of the request using the got library
 *
 */
function getOptions(options) {
    const httpOptions = {
        method: options.method,
        searchParams: options.searchParams || options.qs,
        headers: options.headers,
        throwHttpErrors: options.throwHttpErrors || false,
        retry: options.retry || 0,
        responseType: options.responseType || 'json'
    };

    if (options.method !== 'GET' && options.method !== 'DELETE') {
        httpOptions.json = options.json;
        httpOptions.body = options.body;
    }

    return httpOptions;
}

/*
 *
 *  Make a direct HTTP request using the underlying request library
 *  (currently [got](https://github.com/sindresorhus/got)),
 *
 *  This function mimics the interface of the obsolete request library and switches
 *  back from promises to callbacks to avoid re-writing large chunks of code.
 *  This centralizes all HTTP requests in a single location and is useful
 *  when creating agents which use an HTTP transport for their southbound
 *  commands, and removes the need for the custom IoT Agent to import its own
 *  additonal request library.
 *
 * @param {Object} options            Definition of the request .
 * @param {Function} callback         The callback function.
 *
 */

function request(options, callback) {
    const httpOptions = getOptions(options);
    logger.debug(context, 'Options: %s', JSON.stringify(options, null, 4));
    got(options.url || options.uri, httpOptions)
        .then((response) => {
            logger.debug(context, 'Response %s', JSON.stringify(response.body, null, 4));
            return callback(null, response, response.body);
        })
        .catch((error) => {
            logger.debug(context, 'Error: %s', JSON.stringify(error, null, 4));
            return callback(error);
        });
}

module.exports = request;
