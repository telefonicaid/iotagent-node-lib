FORMAT: 1A

# IoT Agent Provision API Documentacion
The IoT Agent Provision API is based on REST principles. This documentation covers the resources you can manipulate on IoT Agent in order to publish custom information in IoT Platform.

**Allowed HTTPs requests:**

- POST: Creates a resource or list of resources.
- PUT: Updates a resource.
- GET: Retrieves a resource or list of resources.
- DELETE: Delete a resource.

**Typical Server Responses:**

- 200 OK: The request was succesful (some API calls may return 201 instead).
- 201 Created: The request was succesful and a resource or list of resources was created.
- 204 No Content: The request was succesful but there is no representation to return (that is, the response is empty).
- 400 Bad Request: The request could not be understood or was missing required parameters.
- 401 Unauthorized: Authentication failed.
- 403 Forbidden: Access denied.
- 404 Not Found: Resource was not found.
- 409 Conflict: A resource cannot be created because it already exists.
- 500 Internal Server Error: Generic error when server has a malfunction. This error will be removed.

Responses related with authentication and authorization depends on this feature is configured and a Keystone OpenStack sytem is present.

When an error is returned, a representation is returned as:

```
{
  "reason": "contains why an error is returned",
  "details": "contains specific information about the error, if possible"
}
```

## Authentication and Authorization
If IoT Agent is in authenticated environment, this API requires a token, which you obtain from authentication system. This system and its API is out of scope of present documentation. In this environment, a mandatory header is needed: `X-Auth-Token`.

## Mandatory HTTP Headers
Anyway, this API needs two headers in order to manage requests:
- `Fiware-Service` : Represents a tenant, the higher level in resources hierachy in IoT Platform environment. If this header is not present an error is returned.
- `Fiware-ServicePath` : Represents the second level. Its value must be start by character '/'. If this header is not present we assume '/'. There are operations that is allowed '/*'.

## Naming conventions
- `Fiware-Service`: a service string must not be longer than 50 characters and may only contain underscores and alphanumeric characters and lowercases.
- `Fiware-ServicePath`: a service path string must only contain underscores and alphanumeric characters and starts with character /. Maximum length is 51 characters (with /).

## API Access
All URIs are relative to an specific url, where IoT Agent is raised. For example, `http://127.0.0.1:8080/iot/`.

## Services [/services{?limit,offset,resource,apikey,device}]
Services are the higher level in IoT Platform. When you manipulate a service, you use a Fiware-Service header with its name. Parameters apply to different operations.

### Service Model
Fields in JSON object representing a service are:
- `apikey`. It is a key used for devices belonging to this service. If "", service does not use apikey, but it must be specified.
- `token`. If authentication/authorization system is configured, IoT Agent works as user when it publishes information. That token allows that other components to verify the identity of IoT Agent. Depends on authentication and authorization system.
- `cbroker`. Context Broker endpoint assigned to this service, it must be a real uri.
- `outgoing_route`. It is an identifier for VPN/GRE tunnel. It is used when device is into a VPN and a command is sent.
- `resource`. Path in IoTAgent. When protocol is HTTP a device could send information to this uri. In general, it is a uri in a HTTP server needed to load and execute a module.
- `entity_type`. Entity type used in entity publication (overload default).
- `attributes`. Mapping for protocol parameters to entity attributes.
`object_id` (string, mandatory): protocol parameter to be mapped.
`name` (string, mandatory): attribute name to publish.
`type`: (string, mandatory): attribute type to publish.
- `static_attributes`. Attributes published as defined.
`name` (string, mandatory): attribute name to publish.
`type` (string, mandatory): attribute type to publish.
`value` (string, mandatory): attribute value to publish.

`static_attributes` and `attributes` are used if device has not this information.

Mandatory fields are identified in every operation.

### Retrieve a service [GET]

With Fiware-ServicePath you can retrieve a subservice or all subservices.

+ Parameters [limit, offset, resource]

    + `limit` (optional, number). In order to specify the maximum number of services (default is 20, maximun allowed is 1000).

    + `offset` (optional, number). In order to skip a given number of elements at the beginning (default is 0) .

    + `resource` (optional, string). URI for the iotagent, return only services for this iotagent.

