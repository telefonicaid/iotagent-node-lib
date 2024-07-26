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
 *
 * Modified by: Daniel Calvo - ATOS Research & Innovation
 */

class RegistrationError {
    constructor(id, type) {
        this.name = 'REGISTRATION_ERROR';
        this.message = 'Error registering context provider for device: ' + id + ' of type: ' + type;
    }
}
class UnregistrationError {
    constructor(id, type) {
        this.name = 'UNREGISTRATION_ERROR';
        this.message = 'Error unregistering context provider for device: ' + id + ' of type: ' + type;
    }
}
class EntityGenericError {
    constructor(id, type, typeInformation, details, code) {
        this.name = 'ENTITY_GENERIC_ERROR';
        this.message =
            'Error accesing entity data for device: ' +
            id +
            ' of type: ' +
            type +
            ' and ' +
            JSON.stringify(typeInformation);
        this.details = details || {};
        this.code = code || 200;
    }
}
class EntityNotFound {
    constructor(id) {
        this.name = 'ENTITY_NOT_FOUND';
        this.message = 'The entity with the requested id [' + id + '] was not found.';
        this.code = 404;
    }
}
class RegistryNotAvailable {
    constructor() {
        this.name = 'REGISTRY_NOT_AVAILABLE';
        this.message = 'No device registry is available.';
    }
}
class InternalDbError {
    constructor(msg) {
        this.name = 'INTERNAL_DB_ERROR';
        this.message = 'An internal DB Error happened: ' + msg;
    }
}
class BadRequest {
    constructor(msg) {
        this.name = 'BAD_REQUEST';
        this.message = 'Request error connecting to the Context Broker: ' + msg;
        this.code = 400;
    }
}
class UnsupportedContentType {
    constructor(type) {
        this.name = 'UNSUPPORTED_CONTENT_TYPE';
        this.message = 'Unsupported content type in the context request: ' + type;
        this.code = 400;
    }
}
class TypeNotFound {
    constructor(id, type, typeInformation) {
        this.name = 'TYPE_NOT_FOUND';
        this.message =
            'Type : ' + type + ' not found for device with id: ' + id + ' with: ' + JSON.stringify(typeInformation);
        this.code = 500;
    }
}
class MissingAttributes {
    constructor(msg, device) {
        this.name = 'MISSING_ATTRIBUTES';
        this.message = 'The request was not well formed:' + msg + ' with: ' + JSON.stringify(device);
    }
}
class DeviceNotFound {
    constructor(id, typeInformation) {
        this.name = 'DEVICE_NOT_FOUND';
        this.message = 'No device was found with id:' + id + ' and ' + JSON.stringify(typeInformation);
        this.code = 404;
    }
}
class DuplicateDeviceId {
    constructor(device) {
        this.name = 'DUPLICATE_DEVICE_ID';
        this.message =
            'A device with the same info (DeviceId, ApiKey, Service, Subservice) was found:' +
            device.id +
            ' and ' +
            JSON.stringify(device);
        this.code = 409;
    }
}
class DuplicateGroup {
    constructor(group) {
        this.name = 'DUPLICATE_GROUP';
        this.message =
            'A device configuration already exists for resource ' +
            group.resource +
            ' and API Key ' +
            group.apikey +
            ' and ' +
            JSON.stringify(group);
        this.code = 409;
    }
}
class SecurityInformationMissing {
    constructor(type) {
        this.name = 'SECURITY_INFORMATION_MISSING';
        this.message = 'Some security information was missing for device type:' + type;
    }
}
class TokenRetrievalError {
    constructor(trust, msg) {
        this.name = 'TOKEN_RETRIEVAL_ERROR';
        this.message = 'An error occurred trying to retrieve a token with trust [' + trust + ']: ' + msg;
    }
}
class AccessForbidden {
    constructor(token, service, subservice) {
        this.name = 'ACCESS_FORBIDDEN';
        this.message =
            'The access to the CB was rejected for service [' +
            service +
            '] subservice [ ' +
            subservice +
            ' ] and token [' +
            token +
            ']';
    }
}
class AuthenticationError {
    constructor(trust) {
        this.name = 'AUTHENTICATION_ERROR';
        this.message = 'The trust configured for the device was rejected: [' + trust + ']';
    }
}
class BadConfiguration {
    constructor(msg) {
        this.name = 'BAD_CONFIGURATION';
        this.message = 'The application startup failed due to a bad configuration:' + msg;
    }
}
class MissingHeaders {
    constructor(msg) {
        this.name = 'MISSING_HEADERS';
        this.message = 'Some headers were missing from the request: ' + msg;
        this.code = 400;
    }
}
class MismatchedService {
    /* eslint-disable-next-line no-unused-vars */
    constructor(service, subservice) {
        this.name = 'MISMATCHED_SERVICE';
        this.message = "The declared service didn't match the stored one in the entity";
        this.code = 403;
    }
}
class WrongSyntax {
    constructor(msg) {
        this.name = 'WRONG_SYNTAX';
        this.message = 'Wrong syntax in request: ' + msg;
        this.code = 400;
    }
}
class CommandNotFound {
    constructor(name, typeInformation) {
        this.name = 'COMMAND_NOT_FOUND';
        this.message =
            "Couldn't update the command because no command with the name [" +
            name +
            '] was found with ' +
            JSON.stringify(typeInformation);
        this.code = 400;
    }
}
class MissingConfigParams {
    constructor(missing) {
        this.name = 'MISSING_CONFIG_PARAMS';
        this.message = 'The following mandatory configuration parameters were missing: ' + JSON.stringify(missing);
        this.code = 400;
    }
}
class DeviceGroupNotFound {
    constructor(fields, values) {
        this.name = 'DEVICE_GROUP_NOT_FOUND';
        if (values && fields) {
            this.message =
                'Couldn\t find device group for fields: ' +
                JSON.stringify(fields) +
                ' and values: ' +
                JSON.stringify(values);
        } else if (fields) {
            this.message = 'Couldn\t find device group for fields: ' + JSON.stringify(fields);
        } else {
            this.message = 'Couldn\t find device group';
        }
        this.code = 404;
    }
}
class GroupNotFound {
    constructor(service, subservice, type) {
        this.name = 'GROUP_NOT_FOUND';
        this.message =
            'Group not found for service [' + service + '] subservice [' + subservice + '] and type [' + type + ']';
        this.code = 404;
    }
}
class WrongExpressionType {
    constructor(type) {
        this.name = 'WRONG_EXPRESSION_TYPE';
        this.message = 'Invalid type evaluating expression [' + type + ']';
        this.code = 400;
    }
}
class InvalidExpression {
    constructor(expression) {
        this.name = 'INVALID_EXPRESSION';
        this.message = 'Invalid expression in evaluation [' + expression + ']';
        this.code = 400;
    }
}
class BadAnswer {
    constructor(statusCode, operation) {
        this.name = 'BAD_ANSWER';
        this.message = 'Invalid statusCode in operation [' + operation + ']';
        this.code = 400;
    }
}
class BadTimestamp {
    constructor(payload, entityName, typeInformation) {
        this.name = 'BAD_TIMESTAMP';
        this.message =
            'Invalid ISO8601 timestamp [' +
            payload +
            '] in [' +
            entityName +
            '] with: ' +
            JSON.stringify(typeInformation);
        this.code = 400;
    }
}
class BadGeocoordinates {
    constructor(payload, device) {
        this.name = 'BAD_GEOCOORDINATES';
        this.message = 'Invalid rfc7946 coordinates [' + payload + '] in ' + JSON.stringify(device);
        this.code = 400;
    }
}
class MethodNotSupported {
    constructor(method, path) {
        this.name = 'METHOD_NOT_IMPLEMENTED';
        this.message = 'IoT Agents do not support the endpoint: ' + method + ' ' + path;
        this.code = 501;
    }
}

module.exports = {
    RegistrationError,
    UnregistrationError,
    EntityGenericError,
    EntityNotFound,
    RegistryNotAvailable,
    InternalDbError,
    BadRequest,
    UnsupportedContentType,
    TypeNotFound,
    MissingAttributes,
    DeviceNotFound,
    DuplicateDeviceId,
    DuplicateGroup,
    SecurityInformationMissing,
    TokenRetrievalError,
    AccessForbidden,
    AuthenticationError,
    BadConfiguration,
    MissingHeaders,
    MismatchedService,
    WrongSyntax,
    CommandNotFound,
    MissingConfigParams,
    DeviceGroupNotFound,
    GroupNotFound,
    WrongExpressionType,
    InvalidExpression,
    BadAnswer,
    BadTimestamp,
    BadGeocoordinates,
    MethodNotSupported
};
