'use strict';

var async = require('async'),
    apply = async.apply,
    logger = require('logops'),
    constants = require('../../constants'),
    errors = require('../../errors'),
    ngsi = require('../ngsi2/ngsiService'),
    intoTrans = require('../common/domain').intoTrans,
    deviceService = require('../devices/deviceServiceNgsi2'),
    commands = require('../commands/commandService'),
    middlewares = require('../common/genericMiddleware'),
    _ = require('underscore'),
    context = {
        op: 'IoTAgentNGSI.ContextServer'
    },
    createContextTemplate = require('../../templates/createContextNgsi2.json'),
    updateContextTemplate = require('../../templates/updateContextNgsi2.json'),
    queryContextTemplate = require('../../templates/queryContextNgsi2.json'),
    notificationTemplate = require('../../templates/notificationTemplateNgsi2.json'),
    mustache = require('mustache'),
    fs = require('fs'),
    queryTemplates = {
        template: '',
        contextElementTemplate: '',
        attributeTemplate: ''
    },
    updateTemplates = {
        template: '',
        contextElementTemplate: '',
        attributeTemplate: ''
    },
    notificationMiddlewares = [],
    updateHandler,
    commandHandler,
    queryHandler,
    notificationHandler;

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

            for (var j in attributes) {

                if (device.commands[i].name === j) {

                    var newAttributes = [
                        {
                            name: device.commands[i].name + '_status',
                            type: constants.COMMAND_STATUS,
                            value: 'PENDING'
                        }
                    ];

                    sideEffects.push(
                        apply(ngsi.update,
                            device.name,
                            device.resource,
                            device.apikey,
                            newAttributes,
                            device
                        )
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

    var attsArray=[];
    for(var i in attributes){
        if(i !== 'id' && i !== 'type'){
            var attWithName=attributes[i];
            attWithName.name=i;
            attsArray.push(attWithName); 
        }
    }

    async.map(attsArray, apply(commands.add, service, subservice, device.id), callback);
}

/**
 * Generate all the update actions corresponding to a update context request. Update actions include updates in
 * attributes and execution of commands. This action will be called once per Context Element in the request.
 *
 * @param {Object} req                  Update request to generate Actions from
 * @param {Object} contextElement       Context Element whose actions will be extracted.
 */
function generateUpdateActions(req, contextElement, callback) {
    var entityId=undefined;
    var entityType= undefined;
    var attributes={};
    if(contextElement.id && contextElement.type){
        entityId=contextElement.id;
        entityType=contextElement.type;
    }else if(req.params.entity ){
        entityId=req.params.entity;
    }

    function splitUpdates(device, callback) {
        var attributes = [],
            commands = [],
            found;
 
        if (device.commands) {
            attributeLoop: for (var i in contextElement) {
  
                for (var j in device.commands) {
                    
                    if (i === device.commands[j].name) {
                        var newAtt={};
                        newAtt[i]=contextElement[i];
                        commands.push(newAtt);
                        found = true;
                        continue attributeLoop;
                    }
                }
                if(i !== 'type' && i !== 'id'){
                    var newAtt={};
                    newAtt[i]=contextElement[i];
                    attributes.push(newAtt);
                }

            }

        } else {
            for(var i in contextElement){
                if(i !== 'type' && i !== 'id'){
                    attributes.push(contextElement[i]);
                }
            }
                
        }

        callback(null, attributes, commands, device);
    }

    function createActionsArray(attributes, commands, device, callback) {

        var updateActions = [];

        if (updateHandler) {
            
            updateActions.push(
                async.apply(
                    updateHandler,
                    entityId,
                    entityType,
                    req.headers['fiware-service'],
                    req.headers['fiware-servicepath'],
                    attributes)
            );
        }

        if (commandHandler) {

            if (device.polling) {
                updateActions.push(
                    async.apply(
                        pushCommandsToQueue,
                        device,
                        entityId,
                        entityType,
                        req.headers['fiware-service'],
                        req.headers['fiware-servicepath'],
                        contextElement)
                );
            } else {
                updateActions.push(
                    async.apply(
                        commandHandler,
                        entityId,
                        entityType,
                        req.headers['fiware-service'],
                        req.headers['fiware-servicepath'],
                        commands)
                );
            }
        }

        updateActions.push(
            async.apply(
                executeUpdateSideEffects,
                device,
                entityId,
                entityType,
                req.headers['fiware-service'],
                req.headers['fiware-servicepath'],
                contextElement)
        );

        callback(null, updateActions);
    }

    deviceService.getDeviceByName(entityId, req.headers['fiware-service'], req.headers['fiware-servicepath'],
        function(error, deviceObj) {

            if (error) {
                callback(error);
            } else {
                async.waterfall([
                    apply(deviceService.findConfigurationGroup, deviceObj),
                    apply(deviceService.mergeDeviceWithConfiguration,
                        [
                            'lazy',
                            'internalAttributes',
                            'active',
                            'staticAttributes',
                            'commands',
                            'subscriptions'
                        ],
                        [null, null, [], [], [], [], []],
                        deviceObj
                    ),
                    splitUpdates,
                    createActionsArray
                ], callback);
            }
        });
}


/**
 * Express middleware to manage incoming UpdateContext requests. 
 */
function handleUpdate(req, res, next) {

    function reduceActions(actions, callback) {
        callback(null, _.flatten(actions));
    }

    if (updateHandler || commandHandler) {
        logger.debug(context, 'Handling update from [%s]', req.get('host'));
        logger.debug(context, req.body);

        async.waterfall([
            apply(generateUpdateActions, req,req.body),
            reduceActions,
            async.series
        ], function(error, result) {
            if (error) {
                logger.debug(context, 'There was an error handling the update action: %s.', error);
                next(error);
            } else {
                logger.debug(context, 'Update action from [%s] handled successfully.', req.get('host'));
                res.status(204).json();
            }
        });
    } else {
        logger.error(context, 'Tried to handle an update request before the update handler was stablished.');

        var errorNotFound = new Error({
            message: 'Update handler not found'
        });
        next(errorNotFound);
    }
}

/**
 * Handle queries coming to the IoT Agent via de Context Provider API (as a consequence of a query to a passive
 * attribute redirected by the Context Broker).
 *
 * @param {String} id           Entity name of the selected entity in the query.
 * @param {String} type         Type of the entity.
 * @param {String} service      Service the device belongs to.
 * @param {String} subservice   Division inside the service.
 * @param {Array} attributes    List of attributes to read.
 */
function defaultQueryHandler(id, type, service, subservice, attributes, callback) {
    var contextElement = {
        type: type,
        id: id
    };

    deviceService.getDeviceByName(id, service, subservice, function(error, ngsiDevice) {
        if (error) {
            callback(error);
        } else {
            for (var i = 0; i < attributes.length; i++) {
                var lazyAttribute = _.findWhere(ngsiDevice.lazy, { name: attributes[i] }),
                    command = _.findWhere(ngsiDevice.commands, { name: attributes[i] }),
                    attributeType;

                if (command) {
                    attributeType = command.type;
                } else if (lazyAttribute) {
                    attributeType = lazyAttribute.type;
                } else {
                    attributeType = 'string';
                }

                var attValue={};
                contextElement[attributes[i]]={
                    type: attributeType,
                    value: ''
                };
            }

            callback(null, contextElement);
        }
    });
}

/**
 * Express middleware to manage incoming QueryContext requests.  */
function handleQuery(req, res, next) {
    function getName(element) {
        return element.name;
    }

    function addStaticAttributes(attributes, device, contextElement, callback) {

        function inAttributes(item) {
            return item.name && attributes.indexOf(item.name) >= 0;
        }

        if (device.staticAttributes) {

            var selectedAttributes=[];
            if(attributes === undefined || attributes.length === 0){
                selectedAttributes= device.staticAttributes;
            }
            else{
                selectedAttributes = device.staticAttributes.filter(inAttributes);
            }

            for(var att in selectedAttributes){
                contextElement[selectedAttributes[att].name]={
                    'type':selectedAttributes[att].type,
                    'value':selectedAttributes[att].value
                }
            }
        }

        callback(null, contextElement);
    }

    function completeAttributes(attributes, device, callback) {   
        if (attributes && attributes.length !== 0) {
            logger.debug(context, 'Handling received set of attributes: %j', attributes);
            callback(null, attributes);
        } else if (device.lazy) {
            logger.debug(context, 'Handling stored set of attributes: %j', attributes);
            var results=device.lazy.map(getName);
            callback(null, results);
        } else {
            logger.debug(context, 'Couldn\'t find any attributes. Handling with null reference');
            callback(null, null);
        }
    }

    function createQueryRequest(attributes, contextEntity, callback) {
  
        var actualHandler;

        if (queryHandler) {
            actualHandler = queryHandler;
        } else {
            actualHandler = defaultQueryHandler;
        }

        async.waterfall([
            apply(
                deviceService.getDeviceByName,
                contextEntity.id,
                req.headers['fiware-service'],
                req.headers['fiware-servicepath']),
            deviceService.findConfigurationGroup
        ], function handleFindDevice(error, device) {

            if(!device){
                callback(new errors.DeviceNotFound(contextEntity.id));
            }
            
            var executeCompleteAttributes = apply(
                completeAttributes,
                attributes,
                device
                ),
                executeQueryHandler = apply(
                    actualHandler,
                    contextEntity.id,
                    contextEntity.type,
                    req.headers['fiware-service'],
                    req.headers['fiware-servicepath']
                ),
                executeAddStaticAttributes = apply(
                    addStaticAttributes,
                    attributes,
                    device
                );

            async.waterfall( [
                executeCompleteAttributes,
                executeQueryHandler,
                executeAddStaticAttributes
            ],callback);

        });

    }

    function handleQueryContextRequests(error, result) {
        if (error) {
            logger.debug(context, 'There was an error handling the query: %s.', error);
            next(error);
        } else {
            logger.debug(context, 'Query from [%s] handled successfully.', req.get('host'));
            res.status(200).json(result);
        }
    }

    logger.debug(context, 'Handling query from [%s]', req.get('host'));
    var contextEntity={};
    contextEntity.id= req.params.entity;
    contextEntity.type= undefined;
    createQueryRequest([],contextEntity,handleQueryContextRequests);
/*
    async.waterfall([
        apply(async.map, req.body.entities, apply(createQueryRequests, req.body.attributes)),
        async.series
    ], handleQueryContextRequests);
    */
}

function handleNotification(req, res, next) {

    function extractInformation(dataElement, callback) {
        var atts=[];
        for(var key in dataElement){
            if(key != "id" && key!= "type"){
                var att={};
                att.type=dataElement[key].type;
                att.value=dataElement[key].value;
                att.name =key;
                atts.push(att);
            }
        }
        deviceService.getDeviceByName(
            dataElement.id,
            req.headers['fiware-service'],
            req.headers['fiware-servicepath'],
            function(error, device) {
                if (error) {
                    callback(error);
                } else {
                    callback(null, device, atts);
                }
            });
    }

    function applyNotificationMiddlewares(device, values, callback) {
        if (notificationMiddlewares.length > 0) {
            var firstMiddleware = notificationMiddlewares.slice(0, 1)[0],
                rest = notificationMiddlewares.slice(1),
                startMiddleware = apply(firstMiddleware, device, values),
                composedMiddlewares = [startMiddleware].concat(rest);

            async.waterfall(composedMiddlewares, callback);
        } else {
            callback(null, device, values);
        }
    }

    function createNotificationHandler(contextResponse, callback) {
        async.waterfall([
            apply(extractInformation, contextResponse),
            applyNotificationMiddlewares,
            notificationHandler
        ], callback);
    }

    function handleNotificationRequests(error) {
        if (error) {
            logger.error(context, 'Error found when processing notification: %j', error);
            next(error);
        } else {
            res.status(200).json({});
        }
    }

    if (notificationHandler) {
        logger.debug(context, 'Handling notification from [%s]', req.get('host'));
        async.map(req.body.data, createNotificationHandler, handleNotificationRequests);

    } else {
        var errorNotFound = new Error({
            message: 'Notification handler not found'
        });

        logger.error(context, 'Tried to handle a notification before notification handler was established.');

        next(errorNotFound);
    }
}

/**
 * Sets the new user handler for Entity update requests. This handler will be called whenever an update request arrives
 * with the following parameters: (id, type, attributes, callback). The callback is in charge of updating the
 * corresponding values in the devices with the appropriate protocol.
 *
 * In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each
 * entity, and all the results will be combined into a single response.
 *
 * @param {Function} newHandler         User handler for update requests
 */
function setUpdateHandler(newHandler) {
    updateHandler = newHandler;
}

/**
 * Sets the new user handler for commadn execution requests. This handler will be called whenever an update request
 * arrives to a with the following parameters: (id, type, attributes, callback). The callback is in charge of updating
 * the corresponding values in the devices with the appropriate protocol.
 *
 * In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each
 * entity, and all the results will be combined into a single response.
 *
 * @param {Function} newHandler         User handler for update requests
 */
function setCommandHandler(newHandler) {
    commandHandler = newHandler;
}

/**
 * Sets the new user handler for Entity query requests. This handler will be called whenever an update request arrives
 * with the following parameters: (id, type, attributes, callback). The handler must retrieve all the corresponding
 * information from the devices and return a NGSI entity with the requested values.
 *
 * In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each
 * entity, and all the results will be combined into a single response.

 * @param {Function} newHandler         User handler for query requests
 */
function setQueryHandler(newHandler) {
    queryHandler = newHandler;
}

/**
 * Sets the new user handler for entity change notifications. This candler will be called for each notification in an
 * entity the IOTA is subscribed to.
 *
 * In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each
 * entity, and all the results will be combined into a single response.
 *
 * @param {Function} newHandler         User handler for incoming notifications
 *
 */
function setNotificationHandler(newHandler) {
    notificationHandler = newHandler;
}


function queryErrorHandling(error, req, res, next) {
    var code = 500;

    logger.debug(context, 'Query error [%s] handling request: %s', error.name, error.message);

    if (error.code && String(error.code).match(/^[2345]\d\d$/)) {
        code = error.code;
    }

    res.status(code).json({
        errorCode: {
            code: code,
            reasonPhrase: error.name,
            details: error.message.replace(/[<>\"\'=;\(\)]/g, '')
        }
    });
}

function updateErrorHandling(error, req, res, next) {
    var code = 500;

    logger.debug(context, 'Update error [%s] handing request: %s', error.name, error.message);

    if (error.code && String(error.code).match(/^[2345]\d\d$/)) {
        code = error.code;
    }

    res.status(code).json(
        {
            contextResponses: [
                {
                    contextElement: req.body,
                    statusCode: {
                        code: code,
                        reasonPhrase: error.name,
                        details: error.message.replace(/[<>\"\'=;\(\)]/g, '')
                    }
                }
            ]
        }
    );
}


/**
 * Load the routes related to context dispatching (NGSIv2 calls).
 *
 * @param {Object} router      Express request router object.
 */
function loadContextRoutes(router) {
    //TODO: remove '//' paths when the appropriate patch comes to Orion
    var createMiddlewares =[
            middlewares.ensureTypeNgsi2,
            middlewares.validateJson(createContextTemplate),
            handleUpdate,
            updateErrorHandling
        ],
        updateMiddlewares = [
            middlewares.ensureTypeNgsi2,
            middlewares.validateJson(updateContextTemplate),
            handleUpdate,
            updateErrorHandling
        ],
        queryMiddlewares = [
            middlewares.ensureTypeNgsi2,
            handleQuery,
            queryErrorHandling
        ],
        createPaths = [
            '/v2/entities',
        ],
        updatePaths = [
            '/v2/entities/:entity/attrs',
        ],
        queryPaths = [
            '/v2/entities',
            '/v2/entities/:entity',
            '/v2/entities/:entity/attrs/:attr'
        ];

    logger.info(context, 'Loading NGSI Contect server routes');

    for (var i = 0; i < createPaths.length; i++) {        
        router.post(createPaths[i], createMiddlewares);    }

    for (var i = 0; i < updatePaths.length; i++) {
        router.post(updatePaths[i], updateMiddlewares);
    }

    for (var i = 0; i < queryPaths.length; i++) {
        router.get(queryPaths[i], queryMiddlewares);
    }

    router.post('/notify', [
        middlewares.ensureTypeNgsi2,
        middlewares.validateJson(notificationTemplate),
        handleNotification,
        queryErrorHandling
    ]);

}

function addNotificationMiddleware(newMiddleware) {
    notificationMiddlewares.push(newMiddleware);
}

function clear(callback) {
    notificationMiddlewares = [];
    notificationHandler = null;
    commandHandler = null;
    updateHandler = null;

    if (callback) {
        callback();
    }
}

exports.clear = clear;
exports.loadContextRoutes = intoTrans(context, loadContextRoutes);
exports.setUpdateHandler = intoTrans(context, setUpdateHandler);
exports.setCommandHandler = intoTrans(context, setCommandHandler);
exports.setNotificationHandler = intoTrans(context, setNotificationHandler);
exports.addNotificationMiddleware = intoTrans(context, addNotificationMiddleware);
exports.setQueryHandler = intoTrans(context, setQueryHandler);