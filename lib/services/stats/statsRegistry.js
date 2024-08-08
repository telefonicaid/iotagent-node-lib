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

/* eslint-disable no-prototype-builtins */

const _ = require('underscore');
const logger = require('logops');
let globalStats = {};
const statsContext = {
    op: 'IoTAgentNGSI.TimedStats'
};

/**
 * Add a new stat value to the specified key of the stats registry. The stat is added
 * both to the global and current stats.
 *
 * @param {String} key          Name of the stat that is going to be written.
 * @param {Number} value        Value to be added to the total.
 */
function add(key, value, callback) {
    if (globalStats[key]) {
        globalStats[key] += value;
    } else {
        globalStats[key] = value;
    }
    callback(null);
}

/**
 * Get the global value of the selected attribute.
 *
 * @param {String} key          Name of the stat to retrive.
 */
function getGlobal(key, callback) {
    callback(null, globalStats[key]);
}

/**
 * Get all the global stats currently stored in the repository.
 */
function getAllGlobal(callback) {
    callback(null, globalStats);
}

/**
 * Loads the values passed as parameters into the global statistics repository.
 *
 * @param {Object} values       Key-value map with the values to be load.
 */
function globalLoad(values, callback) {
    globalStats = _.clone(values);
    callback(null);
}

/**
 * Matches a list of requested values to a list of supported values.
 * Returns the first supported value that matches any of the requested values.
 * Returns null if there is no match
 *
 * @param {Array} requestedValues     List of requested values.
 * @param {Array} supportedValues     List of supported values.
 */
function matchPreferredValue(requestedValues, supportedValues) {
     for (let i = 0; i < supportedValues.length; i++) {
        const supportedValue = supportedValues[i];
        if (_.contains(requestedValues, supportedValue)) {
            return supportedValue;
        }
    }
    return null;
}

/**
 * Predefined http handler that returns current openmetrics data
 */
/* eslint-disable-next-line  no-unused-vars */
function openmetricsHandler(req, res) {
    // Content-Type:
    // - For openmetrics collectors, it MUST BE 'application/openmetrics-text; version=1.0.0; charset=utf-8'. See:
    // https://github.com/OpenObservability/OpenMetrics/blob/main/specification/OpenMetrics.md#overall-structure
    // - For prometheus compatible collectors, it SHOULD BE 'text/plain; version=0.0.4; charset=utf-8'. See:
    // https://github.com/prometheus/docs/blob/main/content/docs/instrumenting/exposition_formats.md
    let contentType = 'application/openmetrics-text; version=1.0.0; charset=utf-8';
    // Some versions of prometheus have been observed to send several
    // version options, e.g.:
    // Accept: application/openmetrics-text; version=0.0.1,text/plain;version=0.0.4;q=0.5,*/*;q=0.1
    // So we need to keep a list of requested values, and a preferred order for supported values.
    const requestedVersions = [];
    const requestedCharsets = [];
    const supportedVersions = ['1.0.0', '0.0.4', '0.0.1,text/plain'];
    const supportedCharsets = ['utf-8'];
    // To identify openmetrics collectors, we need to parse the `Accept` header.
    // An openmetrics-based collectors SHOULD use an `Accept` header such as:
    //   `Accept: application/openmetrics-text; version=1.0.0; charset=utf-8'
    // See: https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/18913
    //
    // WORKAROUND: express version 4 does not parse properly the openmetrics Accept header,
    // it won't match the regular expressions supported by `express.accepts`.
    // So we must parse these key-value pairs ourselves, and remove them from the
    // header before handling it to `requests.accept`.
    if (req.headers.accept) {
        const parts = req.headers.accept.split(';');
        let unparsed = [];
        for (let i = 0; i < parts.length; i++) {
            const current = parts[i];
            const trimmed = current.trim();
            if (trimmed.startsWith('version=')) {
                requestedVersions.push(trimmed.substring(8))
            } else if (trimmed.startsWith('charset=')) {
                requestedCharsets.push(trimmed.substring(8));
            } else {
                unparsed.push(current);
            }
        }
        if (unparsed.length < parts.length) {
            delete req.headers['accept'];
            req.headers['accept'] = unparsed.join(';');
        }
    }
    if (requestedCharsets.length > 0 && !matchPreferredValue(requestedCharsets, supportedCharsets)) {
        logger.error(statsContext, 'Unsupported charset: %s', requestedCharsets);
        res.status(406).send('Unsupported charset');
        return;
    }
    switch (req.accepts(['text/plain', 'application/openmetrics-text'])) {
        case 'application/openmetrics-text':
            let version = supportedVersions[0];
            if (requestedVersions.length > 0) {
                version = matchPreferredValue(requestedVersions, supportedVersions);
                if (!version) {
                    logger.error(statsContext, 'Unsupported openmetrics version: %s', requestedVersions);
                    res.status(406).send('Unsupported openmetrics version');
                    return;
                }
            }
            contentType = `text/plain; version=${version}; charset=utf-8`;
            break;
        case 'text/plain':
            contentType = 'text/plain; version=0.0.4; charset=utf-8';
            break;
        default:
            logger.error(statsContext, 'Unsupported accept header: %s', req.headers.accept);
            res.status(406).send('Unsupported accept header');
            return;
    }
    const metrics = [];
    for (const key in globalStats) {
        if (globalStats.hasOwnProperty(key)) {
            metrics.push('# HELP ' + key + ' global metric for ' + key);
            metrics.push('# TYPE ' + key + ' counter');
            metrics.push(key + ' ' + globalStats[key]);
        }
    }
    // Expositions MUST END WITH '#EOF'
    // See https://github.com/OpenObservability/OpenMetrics/blob/main/specification/OpenMetrics.md
    metrics.push('# EOF');
    res.set('Content-Type', contentType);
    res.status(200).send(metrics.join('\n'));
}

/**
 * Wraps a callback with stats, incrementing the given counters
 * depending on the parameters passed to the callback:
 *
 * - If the callback receives an error, the errCounter is incremented.
 * - If the callback receives no error, the okCounter is incremented.
 *
 * @param {String} okCounter          Name of the counter to increment on success.
 * @param {String} errCounter         Name of the counter to increment on error.
 * @param {Function} callback         Callback to wrap. It must be a function that can
 *                                    expect any number of parameters, but the first one must
 *                                    be an indication of the error occured, if any.
 */
function withStats(okCounter, errCounter, callback) {
    function accounting(...args) {
        const counter = args.length > 0 && args[0] ? errCounter : okCounter;
        add(counter, 1, function () {
            callback(...args);
        });
    }
    return accounting;
}

exports.add = add;
exports.getGlobal = getGlobal;
exports.getAllGlobal = getAllGlobal;
exports.globalLoad = globalLoad;
exports.withStats = withStats;
exports.openmetricsHandler = openmetricsHandler;
