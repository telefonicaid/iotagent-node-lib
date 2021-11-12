/*
 * Copyright 2015 Telefonica Investigación y Desarrollo, S.A.U
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
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */

const logger = require('logops');
const dbService = require('../../model/dbConn');
const intoTrans = require('../common/domain').intoTrans;
const fillService = require('./../common/domain').fillService;
const alarmsInt = require('../common/alarmManagement').intercept;
const constants = require('../../constants');
const errors = require('../../errors');
const Group = require('../../model/Group');
const async = require('async');
const cacheManager = require('cache-manager');
const redisStore = require('cache-manager-ioredis');

let redisCache;
let redisClient;
let memoryCache;
let cache;
let context = {
    op: 'IoTAgentNGSI.MongoDBGroupRegister'
};

const attributeList = [
    'url',
    'resource',
    'apikey',
    'type',
    'service',
    'subservice',
    'description',
    'trust',
    'cbHost',
    'timezone',
    'timestamp',
    'commands',
    'lazy',
    'attributes',
    'staticAttributes',
    'internalAttributes',
    'autoprovision',
    'explicitAttrs',
    'expressionLanguage',
    'defaultEntityNameConjunction',
    'ngsiVersion',
    'cache'
];
/**
 * Sets up the in-memory and Redis caches for service groups, should one be required.
 */
function initialiseCaches(config) {
    function isCacheableValue(value) {
        if (value !== null && value !== false && value !== undefined) {
            return value.cache;
        }
        return false;
    }
    function initialiseRedis(redis, isCacheableValue) {
        const redisCache = cacheManager.caching({
            store: redisStore,
            host: redis.groupHost,
            port: redis.groupPort,
            password: redis.groupPassword,
            db: redis.groupDB,
            ttl: redis.groupTTL,
            isCacheableValue
        });
        redisClient = redisCache.store.getClient();
        redisClient.on('error', (error) => {
            logger.error(context, 'Redis for Service Groups : ' + error);
        });
        redisClient.on('connect', () => {
            logger.info(context, 'Successfully connected to Redis for Service Groups');
        });
        return redisCache;
    }

    function initialiseMemCache(memCache, isCacheableValue) {
        return cacheManager.caching({
            store: 'memory',
            max: memCache.groupMax,
            ttl: memCache.groupTTL,
            isCacheableValue
        });
    }

    redisCache = config.redis.enabled ? initialiseRedis(config.redis, isCacheableValue) : undefined;
    memoryCache = config.memCache.enabled ? initialiseMemCache(config.memCache, isCacheableValue) : undefined;

    if (redisCache) {
        cache = memoryCache ? cacheManager.multiCaching([memoryCache, redisCache], { isCacheableValue }) : redisCache;
    } else if (memoryCache) {
        cache = memoryCache;
    } else {
        cache = undefined;
    }
}

/**
 * Empties the memory cache
 */
function clearCache() {
    if (cache) {
        cache.reset();
    }
}

/**
 * Generates a handler for the save device group operations. The handler will take the customary error and the saved
 * device group as the parameters (and pass the serialized DAO as the callback value).
 *
 * @return {Function}       The generated handler.
 */
function saveGroupHandler(groupDAO, callback) {
    /* eslint-disable-next-line no-unused-vars */
    return function saveHandler(error, result) {
        if (error) {
            logger.debug(fillService(context, groupDAO), 'Error storing device group information: %s', error);

            callback(new errors.InternalDbError(error));
        } else {
            callback(null, groupDAO.toObject());
        }
    };
}

function createGroup(group, callback) {
    /* eslint-disable-next-line  new-cap */
    const groupObj = new Group.model();

    attributeList.forEach((key) => {
        groupObj[key] = group[key];
    });

    logger.debug(
        context,
        'Storing device group with id [%s], type [%s], apikey [%s] and resource [%s]',
        groupObj._id,
        groupObj.type,
        groupObj.apikey,
        groupObj.resource
    );

    groupObj.save(function saveHandler(error, groupDAO) {
        if (error) {
            if (error.code === 11000) {
                logger.debug(
                    context,
                    'Duplicate group entry with resource [%s] and apiKey [%s]',
                    group.resource,
                    group.apikey
                );

                callback(new errors.DuplicateGroup(group.resource, group.apikey));
            } else {
                logger.debug(context, 'Error storing device group information: %s', error);

                callback(new errors.InternalDbError(error));
            }
        } else {
            callback(null, groupDAO.toObject());
        }
    });
}

/**
 * List all the groups created in the IoT Agent.
 *
 * @param {Number} service      Service for wich all the configurations want to be retrieved.
 * @param {Number} limit        Maximum number of entries to return.
 * @param {Number} offset       Number of entries to skip for pagination.
 */
function listGroups(service, limit, offset, callback) {
    const condition = {};

    function toObjectFn(obj) {
        return obj.toObject();
    }

    if (service) {
        condition.service = service;
    }

    const query = Group.model.find(condition).sort();

    if (limit) {
        query.limit(parseInt(limit, 10));
    }

    if (offset) {
        query.skip(parseInt(offset, 10));
    }

    async.series([query.exec.bind(query), Group.model.countDocuments.bind(Group.model, condition)], function (
        error,
        results
    ) {
        callback(error, {
            count: results[1],
            services: results[0].map(toObjectFn)
        });
    });
}

