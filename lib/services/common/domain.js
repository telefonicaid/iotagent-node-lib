/*
 * Copyright 2014 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of fiware-pep-steelskin
 *
 * fiware-pep-steelskin is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * fiware-pep-steelskin is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with fiware-pep-steelskin.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[iot_support@tid.es]
 */

'use strict';

var domain = require('domain'),
    constants = require('../../constants'),
    uuid = require('node-uuid'),
    logger = require('logops'),
    context = {
        op: 'IoTAgentNGSI.DomainControl'
    };

var CORRELATOR_HEADER = 'Fiware-Correlator';

function getDomainTransaction() {
    if (domain.active && domain.active.trans) {
        return domain.active.trans;
    } else {
        return uuid.v4();
    }
}

function cleanDomain(domainToClean) {
    var responseTime = Date.now() - domainToClean.start;
    logger.debug(context, 'response-time: ' + responseTime);
    domainToClean.removeAllListeners('error');
    delete domainToClean.trans;
    delete domainToClean.corr;
    delete domainToClean.op;
    delete domainToClean.path;
    domainToClean.exit();
}

function generateDomainErrorHandler(domainToHandle) {
    return function domainErrorHandler(err) {
        logger.error(context, err);
        cleanDomain(domainToHandle);
    };
}

/**
 * Express middleWare that creates a domain per request
 * It also generates a unique request id that can be used to track requests in logs.
 */
function requestDomain(req, res, next) {
    var reqDomain = domain.create();
    reqDomain.path = req.path;
    reqDomain.op = req.url;
    reqDomain.start = Date.now();

    reqDomain.add(req);
    reqDomain.add(res);

    if (req.headers[constants.SERVICE_HEADER]) {
        reqDomain.service = req.headers[constants.SERVICE_HEADER];
    }

    if (req.headers[constants.SUBSERVICE_HEADER]) {
        reqDomain.subservice = req.headers[constants.SUBSERVICE_HEADER];
    }

    function requestHandler() {
        var corr = req.get(CORRELATOR_HEADER);

        reqDomain.trans = req.requestId = getDomainTransaction();
        if (corr) {
            reqDomain.corr = corr;
        } else {
            reqDomain.corr = reqDomain.trans;
        }
        res.set(CORRELATOR_HEADER, reqDomain.corr);
        next();
    }

    res.once('finish', cleanDomain.bind(null, reqDomain));
    reqDomain.on('error', generateDomainErrorHandler(reqDomain));
    reqDomain.enter();
    reqDomain.run(requestHandler);
}

/**
 * Ensures that the current operation is executed inside a transaction with all the information needed
 * for the appropriate platform logging: start date, transaction ID and correlator in case one is needed.
 * If the function is executed in the context of a previous transaction, just the context is changed
 * (and the Transaction ID and start time are kept).
 *
 * @param {Object} context              New context data for the transaction.
 * @return {Object}                     Return value of the callback function, if any.
 */
function ensureSouthboundTransaction(context, callback) {
    var reqDomain;

    if (!callback && typeof context === 'function') {
        callback = context;
    }

    if (!domain.active) {
        reqDomain = domain.create();
        reqDomain.start = Date.now();
        reqDomain.on('error', generateDomainErrorHandler(reqDomain));
        reqDomain.enter();
    } else {
        reqDomain = domain.active;
    }

    if (!domain.active.trans || !domain.active.corr) {
        reqDomain.trans = getDomainTransaction();
        reqDomain.corr = reqDomain.trans;
    }

    if (context && context.op) {
        reqDomain.op = context.op;

        if (context.service) {
            reqDomain.service = context.service;
        }

        if (context.subservice) {
            reqDomain.subservice = context.subservice;
        }
    }

    return reqDomain.run(callback);
}

/**
 * Modifies a function so that, if it was not in a transaction, it is inserted into one, or, in case it was
 * already inside a transaction, adds new information to the transaction.
 *
 * @param {Object}   context            Logging context for the function.
 * @param {Function} fn                 Function to modify.
 * @return {Function}                   New function executing the old one with the context.
 */
function intoTransaction(context, fn) {
    return function() {
        var originalArguments = arguments;

        function expandedFunction() {
            return fn.apply(fn, originalArguments);
        }

        return ensureSouthboundTransaction(context, expandedFunction);
    };
}

/**
 * Terminates the current transaction, if there is any, cleaning its context.
 */
function finishSouthboundTransaction(callback) {
    if (domain.active) {
        cleanDomain(domain.active);
    }

    callback();
}

/**
 * Fills service and subservice information in a context object for logging matters.
 *
 * @param {Object} context      Context object that will be used to add the service and subservice information.
 * @param {Object} data         Data object (configuration or device) containing service information.
 * @return {Object}             New context containing service information.
 */
function fillService(context, data) {
    if (data.service) {
        context.service = data.service;
    }

    if (data.subservice) {
        context.subservice = data.subservice;
    }

    return context;
}

exports.ensureSouthboundDomain = ensureSouthboundTransaction;
exports.finishSouthBoundTransaction = finishSouthboundTransaction;
exports.fillService = fillService;
exports.requestDomain = requestDomain;
exports.intoTrans = intoTransaction;
