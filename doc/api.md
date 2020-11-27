# IoT Agent API

The **IoT Agent node library** offers a simple REST API which provides common functionality to access, provision and
decommission devices.

## About API

A GET request to the `/iot/about` path, will return a payload similar to the following:

```json
{
    "libVersion": "2.7.0",
    "port": "4041",
    "baseRoot": "/",
    "version": "1.7.0"
}
```

the `version` field will be read from the `iotaVersion` field of the config, if it exists. It can be used as a heartbeat
operation to check the health of the IoT Agent if required.

## Service Group API

For some services, there will be no need to provision individual devices, but it will make more sense to provision
different service groups, each of one mapped to a different type of entity in the context broker. How the type of entity
is assigned to a device will depend on the Southbound technology (e.g.: path, port, APIKey...). Once the device has an
assigned type, its configuration values can be extracted from those of the type.

The IoT Agents provide two means to define those service groups:

-   Static **Type Configuration**: configuring the `ngsi.types` attribute within the `config.js` file.
-   Dynamic **Configuration API**: making use of the API URLs in the configuration URI, `/iot/services`. Please, note
    that the configuration API manage servers under a URL that requires the `server.name` parameter to be set (the name
    of the IoT Agent we are using). If no name is configured `default` is taken as the default one.

Both approaches provide the same configuration information for the types and end up in the same configuration
collection, they are described in the sections below.

The following sections show the available operations for the Configuration API. Every operation in the API require the
`fiware-service` and `fiware-servicepath` to be defined; the operations are performed in the scope of those headers. For
the list case, the special wildcard servicepath can be specified, `/*`. In this case, the operation applies to all the
subservices of the service given by the `fiware-service` header.

For every service group, the pair (resource, apikey) _must_ be unique (as it is used to identify which group to assign
to which device). Those operations of the API targeting specific resources will need the use of the `resource` and
`apikey` parameters to select the appropriate instance.

Note that there is a 1:1 correspondence between payload fields and DB fields (but with some changes in the attribute
naming; e.g.: subservice -> service_path).

### Type Configuration

The IoT Agent can be configured to expect certain kinds of devices, with preconfigured sets of attributes, service
information, security information and other attributes. The `types` attribute of the configuration is a map, where the
key is the type name and the value is an object containing all the type information. Each type can has the following
information configured:

-   **service**: service of the devices of this type.
-   **subservice**: subservice of the devices of this type.
-   **attributes**: list of active attributes of the device. For each attribute, its `name` and `type` must be provided,
    additional `metadata` is optional.
-   **lazy**: list of lazy attributes of the device. For each attribute, its `name` and `type` must be provided.
-   **commands**: list of commands attributes of the device. For each attribute, its `name` and `type` must be provided.
-   **internalAttributes**: optional section with free format, to allow specific IoT Agents to store information along
    with the devices in the Device Registry.
-   **staticAttributes**: this array of attributes will be added to every entity of this type 'as is'. `name` and `type`
    must be provided, additional `metadata` is optional.
-   **trust**: trust token to use for secured access to the Context Broker for this type of devices (optional; only
    needed for secured scenarios). Trust tokens may be called `access_tokens` by some Oauth2 providers.
-   **cbHost**: Context Broker host URL. This option can be used to override the global CB configuration for specific
    types of devices.

### Service Group Model

The table below shows the information held in the service group provisioning resource. The table also contains the
correspondence between the API resource fields and the same fields in the database model.