function getById(id, callback) {
    context = fillService(context, { service: 'n/a', subservice: 'n/a' });
    logger.debug(context, 'Looking for device group with id [%s].', id);

    const query = Group.model.findOne({ _id: id });
    query.select({ __v: 0 });

    query.lean().exec(function handleGet(error, data) {
        if (error) {
            logger.debug(context, 'Internal MongoDB Error getting group: %s', error);

            callback(new errors.InternalDbError(error));
        } else if (data) {
            context = fillService(context, data);
            logger.debug(context, 'Device group data found: %j', data);
            callback(null, data);
        } else {
            logger.debug(context, 'Device group [%s] not found.', id);

            callback(new errors.DeviceGroupNotFound(id));
        }
    });
}

/**
 * List all the groups created in the IoT Agent for a service and a subservice.
 *
 * @param  {String} service        Service used to filter the groups.
 * @param  {String} subservice     Subservice used to filter the groups.
 * @param  {Function} callback     The callback function.
 */
function find(service, subservice, callback) {
    const condition = {};

    function toObjectFn(obj) {
        return obj.toObject();
    }

    condition.service = service;
    condition.subservice = subservice;

    const query = Group.model.find(condition).sort();

    async.series([query.exec.bind(query), Group.model.countDocuments.bind(Group.model, condition)], function (
        error,
        results
    ) {
        callback(error, {
            count: results[1],
            services: results[0].map(toObjectFn)
        });
    });
}

function findOneInMongoDB(queryObj, fields, callback) {
    const query = Group.model.findOne(queryObj);
    query.select({ __v: 0 });
    query.lean().exec(function handleGet(error, data) {
        if (error) {
            logger.debug(context, 'Internal MongoDB Error getting group: %s', error);
            callback(new errors.InternalDbError(error));
        } else if (data) {
            context = fillService(context, data);
            logger.debug(context, 'Device group data found: %j', data);
            callback(null, data);
        } else {
            logger.debug(context, 'Device group for fields [%j] not found: [%j]', fields, queryObj);
            callback(new errors.DeviceGroupNotFound(fields, queryObj));
        }
    });
}

function findBy(fields) {
    return function () {
        const queryObj = {};
        let i = 0;

        /* eslint-disable prefer-rest-params */
        while (typeof arguments[i] !== 'function') {
            if (arguments[i]) {
                queryObj[fields[i]] = arguments[i];
            }

            i++;
        }
        const callback = arguments[i];
        /* eslint-enable prefer-rest-params */

        context = fillService(context, { service: 'n/a', subservice: 'n/a' });
        logger.debug(context, 'Looking for group params %j with queryObj %j', fields, queryObj);
        if (cache) {
            cache.wrap(
                JSON.stringify(queryObj),
                (cacheCallback) => {
                    findOneInMongoDB(queryObj, fields, cacheCallback);
                },
                (error, data) => {
                    callback(error, data);
                }
            );
        } else {
            findOneInMongoDB(queryObj, fields, callback);
        }
    };
}

function update(id, body, callback) {
    logger.debug(context, 'Storing updated values for configuration [%s]:\n%s', id, JSON.stringify(body, null, 4));
    getById(id, function (error, group) {
        if (error) {
            callback(error);
        } else {
            attributeList.forEach((key) => {
                if (body[key] !== undefined) {
                    group[key] = body[key];
                }
            });
            clearCache();
            /* eslint-disable-next-line  new-cap */
            const groupObj = new Group.model(group);
            groupObj.isNew = false;
            groupObj.save(saveGroupHandler(groupObj, callback));
        }
    });
}

function remove(id, callback) {
    logger.debug(context, 'Removing device group with id [%s]', id);

    getById(id, function (error, deviceGroup) {
        if (error) {
            callback(error);
        } else {
            Group.model.deleteOne({ _id: id }, function (error) {
                if (error) {
                    logger.debug(context, 'Internal MongoDB Error getting device: %s', error);

                    callback(new errors.InternalDbError(error));
                } else {
                    logger.debug(context, 'Device [%s] successfully removed.', id);
                    clearCache();
                    callback(null, deviceGroup);
                }
            });
        }
    });
}

function init(newConfig, callback) {
    callback(null);
}

function clear(callback) {
    dbService.db.db.dropDatabase(callback);
}

exports.create = alarmsInt(constants.MONGO_ALARM, intoTrans(context, createGroup));
exports.list = alarmsInt(constants.MONGO_ALARM, intoTrans(context, listGroups));
exports.init = alarmsInt(constants.MONGO_ALARM, intoTrans(context, init));
exports.find = alarmsInt(constants.MONGO_ALARM, intoTrans(context, find));
exports.findType = alarmsInt(
    constants.MONGO_ALARM,
    intoTrans(context, findBy(['service', 'subservice', 'type', 'apikey']))
);
exports.findTypeSilently = intoTrans(context, findBy(['service', 'subservice', 'type', 'apikey']));
exports.findSilently = intoTrans(context, findBy(['service', 'subservice', 'apikey']));
exports.findBy = alarmsInt(constants.MONGO_ALARM, intoTrans(context, findBy));
exports.get = alarmsInt(constants.MONGO_ALARM, intoTrans(context, findBy(['resource', 'apikey'])));
exports.getSilently = intoTrans(context, findBy(['resource', 'apikey']));
exports.getType = alarmsInt(constants.MONGO_ALARM, intoTrans(context, findBy(['type'])));
exports.getTypeSilently = intoTrans(context, findBy(['type']));
exports.update = alarmsInt(constants.MONGO_ALARM, intoTrans(context, update));
exports.remove = alarmsInt(constants.MONGO_ALARM, intoTrans(context, remove));
exports.clear = alarmsInt(constants.MONGO_ALARM, intoTrans(context, clear));
exports.initialiseCaches = initialiseCaches;
