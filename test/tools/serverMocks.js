/*
 * Copyright 2013 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of fiware-orion-pep
 *
 * fiware-orion-pep is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * fiware-orion-pep is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with fiware-orion-pep.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[daniel.moranjimenez@telefonica.com]
 */

'use strict';

var express = require('express'),
    http = require('http');

/**
 * Middleware that makes Express read the incoming body if the content-type is text/xml or application/xml (the default
 * behavior is to read the body if it can be parsed and leave it unread in any other case).
 *
 * @param {Object} req           Incoming request.
 * @param {Object} res           Outgoing response.
 * @param {Function} next        Invokes the next middleware in the chain.
 */
function xmlRawBody(req, res, next) {
    var contentType = req.headers['content-type'] || '',
        mime = contentType.split(';')[0];

    if (mime !== 'text/xml' && mime !== 'application/xml') {
        next();
    } else {
        var data = '';
        req.setEncoding('utf8');
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            req.rawBody = data;
            next();
        });
    }
}

function startMock(port, callback) {
    var app = express();

    app.set('port', port);
    app.set('host', '0.0.0.0');
    app.use(express.json());
    app.use(xmlRawBody);
    app.use(express.urlencoded());
    app.use(app.router);

    var server = http.createServer(app);

    server.listen(app.get('port'), app.get('host'), function(error) {
        callback(error, server, app);
    });
}

function stopMock(server, callback) {
    server.close(callback);
}

function mockPath(url, app, callback) {
    function mock(req, res) {
        if (app.handler) {
            app.handler(req, res);
        } else {
            res.json(200, {});
        }
    }

    app.delete(url, mock);
    app.get(url, mock);
    app.post(url, mock);
    app.put(url, mock);
    callback();
}

exports.start = startMock;
exports.stop = stopMock;
exports.mockPath = mockPath;
