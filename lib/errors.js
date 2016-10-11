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
 * please contact with::daniel.moranjimenez@telefonica.com
 */

'use strict';

module.exports = {
    RegistrationError: function(id, type) {
        this.name = 'REGISTRATION_ERROR';
        this.message = 'Error registering context provider for device: ' + id + ' of type: ' + type;
    },
    UnregistrationError: function(id, type) {
        this.name = 'UNREGISTRATION_ERROR';
        this.message = 'Error unregistering context provider for device: ' + id + ' of type: ' + type;
    },
    EntityGenericError: function(id, type, details, code) {
        this.name = 'ENTITY_GENERIC_ERROR';
        this.message = 'Error accesing entity data for device: ' + id + ' of type: ' + type;
        this.details = details || {};
        this.code = code || 200;
    },
    EntityNotFound: function(id) {
        this.name = 'ENTITY_NOT_FOUND';
        this.message = 'The entity with the requested id [' + id + '] was not found.';
        this.code = 404;
    },
    RegistryNotAvailable: function() {
        this.name = 'REGISTRY_NOT_AVAILABLE';
        this.message = 'No device registry is available.';
    },
    InternalDbError: function(msg) {
        this.name = 'INTERNAL_DB_ERROR';
        this.message = 'An internal DB Error happened: ' + msg;
    },
    BadRequest: function(msg) {
        this.name = 'BAD_REQUEST';
        this.message = 'Request error connecting to the Context Broker: ' + msg;
        this.code = 400;
    },
    UnsupportedContentType: function(type) {
        this.name = 'UNSUPPORTED_CONTENT_TYPE';
        this.message = 'Unsuported content type in the context request: ' + type;
        this.code = 400;
    },
    TypeNotFound: function(id, type) {
        this.name = 'TYPE_NOT_FOUND';
        this.message = 'Type : ' + type + ' not found for device with id: ' + id;
        this.code = 500;
    },
    MissingAttributes: function(msg) {
        this.name = 'MISSING_ATTRIBUTES';
        this.message = 'The request was not well formed:' + msg;
    },
    DeviceNotFound: function(id) {
        this.name = 'DEVICE_NOT_FOUND';
        this.message = 'No device was found with id:' + id;
        this.code = 404;
    },
    DuplicateDeviceId: function(id) {
        this.name = 'DUPLICATE_DEVICE_ID';
        this.message = 'A device with the same pair (Service, DeviceId) was found:' + id;
        this.code = 409;
    },
    DuplicateGroup: function(res, key) {
        this.name = 'DUPLICATE_GROUP';
        this.message = 'A device configuration already exists for resource ' + res + ' and API Key ' + key;
        this.code = 409;
    },
    SecurityInformationMissing: function(type) {
        this.name = 'SECURITY_INFORMATION_MISSING';
        this.message = 'Some security information was missing for device type:' + type;
    },
    TokenRetrievalError: function(trust, msg) {
        this.name = 'TOKEN_RETRIEVAL_ERROR';
        this.message = 'An error occurred trying to retrieve a token with trust [' + trust + ']: ' + msg;
    },
    AccessForbidden: function(token, service, subservice) {
        this.name = 'ACCESS_FORBIDDEN';
        this.message = 'The access to the CB was rejected for service [' +
            service + '] subservice [ ' + subservice + ' ] and token [' + token + ']';
    },
    AuthenticationError: function(trust) {
        this.name = 'AUTHENTICATION_ERROR';
        this.message = 'The trust configured for the device was rejected: [' + trust + ']';
    },
    BadConfiguration: function(msg) {
        this.name = 'BAD_CONFIGURATION';
        this.message = 'The application startup failed due to a bad configuration:' + msg;
    },
    TemplateLoadingError: function(error) {
        this.name = 'TEMPLATE_LOADING_ERROR';
        this.message = 'Some of the XML Templates could  not be found or loaded: ' + error.toString();
    },
    MissingHeaders: function(msg) {
        this.name = 'MISSING_HEADERS';
        this.message = 'Some headers were missing from the request: ' + msg;
        this.code = 400;
    },
    MismatchedService: function(service, subservice) {
        this.name = 'MISMATCHED_SERVICE';
        this.message = 'The declared service didn\'t match the stored one in the entity';
        this.code = 403;
    },
    WrongSyntax: function(msg) {
        this.name = 'WRONG_SYNTAX';
        this.message = 'Wrong syntax in request: ' + msg;
        this.code = 400;
    },
    CommandNotFound: function(name) {
        this.name = 'COMMAND_NOT_FOUND';
        this.message = 'Couldn\'t update the command because no command with the name [' + name + '] was found.';
        this.code = 400;
    },
    MissingConfigParams: function(missing) {
        this.name = 'MISSING_CONFIG_PARAMS';
        this.message = 'The following mandatory configuration parameters were missing: ' + JSON.stringify(missing);
        this.code = 400;
    },
    NotificationError: function(code) {
        this.name = 'NOTIFICATION_ERROR';
        this.message = 'Incoming notification with non-200 status code: ' + code;
        this.code = 400;
    },
    DeviceGroupNotFound: function(fields, values) {
        this.name = 'DEVICE_GROUP_NOT_FOUND';
        if (values && fields) {
            this.message = 'Couldn\t find device group for fields: ' + fields + ' and values: ' + values;
        } else {
            this.message = 'Couldn\t find device group';
        }
        this.code = 404;
    },
    GroupNotFound: function(service, subservice) {
        this.name = 'GROUP_NOT_FOUND';
        this.message = 'Group not found for service [' + service + '] and subservice [' + subservice + ']';
        this.code = 404;
    },
    WrongExpressionType: function(type) {
        this.name = 'WRONG_EXPRESSION_TYPE';
        this.message = 'Invalid type evaluating expression [' + type + ']';
        this.code = 400;
    },
    InvalidExpression: function(expression) {
        this.name = 'INVALID_EXPRESSION';
        this.message = 'Invalid expression in evaluation [' + expression + ']';
        this.code = 400;
    }
};
