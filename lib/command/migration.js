/*
 * Copyright 2016 Telefonica Investigación y Desarrollo, S.A.U
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

/* jshint camelcase: false */

var async = require('async'),
    logger = require('logops'),
    apply = async.apply,
    MongoClient = require('mongodb').MongoClient,
    serviceTranslation = {
        'apikey' : 'apikey',
        'token' : 'trust',
        'cbroker' : 'cbHost',
        'entity_type' : 'type',
        'resource' : 'resource',
        'service' : 'service',
        'service_path' : 'subservice',
        'attributes': 'attributes',
        'static_attributes': 'staticAttributes'
    },
    deviceTranslation = {
        'device_id' : 'id',
        'entity_name' : 'name',
        'entity_type' : 'type',
        'endpoint': 'endpoint',
        'timezone' : 'timezone',
        'service' : 'service',
        'service_path' : 'subservice',
        'protocol' : 'protocol',
        'attributes' : 'active',
        'static_attributes' : 'staticAttributes',
        'commands' : 'commands',
        'registration_id': 'registrationId'
    },
    context = {
        op: 'IoTAgentNGSI.MigrationTool'
    };

function connectToDb(dbConfig, dbName, callback) {
    var url = 'mongodb://' + dbConfig.host + ':' + (dbConfig.port || 27017) + '/' + dbName;

    MongoClient.connect(url, callback);
}

function generateCollectionTranslator(translationKey) {
    function translateItem(item, innerCb) {
        var translatedItem = {};

        for (var i in item) {
            if (item.hasOwnProperty(i) && translationKey[i]) {
                translatedItem[translationKey[i]] = item[i];
            } else if (i !== '_id') {
                logger.warn(context, 'Attribute [%s] was not found for item translation', i);
            }
        }

        innerCb(null, translatedItem);
    }

    return function translateCollection(docs, innerCb) {
        async.map(docs, translateItem, innerCb);
    };
}

function migrate(dbConfig, originDb, targetDb, service, subservice, callback) {

    function saveToTargetDb(db, collection, docs, innerCb) {
        if (docs.length > 0) {
            db.collection(collection).insertMany(docs, function(error, inserts) {
                innerCb(error);
            });
        } else {
            innerCb();
        }
    }

    function setDefaultName(item, innerCb) {
        if (!item.name || item.name === '') {
            item.name = item.type + ':' + item.id;
        }

        innerCb(null, item);
    }

    function applyDefaultName(docs, innerCb) {
        async.map(docs, setDefaultName, innerCb);
    }

    function translateProtocol(item, innerCb) {
        if (item.protocol && dbConfig.protocols && dbConfig.protocols[item.protocol]) {
            item.protocol = dbConfig.protocols[item.protocol];
        }

        innerCb(null, item);
    }

    function applyProtocolTranslations(docs, innerCb) {
        async.map(docs, translateProtocol, innerCb);
    }

    function getCollection(db, name, service, subservice, innerCb) {
        var query = {};

        if (service) {
            query.service = service;
        }

        if (subservice) {
            query.service_path = subservice;
        }

        db.collection(name).find(query).toArray(innerCb);
    }

    function closeDb(db, innerCb) {
        db.close(function(error) {
            innerCb();
        });
    }

    function startMigration(dbResults, innerCb) {
        var originDb = dbResults[0],
            targetDb = dbResults[1];

        async.waterfall([
            apply(getCollection, originDb, 'SERVICE', service, subservice),
            generateCollectionTranslator(serviceTranslation),
            apply(saveToTargetDb, targetDb, 'groups'),
            apply(getCollection, originDb, 'DEVICE', service, subservice),
            generateCollectionTranslator(deviceTranslation),
            applyDefaultName,
            applyProtocolTranslations,
            apply(saveToTargetDb, targetDb, 'devices'),
            apply(closeDb, originDb),
            apply(closeDb, targetDb)
        ], function(error) {
            innerCb(error);
        });
    }

    async.waterfall([
        apply(async.series, [
            apply(connectToDb, dbConfig, originDb),
            apply(connectToDb, dbConfig, targetDb)
        ]),
        startMigration
    ], callback);
}

exports.migrate = migrate;