| Payload Field         | DB Field             | Definition                                                                                                                                                                                                                                                                |
| --------------------- | -------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `service`             | `service`            | Service of the devices of this type                                                                                                                                                                                                                                       |
| `subservice`          | `subservice`         | Subservice of the devices of this type.                                                                                                                                                                                                                                   |
| `resource`            | `resource`           | string representing the Southbound resource that will be used to assign a type to a device (e.g.: pathname in the southbound port).                                                                                                                                       |
| `apikey`              | `apikey`             | API Key string.                                                                                                                                                                                                                                                           |
| `timestamp`           | `timestamp`          | Optional flag about whether or not to add the `TimeInstant` attribute to the device entity created, as well as a `TimeInstant` metadata to each attribute, with the current timestamp. With NGSI-LD, the Standard `observedAt` property-of-a-property is created instead. | true |
| `entity_type`         | `entity_type`        | name of the Entity `type` to assign to the group.                                                                                                                                                                                                                         |
| `trust`               | `trust`              | trust token to use for secured access to the Context Broker for this type of devices (optional; only needed for secured scenarios).                                                                                                                                       |
| `cbHost`              | `cbHost`             | Context Broker connection information. This options can be used to override the global ones for specific types of devices.                                                                                                                                                |
| `lazy`                | `lazy`               | list of common lazy attributes of the device. For each attribute, its `name` and `type` must be provided.                                                                                                                                                                 |
| `commands`            | `commands`           | list of common commands attributes of the device. For each attribute, its `name` and `type` must be provided, additional `metadata` is optional.                                                                                                                          |
| `attributes`          | `attributes`         | list of common active attributes of the device. For each attribute, its `name` and `type` must be provided, additional `metadata` is optional.                                                                                                                            |
| `static_attributes`   | `staticAttributes`   | this attributes will be added to all the entities of this group 'as is', additional `metadata` is optional.                                                                                                                                                               |
| `internal_attributes` | `internalAttributes` | optional section with free format, to allow specific IoT Agents to store information along with the devices in the Device Registry.                                                                                                                                       |
| `expressionLanguage`  | `expresionLanguage`  | optional boolean value, to set expression language used to compute expressions, possible values are: legacy or jexl. When not set or wrongly set, `legacy` is used as default value.                                                                                      |
| `explicitAttrs`       | `explicitAttrs`      | optional boolean value, to support selective ignore of measures so that IOTA doesn’t progress. If not specified default is `false`.                                                                                                                                       |
| `ngsiVersion`         | `ngsiVersion`        | optional string value used in mixed mode to switch between **NGSI-v2** and **NGSI-LD** payloads. The default is `v2`.

### Service Group Endpoint

The following actions are available under the service group endpoint:

##### POST /iot/services

Creates a set of service groups for the given service and service path. The service and subservice information will
taken from the headers, overwritting any preexisting values.

Body params:

-   `services`: list of service groups to create. Each one adheres to the service group Model.

E.g.:

```json
{
    "services": [
        {
            "resource": "/deviceTest",
            "apikey": "801230BJKL23Y9090DSFL123HJK09H324HV8732",
            "type": "Light",
            "trust": "8970A9078A803H3BL98PINEQRW8342HBAMS",
            "cbHost": "http://orion:1026",
            "commands": [{ "name": "wheel1", "type": "Wheel" }],
            "attributes": [
                {
                    "name": "luminescence",
                    "type": "Integer",
                    "metadata": {
                        "unitCode": { "type": "Text", "value": "CAL" }
                    }
                }
            ],
            "lazy": [{ "name": "status", "type": "Boolean" }]
        }
    ]
}
```

Returns:

-   200 OK if successful, with no payload.
-   400 MISSING_HEADERS if any of the mandatory headers is not present.
-   400 WRONG_SYNTAX if the body doesn't comply with the schema.
-   500 SERVER ERROR if there was any error not contemplated above.

##### GET /iot/services

Retrieves service groups from the database. If the servicepath header has the wildcard expression, `/*`, all the
subservices for the service are returned. The specific subservice parameters are returned in any other case.

Returns:

-   200 OK if successful, returning a service group body.
-   400 MISSING_HEADERS if any of the mandatory headers is not present.
-   500 SERVER ERROR if there was any error not contemplated above.

##### PUT /iot/services

Modifies the information for a service group configuration, identified by the `resource` and `apikey` query parameters.
Takes a service group body as the payload. The body does not have to be complete: for incomplete bodies, just the
existing attributes will be updated

E.g.:

```json
{
    "trust": "8970A9078A803H3BL98PINEQRW8342HBAMS",
    "cbHost": "http://orion:1026"
}
```

Returns:

-   200 OK if successful, returning the updated body.
-   400 MISSING_HEADERS if any of the mandatory headers is not present.
-   500 SERVER ERROR if there was any error not contemplated above.

##### DELETE /iot/services

Removes a service group configuration from the DB, specified by the `resource` and `apikey` query parameters.

Returns:

-   200 OK if successful.
-   400 MISSING_HEADERS if any of the mandatory headers is not present.
-   500 SERVER ERROR if there was any error not contemplated above.

## Device API

