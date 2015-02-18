/*
 * Copyright 2014 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of iotagent-lwm2m-lib
 *
 * iotagent-lwm2m-lib is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * iotagent-lwm2m-lib is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with iotagent-lwm2m-lib.
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
    EntityUpdateError: function(id, type) {
        this.name = 'ENTITY_UPDATE_ERROR';
        this.message = 'Error updating entity data for device: ' + id + ' of type: ' + type;
    },
    EntityNotFound: function(id) {
        this.name = 'ENTITY_NOT_FOUND';
        this.message = 'The entity with the requested id [' + id + '] was not found.';
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
    WrongSyntax: function(msg) {
        this.name = 'WRONG_SYNTAX';
        this.message = 'Wrong syntax in request: ' + msg;
        this.code = 400;
    },
    DeviceGroupNotFound: function(service, subservice) {
        this.name = 'DEVICE_GROUP_NOT_FOUND';
        if (subservice) {
            this.message = 'Couldn\t find device group for service [' + service + '] and subservice [' + subservice + ']';
        } else {
            this.message = 'Couldn\t find device group with id [' + service + ']';
        }
        this.code = 400;
    }

};
