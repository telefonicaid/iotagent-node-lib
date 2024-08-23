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
 * Chooses the appropiate content type and version based on Accept header
 * 
 * @param {String} accepts The accepts header
 */
function matchContentType(accepts) {
    const requestedType = [];
    const vlabel = 'version=';
    const clabel = 'charset=';
    const qlabel = 'q=';
    for (const expression of accepts.split(',')) {
        const parts = expression.split(';').map((part) => part.trim());
        const mediaType = parts[0];
        let version = null;
        let charset = null;
        let preference = null;
        for (let part of parts.slice(1)) {
            if (part.startsWith(vlabel)) {
                version = part.substring(vlabel.length).trim();
            } else if (part.startsWith(clabel)) {
                charset = part.substring(clabel.length).trim();
            } else if (part.startsWith(qlabel)) {
                preference = parseFloat(part.substring(qlabel.length).trim());
            }
        }
        requestedType.push({
            mediaType: mediaType,
            version: version,
            charset: charset,
            preference: preference || 1.0
        });
    }
    // If both text/plain and openmetrics are accepted,
    // prefer openmetrics
    const mediaTypePref = {
        'application/openmetrics-text': 1.0,
        'text/plain': 0.5
    }
    // sort requests by priority descending
    requestedType.sort(function (a, b) {
        if (a.preference === b.preference) {
            // same priority, sort by media type.
            return (mediaTypePref[b.mediaType] || 0) - (mediaTypePref[a.mediaType] || 0);
        }
        return b.preference - a.preference;
    });
    for (const req of requestedType) {
        switch(req.mediaType) {
            case 'application/openmetrics-text':
                req.version = req.version || '1.0.0';
                req.charset = req.charset || 'utf-8';
                if (
                    (req.version === '1.0.0' || req.version === '0.0.1') &&
                    (req.charset === 'utf-8')) {
                    return req;
                }
                break;
            case 'text/plain':
            case 'text/*':
            case '*/*':
                req.version = req.version || '0.0.4';
                req.charset = req.charset || 'utf-8';
                if (
                    (req.version === '0.0.4') &&
                    (req.charset === 'utf-8')) {
                    req.mediaType = 'text/plain';
                    return req;
                }
                break;
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
    // - Caveat: Some versions of prometheus have been observed to send multivalued Accept headers such as
    // Accept: application/openmetrics-text; version=0.0.1,text/plain;version=0.0.4;q=0.5,*/*;q=0.1
    let reqType = {
        mediaType: 'application/openmetrics-text',
        version: '1.0.0',
        charset: 'utf-8'
    }
    if (req.headers.accept) {
        // WORKAROUND: express version 4 does not parse properly the openmetrics Accept header,
        // it won't match the regular expressions supported by `express.accepts`.
        // So we must parse these key-value pairs ourselves.
        reqType = matchContentType(req.headers.accept);
        if (reqType === null) {
            logger.error(statsContext, 'Unsupported media type: %s', req.headers.accept);
            res.status(406).send('Not Acceptable');
            return;
        }
    }
    const contentType = `${reqType.mediaType};version=${reqType.version};charset=${reqType.charset}`;
    // The actual payload is the same for all supported content types
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
exports.matchContentType = matchContentType;