The IoT Agents offer a provisioning API where devices can be preregistered, so all the information about service and
subservice mapping, security information and attribute configuration can be specified in a per device way instead of
relaying on the type configuration. The following section specifies the format of the device payload; this will be the
payload accepted by all the write operations and that will be returned by all the read operations. Take care of the
exception of the POST operation: in this case, the device objects must be specified as an array, as multiple devices can
be provided simultaneusly for the same service.

Two parameters in this payload are given a special treatment: service and subservice. This two parameters are needed to
fill the `fiware-service` and `fiware-servicepath` mandatory headers that will be used in the interactions with the
Context Broker. This parameters should not be passed along with the rest of the body, but they will be taken from the
same headers, as received by the Device Provisioning API (this two headers are, thus, mandatory both for incoming and
outgoing requests).

Note that there is a 1:1 correspondence between payload fields and DB fields (but using a different capitalization, e.g.
`service_path` vs. `servicePath`).

### Device model

The table below shows the information held in the Device resource. The table also contains the correspondence between
the API resource fields and the same fields in the database model.

| Payload Field         | DB Field             | Definition                                                                                                                                                                                                                                                                | Example of value                              |
| --------------------- | -------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------- |
| `device_id`           | `id`                 | Device ID that will be used to identify the device.                                                                                                                                                                                                                       | UO834IO                                       |
| `service`             | `service`            | Name of the service the device belongs to (will be used in the fiware-service header).                                                                                                                                                                                    | smartGondor                                   |
| `service_path`        | `subservice`         | Name of the subservice the device belongs to (used in the fiware-servicepath header).                                                                                                                                                                                     | /gardens                                      |
| `entity_name`         | `name`               | Name of the entity representing the device in the Context Broker                                                                                                                                                                                                          | ParkLamplight12                               |
| `entity_type`         | `type`               | Type of the entity in the Context Broker                                                                                                                                                                                                                                  | Lamplights                                    |
| `timezone`            | `timezone`           | Time zone of the sensor if it has any                                                                                                                                                                                                                                     | America/Santiago                              |
| `timestamp`           | `timestamp`          | Optional flag about whether or not to add the `TimeInstant` attribute to the device entity created, as well as a `TimeInstant` metadata to each attribute, with the current timestamp. With NGSI-LD, the Standard `observedAt` property-of-a-property is created instead. | true                                          |
| `apikey`              | `apikey`             | Optional Apikey key string to use instead of group apikey                                                                                                                                                                                                                 | 9n4hb1vpwbjozzmw9f0flf9c2                     |
| `endpoint`            | `endpoint`           | Endpoint where the device is going to receive commands, if any.                                                                                                                                                                                                           | http://theDeviceUrl:1234/commands             |
| `protocol`            | `protocol`           | Name of the device protocol, for its use with an IoT Manager.                                                                                                                                                                                                             | IoTA-UL                                       |
| `transport`           | `transport`          | Name of the device transport protocol, for the IoT Agents with multiple transport protocols.                                                                                                                                                                              | MQTT                                          |
| `attributes`          | `active`             | List of active attributes of the device                                                                                                                                                                                                                                   | `[ { "name": "attr_name", "type": "Text" } ]` |
| `lazy`                | `lazy`               | List of lazy attributes of the device                                                                                                                                                                                                                                     | `[ { "name": "attr_name", "type": "Text" } ]` |
| `commands`            | `commands`           | List of commands of the device                                                                                                                                                                                                                                            | `[ { "name": "attr_name", "type": "Text" } ]` |
| `internal_attributes` | `internalAttributes` | List of internal attributes with free format for specific IoT Agent configuration                                                                                                                                                                                         | LWM2M mappings from object URIs to attributes |
| `static_attributes`   | `staticAttributes`   | List of static attributes to append to the entity. All the updateContext requests to the CB will have this set of attributes appended.                                                                                                                                    | `[ { "name": "attr_name", "type": "Text" } ]` |
| `expressionLanguage`  | `expresionLanguage`  | optional boolean value, to set expression language used to compute expressions, possible values are: legacy or jexl. When not set or wrongly set, legacy is used as default value.                                                                                        |

| `explicitAttrs`       | `explicitAttrs`      | Boolean value to support selective ignore of measures for device so that IOTA doesn’t progress. If not specified default is `false`.                                                                                                                                      | `true/false`                                  |
| `ngsiVersion`         | `ngsiVersion`        | optional string value used in mixed mode to switch between **NGSI-v2** and **NGSI-LD**payloads. The default is `v2`.                                                                                                                                                      | `v2/ld/mixed`                                       |

