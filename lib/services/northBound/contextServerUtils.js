var async = require('async'),
    apply = async.apply,
    logger = require('logops'),
    constants = require('../../constants'),
    config = require('../../commonConfig'),
    ngsi = require('../ngsi/ngsiService'),
    commands = require('../commands/commandService'),
    context = {
        op: 'IoTAgentNGSI.ContextServerUtils'
    };


/**
 * Returns the Current Tenant  defined for the NGSI-LD Broker. Tenant is based on the request
 * Headers - default to using the new NGSILD-Tenant header, fallback to the v2 fiware-service header
 * and finally see if the config holds a defined tenant. Not all brokers are currently
 * obliged to offer service headers - this is still being defined in the NGSI-LD specifications.
 *
 * @param {Object} req              Request that was handled in first place.
 * @return {String}                 The Tenant decribed in the request headers
 */
function getLDTenant(req){
    if (req.headers['NGSILD-Tenant']){
        return req.headers['NGSILD-Tenant'];
    } else if (req.headers['fiware-service']){
        return req.headers['fiware-service'];
    } else {
        return config.getConfig().contextBroker.fallbackTenant;
    }
}

/**
 * Returns the Current Path defined for the NGSI-LD Broker. Tenant is based on the request
 * Headers - default to using the new NGSILD Path header, fallback to the v2 fiware-servicepath header
 * see if the config holds a defined servicepath and finally try slashs. Not all brokers are currently
 * obliged to offer service headers - this is still being defined in the NGSI-LD specifications.
 */
function getLDPath(req) {
    if (req.headers['NGSILD-Path']){
        return req.headers['NGSILD-Path'];
    } else if (req.headers['fiware-servicepath']){
        return req.headers['fiware-servicepath'];
    } else {
        return config.getConfig().contextBroker.fallbackPath;
    }
}


/**
 * Create the response for an UpdateContext operation, based on the results of the individual updates. The signature
 * retains the results object for homogeinity with the createQuery* version.
 *
 * @param {Object} req              Request that was handled in first place.
 * @param {Object} res              Response that will be sent.
 * @param {Object} results          Ignored for this function. TODO: to be removed in later versions.
 * @return {{contextResponses: Array}}
 */
function createUpdateResponse(req, res, results) {
    var result = {
        contextResponses: []
    };

    for (var i = 0; i < req.body.contextElements.length; i++) {
        var contextResponse = {
            contextElement: {
                attributes: req.body.contextElements[i].attributes,
                id: req.body.contextElements[i].id,
                isPattern: false,
                type: req.body.contextElements[i].type
            },
            statusCode: {
                code: 200,
                reasonPhrase: 'OK'
            }
        };

        for (var j = 0; j < contextResponse.contextElement.attributes.length; j++) {
            contextResponse.contextElement.attributes[i].value = '';
        }

        result.contextResponses.push(contextResponse);
    }

    logger.debug(context, 'Generated update response: %j', result);

    return result;
}

/**
 * Create the response for a queryContext operation based on the individual results gathered from the query handlers.
 * The returned response is in the NGSI Response format.
 *
 * @param {Object} req              Request that was handled in first place.
 * @param {Object} res              Response that will be sent.
 * @param {Object} results          Individual Context Element results from the query handlers.
 * @return {{contextResponses: Array}}
 */
function createQueryResponse(req, res, results) {
    var result = {
        contextResponses: []
    };

    for (var i = 0; i < results.length; i++) {
        var contextResponse = {
            contextElement: results[i],
            statusCode: {
                code: 200,
                reasonPhrase: 'OK'
            }
        };

        contextResponse.contextElement.isPattern = false;

        result.contextResponses.push(contextResponse);
    }

    logger.debug(context, 'Generated query response: %j', result);

    return result;
}

/**
 * Retrieve the Device that corresponds to a Context Update, and execute the update side effects
 * if there were any (e.g.: creation of attributes related to comands).
 *
 * @param {String} device           Object that contains all the information about the device.
 * @param {String} id               Entity ID of the device to find.
 * @param {String} type             Type of the device to find.
 * @param {String} service          Service of the device.
 * @param {String} subservice       Subservice of the device.
 * @param {Array}  attributes       List of attributes to update with their types and values.
 */
function executeUpdateSideEffects(device, id, type, service, subservice, attributes, callback) {
    var sideEffects = [];

    if (device.commands) {
        for (var i = 0; i < device.commands.length; i++) {
            for (var j = 0; j < attributes.length; j++) {
                if (device.commands[i].name === attributes[j].name) {
                    var newAttributes = [
                        {
                            name: device.commands[i].name + '_status',
                            type: constants.COMMAND_STATUS,
                            value: 'PENDING'
                        }
                    ];

                    sideEffects.push(
                        apply(ngsi.update, device.name, device.resource, device.apikey, newAttributes, device)
                    );
                }
            }
        }
    }

    async.series(sideEffects, callback);
}

/**
 * Extract all the commands from the attributes section and add them to the Commands Queue.
 *
 * @param {String} device           Object that contains all the information about the device.
 * @param {String} id               Entity ID of the device to find.
 * @param {String} type             Type of the device to find.
 * @param {String} service          Service of the device.
 * @param {String} subservice       Subservice of the device.
 * @param {Array}  attributes       List of attributes to update with their types and values.
 */
function pushCommandsToQueue(device, id, type, service, subservice, attributes, callback) {
    async.map(attributes, apply(commands.add, service, subservice, device.id), callback);
}

exports.notificationMiddlewares = [];
exports.updateHandler = null;
exports.commandHandler = null;
exports.queryHandler = null;
exports.notificationHandler = null;
exports.createUpdateResponse = createUpdateResponse;
exports.createQueryResponse = createQueryResponse;
exports.executeUpdateSideEffects = executeUpdateSideEffects;
exports.pushCommandsToQueue = pushCommandsToQueue;
exports.getLDTenant = getLDTenant;
exports.getLDPath = getLDPath;