+ Request (application/json)

    + Headers

            Fiware-Service: testservice
            Fiware-ServicePath: /*

+ Response 200

    + Body

            {
              "count": 1,
              "services": [
                {
                    "apikey": "apikey3",
                    "service": "service2",
                    "service_path": "/srvpath2",
                    "token": "token2",
                    "cbroker": "http://127.0.0.1:1026",
                    "entity_type": "thing",
                    "resource": "/iot/d"
                }
              ]
            }

+ Request (application/json)

    + Headers

            Fiware-Service: testservice
            Fiware-ServicePath: /TestSubservice

+ Response 200

    + Body

            {
              "count": 1,
              "services": [
                {
                    "apikey": "apikey3",
                    "service": "service2",
                    "service_path": "/srvpath2",
                    "token": "token2",
                    "cbroker": "http://127.0.0.1:1026",
                    "entity_type": "thing",
                    "resource": "/iot/d"
                }
              ]
            }


### Create a service [POST]
With one subservice defined in Fiware-ServicePath header. From service model, mandatory fields are: apikey, resource (cbroker field is temporary mandatory).

+ Request (application/json)

    + Headers

            Fiware-Service: testservice
            Fiware-ServicePath: /TestSubservice

    + Body

            {
              "services": [
                {
                  "apikey": "apikey3",
                  "token": "token2",
                  "cbroker": "http://127.0.0.1:1026",
                  "entity_type": "thing",
                  "resource": "/iot/d"
                }
               ]
             }

+ Response 201


### Update a service/subservice [PUT]
If you want modify only a field, you can do it. You cannot modify an element into an array field, but whole array. ("/*" is not allowed).

+ Parameters [apikey, resource]

    + `apikey` (optional, string). If you don't specify, apikey="" is applied.

    + `resource` (mandatory, string). URI for service into iotagent.

+ Request (application/json)

    + Headers

            Fiware-Service: testservice
            Fiware-ServicePath: /TestSubservice

    + Body

            {
               "entity_type": "entity_type"
            }

+ Response 204

### Remove a subservice/service [DELETE]
You remove a subservice into a service. If Fiware-ServicePath is '/*' or '/#' remove service and all subservices.

+ Parameters [apikey, resource, device]

    + `apikey` (optional, string). If you don't specify, apikey="" is applied.

    + `resource` (mandatory, string). URI for service into iotagent.

    + `device` (optional, boolean). Default value is false. Remove devices in service/subservice. This parameter is not valid when Fiware-ServicePath is '/*' or '/#'.

+ Request (application/json)

    + Headers

            Fiware-Service: testservice
            Fiware-ServicePath: /TestSubservice

+ Response 204


## Devices [/devices{?limit,offset,detailed,protocol,entity}]
A device is a resource that publish information to IoT Platform and it uses the IoT Agent.
### Device Model
- `device_id`. Unique identifier into a service.
- `protocol`. Protocol assigned to device. This field is easily provided by IoTA Manager if it is used. Every module implmenting a protocol has an identifier.
- `entity_name`. Entity name used for entity publication (overload default)
- `entity_type`. Entity type used for entity publication (overload entity_type defined in service).
- `timezone`. Not used in this version.
- `attributes`. Mapping for protocol parameters to entity attributes.
`object_id` (string, mandatory): protocol parameter to be mapped.
`name` (string, mandatory): attribute name to publish.
`type`: (string, mandatory): attribute type to publish.
- `static_attributes` (optional, array). Attributes published as defined.
`name` (string, mandatory): attribute name to publish.
`type` (string, mandatory): attribute type to publish.
`value` (string, mandatory): attribute value to publish.
- `endpoint` (optional, string): when a device uses push commands.
- `commands` (optional, array). Attributes working as commands.
`name` (string, mandatory): command identifier.
`type` (string, mandatory). It must be 'command'.
`value` (string, mandatory): command representation depends on protocol.

Mandatory fields are identified in every operation.

### Retrieve all devices [GET]

+ Parameters [limit, offset, detailed, entity, protocol]


    + `limit` (optional, number). In order to specify the maximum number of devices (default is 20, maximun allowed is 1000).

    + `offset` (optional, number). In order to skip a given number of elements at the beginning (default is 0) .

    + `detailed` (optional, string). `on` return all device information, `off` (default) return only name.

    + `entity` (optional, string). It allows get a device from entity name.

    + `protocol` (optional, string). It allows get devices with this protocol.

+ Request (application/json)

    + Headers

            Fiware-Service: testService
            Fiware-ServicePath: /TestSubservice

+ Response 200

    + Body

           {
              "count": 1,
              "devices": [
                {
                  "device_id": "device_id",
                  "protocol": "12345",
                  "entity_name": "entity_name",
                  "entity_type": "entity_type",
                  "timezone": "America/Santiago",
                  "attributes": [
                    {
                      "object_id": "source_data",
                      "name": "attr_name",
                      "type": "int"
                    }
                  ],
                  "static_attributes": [
                    {
                      "name": "att_name",
                      "type": "string",
                      "value": "value"
                    }
                  ]
                }
              ]
            }

### Create a device [POST]
From device model, mandatory fields are: device_id and protocol.

+ Request (application/json)

    + Headers

            Fiware-Service: testservice
            Fiware-ServicePath: /TestSubservice

    + Body

           {
                "devices": [
                {
                  "device_id": "device_id",
                  "protocol": "12345",
                  "entity_name": "entity_name",
                  "entity_type": "entity_type",
                  "timezone": "America/Santiago",
                  "attributes": [
                    {
                      "object_id": "source_data",
                      "name": "attr_name",
                      "type": "int"
                    }
                  ],
                  "static_attributes": [
                    {
                      "name": "att_name",
                      "type": "string",
                      "value": "value"
                    }
                  ]
                }
                ]
            }



+ Response 201

    + Headers (only if ONE device is in request)

            Location: /iot/devices/device_id

+ Response 400

            {
                "reason": "parameter limit must be an integer"
            }

+ Response 404


## Device [/devices/{device_id}]

### Retrieve a device [GET]

+ Request (application/json)

    + Headers

            Fiware-Service: testservice
            Fiware-ServicePath: /TestSubservice

+ Response 200

    + Body

            {
              "device_id": "device_id",
              "protocol": "121345",
              "entity_name": "entity_name",
              "entity_type": "entity_type",
              "timezone": "America/Santiago",
              "attributes": [
                {
                  "object_id": "source_data",
                  "name": "attr_name",
                  "type": "int"
                }
              ],
              "static_attributes": [
                {
                  "name": "att_name",
                  "type": "string",
                  "value": "value"
                }
              ]
            }

### Update a device [PUT]
If you want modify only a field, you can do it, except field `protocol` (this field, if provided it is removed from request).

+ Request (application/json)

    + Headers

            Fiware-Service: testservice
            Fiware-ServicePath: /TestSubservice

    + Body

            {
               "entity_name": "entity_name"
            }


+ Response 204

### Remove a device [DELETE]
If specific device is not found, we work as deleted.
+ Request (application/json)

    + Headers

            Fiware-Service: testservice
            Fiware-ServicePath: /TestSubservice

+ Response 204