#### Attribute lists

In the device model there are three list of attributes that can be declared: attributes, lazy and commands. All of them
have the same syntax, an object containing the following attributes:

-   **object_id** (optional): name of the attribute as coming from the device.
-   **name** (mandatory): ID of the attribute in the target entity in the Context Broker.
-   **type** (mandatory): name of the type of the attribute in the target entity.
-   **metadata** (optional): additional static metadata for the attribute in the target entity. (e.g. `unitCode`)

Some transformation plugins also allow the use of the following optional attributes:

-   **expression**: indicates that the value of the target attribute will not be the plain value or the measurement, but
    an expression based on a combination of the reported values. See the
    [Expression Language definition](expressionLanguage.md) for details
-   **entity_name**: the presence of this attribute indicates that the value will not be stored in the original device
    entity but in a new entity with an ID given by this attribute. The type of this additional entity can be configured
    with the `entity_type` attribute. If no type is configured, the device entity type is used instead. Entity names can
    be defined as expressions, using the [Expression Language definition](expressionLanguage.md).
-   **entity_type**: configures the type of an alternative entity.
-   **reverse**: add bidirectionality expressions to the attribute. See the **bidirectionality** transformation plugin
    in the [Data Mapping Plugins section](#data-mapping-plugins) for details.

See the transformation plugins Section for more details.

#### Advice on Attribute defintions

##### Reuse of attribute names

Check for the existence of the same Attribute on any of the other models and reuse it, if pertinent. Have a look at
schema.org trying to find a similar term with the same semantics. Try to find common used ontologies or existing
standards well accepted by the Community, or by goverments, agencies, etc. For instance, Open311 for civic issue
tracking or Datex II for transport systems.

##### Reuse of attribute types

When possible reuse [schema.org](http://schema.org/) data types (`Text`, `Number`, `DateTime`, `StructuredValue`, etc.).
Remember that `null` is not allowed in NGSI-LD and therefore should be avoided as a value.

##### How to specify attribute Units of Measurement

If your data use the default unit defined in the Data Model, you don't need to specify any. It is implied. Unless
explicitly stated otherwise, all FIWARE data models use the metric system of measurements by default. Regardless the
model specification include explicit reference to the scale adopted. If your data use a different unit, you will need to
use the `unitCode` metadata annotation in your data (and you will need to adopt the normalised representation). The code
used should be taken from those defined by
[UN/CEFACT](https://www.unece.org/fileadmin/DAM/cefact/recommendations/rec20/rec20_rev3_Annex3e.pdf). E.g.:

```json
{
    "object_id": "l",
    "name": "length",
    "type": "Integer",
    "metadata": {
        "unitCode": { "type": "Text", "value": "FOT" }
    }
}
```

#### API Actions

##### POST /iot/devices

Provision a new device in the IoT Agent's device registry. Takes a Device in JSON format as the payload.

Returns:

-   200 OK if successful.
-   500 SERVER ERROR if there was any error not contemplated above.

Payload example:

```json
{
    "devices": [
        {
            "device_id": "DevID1",
            "entity_name": "urn:ngsi-ld:Device:TheDevice1",
            "entity_type": "Device",
            "attributes": [
                { "object_id": "t", "name": "temperature", "type": "Float" },
                { "object_id": "h", "name": "humidity", "type": "Float" }
            ],
            "lazy": [
                {
                    "object_id": "l",
                    "name": "percentage",
                    "type": "Integer",
                    "metadata": {
                        "unitCode": { "type": "Text", "value": "P1" }
                    }
                }
            ],
            "commands": [{ "object_id": "t", "name": "turn", "type": "Text" }],
            "static_attributes": [{ "name": "serialID", "value": "02598347", "type": "Text" }]
        }
    ]
}
```

##### GET /iot/devices

Returns a list of all the devices in the device registry with all its data.

Query parameters:

-   limit: if present, limits the number of devices returned in the list.
-   offset: if present, skip that number of devices from the original query.

Returns:

-   200 OK if successful, and the selected Device payload in JSON format.
-   404 NOT FOUND if the device was not found in the database.
-   500 SERVER ERROR if there was any error not contemplated above.

Example of return payload:

```json
{
    "count": 2,
    "devices": [
        {
            "device_id": "DevID0",
            "service": "ServiceTest",
            "service_path": "/testSubservice",
            "entity_name": "urn:ngsi-ld:Device:TheDevice0",
            "entity_type": "Device",
            "attributes": [
                { "object_id": "t", "name": "temperature", "type": "Float" },
                { "object_id": "h", "name": "humidity", "type": "Float" }
            ],
            "lazy": [],
            "static_attributes": [],
            "internal_attributes": []
        },
        {
            "device_id": "DevID1",
            "service": "ServiceTest",
            "service_path": "/testSubservice",
            "entity_name": "urn:ngsi-ld:Device:TheDevice1",
            "entity_type": "Device",
            "attributes": [
                { "object_id": "t", "name": "temperature", "type": "Float" },
                {
                    "object_id": "l",
                    "name": "percentage",
                    "type": "Integer",
                    "metadata": {
                        "unitCode": { "type": "Text", "value": "P1" }
                    }
                }
            ],
            "lazy": [{ "object_id": "h", "name": "humidity", "type": "Float" }],
            "static_attributes": [{ "name": "serialID", "value": "02598347", "type": "Text" }],
            "internal_attributes": []
        }
    ]
}
```

##### GET /iot/devices/:deviceId

Returns all the information about a particular device.

Returns:

-   200 OK if successful, and the selected Device payload in JSON format.
-   404 NOT FOUND if the device was not found in the database.
-   500 SERVER ERROR if there was any error not contemplated above.

Example of return payload:

```json
{
    "device_id": "DevID1",
    "service": "ServiceTest",
    "service_path": "/testSubservice",
    "entity_name": "urn:ngsi-ld:Device:0001",
    "entity_type": "Device",
    "attributes": [
        { "object_id": "t", "name": "temperature", "type": "Float" },
        {
            "type": "Integer",
            "name": "percentage",
            "metadata": {
                "unitCode": { "type": "Text", "value": "P1" }
            },
            "object_id": "l"
        }
    ],
    "lazy": [{ "object_id": "h", "name": "humidity", "type": "Float" }],
    "static_attributes": [{ "name": "serialID", "value": "02598347", "type": "Text" }],
    "internal_attributes": []
}
```

##### DELETE /iot/devices/:deviceId

Remove a device from the device registry. No payload is required or received.

Returns:

-   200 OK if successful, with no payload.
-   404 NOT FOUND if the device was not found in the database.
-   500 SERVER ERROR if there was any error not contemplated above.

##### PUT /iot/devices/:deviceId

Changes the stored values for the device with the provided Device payload. Neither the name, the type nor the ID of the
device can be changed using this method (as they are used to link the already created entities in the CB to the
information in the device). Service and servicepath, being taken from the headers, can't be changed also.

Returns:

-   200 OK if successful, with no payload.
-   404 NOT FOUND if the device was not found in the database.
-   500 SERVER ERROR if there was any error not contemplated above.

Payload example:

```json
{
    "attributes": [
        { "object_id": "t", "name": "temperature", "type": "Float" },
        { "object_id": "h", "name": "humidity", "type": "Float" },
        { "object_id": "p", "name": "pressure", "type": "Float" }
    ],
    "lazy": [{ "object_id": "l", "name": "luminosity", "type": "percentage" }],
    "commands": [{ "object_id": "t", "name": "turn", "type": "Text" }],
    "static_attributes": [{ "name": "serialID", "type": "02598347" }]
}
```

## Log API

The IoT Agent Library makes use of the [Logops logging library](https://github.com/telefonicaid/logops). This library is
required in a `logger` object, shared between all of the modules. In order for the logging to be consistent across the
different modules of an IoTAgent (i.e.: the ones provided by the IoTA Library as well as those created for the
particular IoTAgent), the `logger` object is exported in the `logModule` property of the library. The agents should use
this module for logging.

The IoT Agent Library also provides a configuration API that lets the administrator change and manage the log level in
realtime. This API has the following two actions:

##### PUT /admin/log

This operation gets the new log level using the query parameter `level`. If the new level is a valid level for Logops
(i.e.: one of the items in the array ['INFO', 'ERROR', 'FATAL', 'DEBUG', 'WARNING']), it will be automatically changed
for future logs.

##### PUT /admin/log

Returns the current log level, in a json payload with a single attribute `level`.
