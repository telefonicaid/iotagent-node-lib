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
 * please contact with::[contacto@tid.es]
 */
'use strict';

var async = require('async'),
    errors = require('../errors'),
    DOMParser = require('xmldom').DOMParser;


function extractElementData(entityIdNode, callback) {
    var elementData = {},
        idNodes = entityIdNode.getElementsByTagName('id');

    if (!idNodes || idNodes.length !== 1) {
        callback(new errors.BadRequest('Error parsing XML: context id not found'));
        return;
    }

    elementData.id = idNodes.item(0).firstChild.nodeValue;
    elementData.type = entityIdNode.getAttribute('type');
    elementData.isPattern = entityIdNode.getAttribute('isPattern');

    callback(null, elementData);
}

function extractElementAttributes(attributeList, callback) {
    var attributes = [];

    for (var q = 0; q < attributeList.length; q++) {
        var attribute = {},
            attributeNames = attributeList.item(q).getElementsByTagName('name'),
            attributeTypes = attributeList.item(q).getElementsByTagName('type'),
            attributeValues = attributeList.item(q).getElementsByTagName('contextValue');

        if (attributeNames.length === 1) {
            attribute.name = attributeNames.item(0).firstChild.nodeValue;
        }

        if (attributeTypes.length === 1) {
            attribute.type = attributeTypes.item(0).firstChild.nodeValue;
        }

        if (attributeValues.length === 1) {
            attribute.value = attributeValues.item(0).firstChild.nodeValue;
        }

        attributes.push(attribute);
    }

    callback(null, attributes);
}

function extractNode(node, callback) {
    var attributeList = node.getElementsByTagName('contextAttribute'),
        entityIdNodes = node.getElementsByTagName('entityId');

    if (!entityIdNodes || entityIdNodes.length !== 1) {
        callback(new errors.BadRequest('Error parsing XML: context element not found'));
        return;
    }

    async.parallel([
        async.apply(extractElementData, entityIdNodes.item(0)),
        async.apply(extractElementAttributes, attributeList)
    ], function combineExtractedData(error, results) {
        if (error) {
            callback(error);
        } else {
            var contextElement = results[0];

            contextElement.attributes = results[1];
            callback(null, contextElement);
        }
    });
}

function readUpdatePayload(req, callback) {
    var doc = new DOMParser().parseFromString(req.rawBody);

    function extractUpdateAction(doc, callback) {
        var updateActionNodes = doc.getElementsByTagName('updateAction');

        if (updateActionNodes.length !== 1) {
            callback(new errors.BadRequest('Error parsing XML: update action element not found'));
            return;
        }

        callback(null, updateActionNodes.item(0).firstChild.nodeValue);
    }

    function extractContextElements(doc, callback) {
        var contextElementList = doc.getElementsByTagName('contextElement'),
            contextElements = [];

        for (var i = 0; i < contextElementList.length; i++) {
            contextElements.push(contextElementList.item(i));
        }

        async.map(contextElements, extractNode, callback);
    }

    function createUpdateBody(error, results) {
        if (error) {
            callback(error);
        } else {
            var element = {
                contextElements: results[1],
                updateAction: results[0]
            };

            req.body = element;
            callback(null, element);
        }
    }

    async.series([
        async.apply(extractUpdateAction, doc),
        async.apply(extractContextElements, doc)
    ], createUpdateBody);
}

function readQueryPayload(req, callback) {
    var doc = new DOMParser().parseFromString(req.rawBody);

    function extractEntities(doc, callback) {
        var entityElementList = doc.getElementsByTagName('entityId'),
            entityElements = [];

        for (var i = 0; i < entityElementList.length; i++) {
            entityElements.push(entityElementList.item(i));
        }

        async.map(entityElements, extractElementData, callback);
    }

    function extractAttributes(doc, callback) {
        var attributeList = doc.getElementsByTagName('attribute'),
            attributes = [];

        for (var i = 0; i < attributeList.length; i++) {
            attributes.push(attributeList.item(i).firstChild.nodeValue);
        }

        callback(null, attributes);
    }

    function createQueryBody(error, results) {
        if (error) {
            callback(error);
        } else {
            var element = {
                entities: results[0],
                attributes: results[1]
            };

            req.body = element;
            callback(null, element);
        }
    }

    async.series([
        async.apply(extractEntities, doc),
        async.apply(extractAttributes, doc)
    ], createQueryBody);
}

function readBody(parseFunction) {
    return function readMiddleware(req, res, next) {
        if (req.headers['content-type'] === 'application/xml') {
            parseFunction(req, next);
        } else {
            next();
        }
    };
}

exports.readUpdateBody = readBody(readUpdatePayload);
exports.readQueryBody = readBody(readQueryPayload);
