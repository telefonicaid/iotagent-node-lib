# FIWARE IoT Agent Framework

[![License badge](https://img.shields.io/badge/license-AGPL-blue.svg)](https://opensource.org/licenses/AGPL-3.0)
[![Support badge]( https://img.shields.io/badge/support-sof-yellowgreen.svg)](http://stackoverflow.com/questions/tagged/fiware)

## Index

* [Overview](#overview)
* [Build & Install](#buildinstall)
* [API Overview](#apioverview)
  * [About API](#aboutapi)
  * [Device Provisioning API](#provisioningapi)
  * [Configuration API](#configurationapi)
* [Advanced Topics](#advancedtopics)
  * [Secured access to the Context Broker](#securedaccess)
  * [Data mapping plugins](#datamapping)
  * [Old IoTAgent data migration](#datamigration)
* [Testing](#librarytesting)
* [Development Documentation](#development)

## <a name="overview"/> Overview
### Description
This project aims to provide a Node.js module to enable IoT Agent developers to build custom agents for their devices that can
easily connect to NGSI Context Brokers (such as [Orion](https://github.com/telefonicaid/fiware-orion) ). 

An IoT Agent is a component that lets groups of devices send their data to and be managed from a FIWARE NGSI Context
Broker using their own native protocols. IoT Agents should also be able to deal with security aspects of the Fiware
platform (authentication and authorization of the channel) and provide other common services to the device programmer.

There is more information about specific topics in the following documents:

* [User manual](doc/usermanual.md): library reference for IoTA implementation. Contains the complete list of library
functions and implementation topics.
* [Installation and configuration guide](doc/installationguide.md): information for the configuration of the library.
* [Operations manual](doc/operations.md): guide of logs and alarms raised by the library.
* [IoTA Design HowTo](doc/howto.md): step-by-step howto about how to implement an IoT Agent.

This project is part of [FIWARE](https://www.fiware.org/). Check also the [FIWARE Catalogue entry for the IoTAgents](http://catalogue.fiware.org/enablers/backend-device-management-idas)

### Device to NGSI Mapping
Each Device will be mapped as an Entity associated to a Context Provider: the Device Id will be mapped by default to
the entity ID and the type of the entity will be selected by the IoT Agent in a protocol-dependent way (e.g: with
different URLs for different types). Both the name and type will be configurable by the user, either by type
configuration or with the device preprovisioning.

Each of the measures obtained from the device should be mapped to a different attribute. The name and type of the
attribute will be configured by the user (globally for all the types in the IoT Agent configuration or in a per device
basis preprovisioning the devices). Device measures can have three different behaviors:

* **Active attributes**: are measures that are pushed from the device to the IoT agent. This measure changes will be
sent to the Context Broker as updateContext requests over the device entity. NGSI queries to the context broker will
be resolved in the Broker database.

* **Lazy attributes**: some sensors will be passive, and will wait for the IoT Agent to request for data. For those
measures, the IoT Agent will register itself in the Context Broker as a Context Provider (for all the lazy measures of
that device), so if any component asks the Context Broker for the value of that sensor, its request will be redirected
to the IoT Agent (that behaves as a NGSI10 Context Provider). This operation will be synchronous from the customer
perspective: the Context Broker won't return a response until de device has returned its response to the IoT Agent.

* **Commands**: in this case, the interaction will begin by setting an attribute in the device's entity, for which the
IoT Agent will be regitered as CP. The IoT Agent will return an immediate response to the Context Broker, and will be
held responsible of contacting the device to perform the command itself, updating special `status` and `info` attributes
in the entity as soon as it has any information of the command progress.

The following sequence diagram shows the different NGSI interactions an IoT Agent makes with the Context Broker,
explained in the following subsections (using the example of a OMA Lightweight M2M device).

![General ](https://raw.githubusercontent.com/telefonicaid/iotagent-node-lib/master/img/ngsiInteractions.png "NGSI Interactions")

Be aware that the IoT Agents are only required to support NGSI10 operations `updateContext` and `queryContext` in their
standard formats (currently in JSON format; XML deprecated) but will not answer to NGSI9 operations
(or NGSI convenience operations of any kind).

#### Configurations and Device provisioning information
In order for a device to connect to the IoTA, the device should be provisioned (although there may be occasions where this
registration is not needed). The provision process is meant to provide the IoTA with the following information:

* **Entity translation information**: information about how to convert the data coming from the South Bound into NGSI
information. This includes things as the entity name and type and the name and type of all the attributes that will
be created in the entity. This includes the service and subservice the entity belongs to.

* **Southbound protocol identification**: attributes that will identify a particular device when a new measure comes to
the Southbound (typically the Device ID and API Key).

* **Security information**: trust token for the devices to be inserted in a PEP Protected Context Broker.

* **Other information**: as timezone or alternative Context Brokers.

In order to provide this information, the IoTAgent Northbound API provides two resources: Device and Configuration
provisioning.

**Configurations** may be used when a set of similar devices will be connected to the IoTA, to avoid provisioning the
same set of information for every device. Custom APIKeys can be only provided with the use of Configurations for device
groups. When a device is provisioned, it is assigned to a configuration *if there is one that matches its type, its service
and its subservice*. In that case, all the default information in the Configuration is merged with the device information
to create the definitive Device object that will be stored in the system.

Particular IoT Agents *may* support autoregistration of devices into configurations, if enough information is given from
the Southbound.

#### Configurations and subservices

Configurations are meant to be a mean of simplifying the device provisioning for groups of very similar devices. Considering
that different groups of devices may be created in the same subservice that may require different configurations, multiple
configurations are allowed for each subservice. Considering the key in the association between Device and Configuration
was the triplet (service, subservice, type), all of these elements are considered mandatory.

This statement doesn't hold true for older IoT Agents, though. In older versions of the IoT Agents, each device
configuration was assigned to a particular subservice and just one configuration was allowed per subservice, so the relation
between a Device and a Configuration didn't need the type to discriminate between Configurations. That's why for those
agents, type was not a mandatory parameter.

In order to allow backward-compatibility with those agents, the IoT Agent Library now implement a compatibility mode:
the **Single Configuration Mode**, that makes the agent behave like the old agents. In this mode:

* Each Subservice can contain just one Configuration. If a second Configuration is created for a Subservice, an error
is raised.

* Each Device provisioned for a Subservice is automatically assigned to the Subservice one Configuration if there is any.

This compatibility has to be set for the whole IoT Agent, and there is no option of having both modes simultaneously running.
Transitions from one mode to the other should be made with care, and may involve data migration.

#### Registration
Whenever a device is registered, the IoT Agent reads the device's entity information from the request or, if that
information is not in the request, from the default values for that type of device. Among this information, there should
be the list of device attributes that will be considered lazy (or passive). With this information, the IoT Agent sends
a new `registerContext` request to the Context Broker, registering itself as ContextProvider of all the lazy attributes
for the device's entity. The `registrationId` is then stored along the other device information inside the IoT Agent
device registry.

As NGSI9 does not allow the context registrations to be removed, when the device is removed from the IoT Agent, the
registration is updated to an expiration date of 1s, so it is effectively disabled. Once it has been disabled, the device
is removed from the IoT Agent's internal registry.

#### Lazy attributes
When a request for data from a lazy attribute arrives to the Context Broker, it forwards the request to the Context
Provider of that entity, in this case the IoT Agent. The IoT Agent will in turn ask the device for the information needed,
transform that information to a NSGI format and return it to the Context Broker. The latter will the forward the response
to the caller, transparently.

#### Commands
Commands are modelled as updates over a lazy attribute. As in the case of the lazy attributes, updates over a command
will be forwarded by the Context Broker to the IoT Agent, that will in turn interact with the device to perform the
requested action. Parameters for the command will be passed inside the command value.

There are two differences with the lazy attributes:
* First of all, for every command defined in a device, two new attributes are created in the entity with the same name
as the command but with a prefix:
	* '_info': this attribute reflect the current execution status of the command. When a command request is issued by
	the Context Broker, the IoT Agent library generates this attribute with 'PENDING' value. The value of this attribute
	will be changed each time a command error or result is issued to the IoT Agent.
	* '_result': this attribute reflect the result of the execution of the defined command.

* Commands can also be updated when new information about its execution arrives to the agent. This information will be
mapped to the command's utility attributes `_info` and `_result` leaving alone the command attribute itself. The
values for this attributes are stored locally in the Context Broker (instead of being redirected with the Context
Provider operations).

There are two types of commands:
* **Push commands**: when a command of this type arrives to the IoTAgent, the IoTAgent will immediately forward the command
request to the device, translating the request to the proper protocol (that will depend on the type of IoTAgent). The
library implement this kind of commands by offering a set functions that can be used to set an IoTAgent-specific handler
for incoming commands. In order for this type of commands to work properly, the devices must be preprovisioned with an
endpoint of the proper protocol, where it can be accessed by the IoTAgent who pushes de commits.

* **Poll commands**: polling commands are meant to be used on those cases where the device can't be online the whole time
waiting for commands. In this case, the IoTAgents must store the received commands, offering a way for the device to
retrieve the pending commands upon connection. To enable this feature, the Library offers a set of functions to manage
command storage, and a mechanism to automatically store incoming commands for those devices marked as 'polling devices'.

The distinction between push and poll commands will be made based on the presence of a `polling` flag in the device
provisioning data. The default option (with the flag with value `false` or not present) is to use push commands (as they
were the only ones available until the latest versions).

Polling commands could be subjected to expiration: two configuration properties pollingExpiration` and `pollingDaemonFrequency`
can be set to start a daemon that will remove expired commands from the DB if the device is taking too much to pick them
up. See the configuration section for details.

The library does not deal with protocol transformation or South Bound communications for neither of the command types
(that's the task for those specific IoTAgents using the library).

#### Active attributes
Whenever a device proactively sends a message to the IoT Agent, it should tranform its data to the appropriate NGSI
format, and send it to the Context Broker as an `updateContext` request.

### Features
These are the features an IoT Agent is supposed to expose (those not supported yet by this library are marked as PENDING):

* **Device registration**: multiple devices will be connected to each IoT Agent, each one of those mapped to a
CB entity. The IoT Agent will register itself as a Context Provider for each device, answering to requests and updates
on any lazy attribute of the device.

* **Device information update**: whenever a device haves new measures to publish, it should send the information to
the IoT Agent in its own native language. This message should , in turn, should be sent as an `updateContext` request to
the Context Broker, were the measures will be updated in the device entity.

* **Device command execution and value updates**: as a Context Provider, the IoT Agent should receive update operations
from the Context Broker subscriptions, and relay them to the corresponding device (decoding it using its ID and Type,
and other possible metadata). This commands will arrive as `updateContext` operations redirected from the Context Broker
to the IoT Agent (Command execution PENDING; value updates available).

* **Device management**: the IoT Agent should offer a device repository where the devices can be registered, holding data
 needed for the connection to the Context Broker as the following: service and subservice for the device, API Key the
 device will be using to connect to the IoT Agent, Trust token the device will be using to retrieve the Keystone token
 to connect to the Context Broker.

* **Device provisioning**: the IoT Agent should offer an external API to make a preprovision of any devices. This
preprovision should enable the user to customize the device`s entity name and type as well as their service information.

* **Type configuration**: if a device is registered without a preregistration, only its `id` and `type` attributes are
mandatory. The IoT Agent should provide a mechanism to provide default values to the device attributes based on its
type.

Almost all of these features are common for every agent, so they can be abstracted into a library or external module.
The objective of this project is to provide that abstraction. As all this common tasks are abstracted, the main task of
the concrete IoT Agent implementations will be to map between the native device protocol and the library API.

The following figure offers a graphical example of how a COAP IoT Agent work, ordered from the registration of the device
to a command update to the device.

![General ](https://raw.githubusercontent.com/telefonicaid/iotagent-node-lib/master/img/iotAgentLib.png "Architecture Overview")

### <a name="TimeInstant"/>The ´TimeInstant´ element

As part of the device to entity mapping process the IoT Agent creates and updates automatically a special timestamp.
This timestamp is represented as two different properties of the mapped entity::

* An attribute metadata named `TimeInstant` per dynamic attribute mapped, which captures as an ISO8601 timestamp when
the associated measurement (represented as attribute value) was observed.

* An entity attribute named `TimeInstant` which captures as an ISO8601 timestamp when the last measurement received
from the device was observed.

If no information about the measurement timestamp is received by the IoTAgent, the arrival time of the measurement will
be used to generate a `TimeInstant` for both the entity and the attribute's metadata.

Take into account that:
* the timestamp of different attributes belonging to the same measurement record may not be equal.
* the arrival time and the measurement timestamp will not be the same in the general case.

E.g.: in the case of a device that can take measurements every hour of both temperature and humidity and sends the data
once every day, at midnight, the `TimeInstant` reported for each measurement will be the hour when that measurement was observed
(e.g. 4:00 PM), while all the measurements will have an arrival time around midnight. If no timestamps were reported with
such measurements, the `TimeInstant` attribute would take those values around midnight.

This functionality can be turned on and off through the use of the `timestamp` configuration flag (described in the
configuration).

### Implementation decisions
Given the aforementioned requirements, there are some aspects of the implementation that were chosen, and are
particularly under consideration:
* Aside from its configuration, the IoT Agent Lib is considered to be stateless. To be precise, the library
mantains a state (the list of entities/devices whose information the agent can provide) but that state is considered
to be transient. It's up to the particular implementation of the agent to consider whether it should have a persistent
storage to hold the device information (so the internal list of devices is read from a DB) or to register the devices
each time a device sends a measure. To this extent, two flavours of the Device Registry has been provided: a transient
one (In-memory Registry) and a persistent one (based in MongoDB).
* The IoT Agent does not care about the origin of the data, its type or structure. The mapping from raw data to the
entity model, if there is any, is a responsability of the particular IoT Agent implementation, or of another third
party library.

## <a name="buildinstall"/> Build & Install

Information about how to configure the Library can be found at the corresponding section of the [Installation & Administration Guide](docs/installationguide.md).

This library has no packaging or build processes. Usage of the library is explained in the [User & Programmers Manual](docs/usermanual.md).

## <a name="apioverview"/> API Overview

### <a name="aboutapi"/> About API
The library provides a simple operation to retrieve information about the library and the IoTA using it. A GET request
to the `/iot/about` path, will show a payload like the following:
```
{
“version”:”0.5.2”,
“libVersion”:”0.8.4”,
"port":4041,
"baseRoot":"/"
}
```
the `version` field will be read from the `iotaVersion` field of the config, if it exists.

### <a name="provisioningapi"/> Device Provisioning API
#### Overview
The IoT Agents offer a provisioning API where devices can be preregistered, so all the information about service and 
subservice mapping, security information and attribute configuration can be specified in a per device way instead of 
relaying on the type configuration. The following section specifies the format of the device payload; this will be the 
payload accepted by all the write operations and that will be returned by all the read operations. Take care of the 
exception of the POST operation: in this case, the device objects must be specified as an array, as multiple devices
can be provided simultaneusly for the same service.

Two parameters in this payload are given a special treatment: service and subservice. This two parameters are needed to 
fill the `fiware-service` and `fiware-servicepath` mandatory headers that will be used in the interactions with the 
Context Broker. This parameters should not be passed along with the rest of the body, but they will be taken from the 
same headers, as received by the Device Provisioning API (this two headers are, thus, mandatory both for incoming and 
outgoing requests).

Note that there is a 1:1 correspondence between payload fields and DB fields (but using a different capitalization, 
e.g. `service_path` vs. `servicePath`).

#### Device model

The next table shows the information held in the Device resource. The table also contains the correspondence between
the API resource fields and the same fields in the database model.

| Payload Field | DB Field | Definition                                     | Example of value                      |
| ------------------- | ------------------- |:---------------------------------------------- |:------------------------------------- |
| device_id    	      | id    	      | Device ID that will be used to identify the device. | UO834IO   |
| service             | service            |  Name of the service the device belongs to (will be used in the fiware-service header).  | smartGondor |
| service_path        | subservice        | Name of the subservice the device belongs to (used in the fiware-servicepath header). | /gardens |
| entity_name         | name         | Name of the entity representing the device in the Context Broker	| ParkLamplight12 |
| entity_type         | type         | Type of the entity in the Context Broker | Lamplights |
| timezone            | timezone            | Time zone of the sensor if it has any | America/Santiago |
| endpoint            | endpoint            | Endpoint where the device is going to receive commands, if any. | http://theDeviceUrl:1234/commands  |
| protocol            | protocol            | Name of the device protocol, for its use with an IoT Manager. | IoTA-UL |
| transport           | transport           | Name of the device transport protocol, for the IoT Agents with multiple transport protocols. | MQTT |
| attributes          | active          | List of active attributes of the device	| `[ { "name": "attr_name", "type": "string" } ]` |
| lazy                | lazy                | List of lazy attributes of the device	| `[ { "name": "attr_name", "type": "string" } ]` |
| commands            | commands            | List of commands of the device	| `[ { "name": "attr_name", "type": "string" } ]` |
| internal_attributes | internalAttributes | List of internal attributes with free format for specific IoT Agent configuration | LWM2M mappings from object URIs to attributes |
| static_attributes   | staticAttributes   | List of static attributes to append to the entity. All the updateContext requests to the CB will have this set of attributes appended.	| `[ { "name": "attr_name", "type": "string" } ]` |

#### Attribute lists
In the device model there are three list of attributes that can be declared: attributes, lazy and commands. All of them 
have the same syntax, an object containing the following attributes:
* **object_id** (optional): name of the attribute as coming from the device.
* **name** (mandatory): id of the attribute in the target entity in the Context Broker.
* **type** (mandatory): name of the type of the attribute in the target entity.

Some transformation plugins also allow the use of the following optional attributes:
* **expression**: indicates that the value of the target attribute will not be the plain value or the measurement, but
an expression based on a combination of the reported values. See the [Expression Language definition](doc/expressionLanguage.md) for details
* **entity_name**: the presence of this attribute indicates that the value will not be stored in the original device entity
but in a new entity with an ID given by this attribute. The type of this additional entity can be configured with the
`entity_type` attribute. If no type is configured, the device entity type is used instead. Entity names can be defined
as expressions, using the [Expression Language definition](doc/expressionLanguage.md).
* **entity_type**: configures the type of an alternative entity.
* **reverse**: add bidirectionality expressions to the attribute. See the **bidirectionality** transformation plugin
in the [Data Mapping Plugins section](#datamapping) for details.

See the transformation plugins Section for more details.

#### API Actions
##### POST /iot/devices
Provision a new device in the IoT Agent's device registry. Takes a Device in JSON format as the payload. 

Returns: 
* 200 OK if successful.
* 500 SERVER ERROR if there was any error not contemplated above.

Payload example:
```json
{
    "devices": [ 
        { 
            "device_id": "DevID1", 
            "entity_name": "TheDevice1", 
            "entity_type": "DeviceType", 
            "attributes": [ 
                  { "object_id": "t", "name": "temperature", "type": "float" },
                  { "object_id": "h", "name": "humidity", "type": "float" }
            ],
            "lazy":[
                  { "object_id": "l", "name": "luminosity", "type": "percentage" }
            ],
            "commands": [
                  { "object_id": "t", "name": "turn", "type": "string" }
            ],
            "static_attributes": [
                  { "name": "serialID", "type": "02598347" }
            ]
        }
    ]
}
```

##### GET /iot/devices
Returns a list of all the devices in the device registry with all its data.

Query parameters:
* limit: if present, limits the number of devices returned in the list.
* offset: if present, skip that number of devices from the original query.

Returns: 
* 200 OK if successful, and the selected Device payload in JSON format.
* 404 NOT FOUND if the device was not found in the database.
* 500 SERVER ERROR if there was any error not contemplated above.

Example of return payload:
```json
{
  "count": 2,
  "devices": [
    {
      "device_id": "DevID0",
      "service": "ServiceTest",
      "service_path": "/testSubservice",
      "entity_name": "TheDevice0",
      "entity_type": "DeviceType",
      "attributes": [
        {
          "type": "float",
          "name": "temperature",
          "object_id": "t"
        },
        {
          "type": "float",
          "name": "humidity",
          "object_id": "h"
        }
      ],
      "lazy": [],
      "static_attributes": [],
      "internal_attributes": []
    },
    {
      "device_id": "DevID1",
      "service": "ServiceTest",
      "service_path": "/testSubservice",
      "entity_name": "TheDevice1",
      "entity_type": "DeviceType",
      "attributes": [
        {
          "type": "float",
          "name": "temperature",
          "object_id": "t"
        },
        {
          "type": "float",
          "name": "humidity",
          "object_id": "h"
        }
      ],
      "lazy": [
        {
          "type": "percentage",
          "name": "luminosity",
          "object_id": "l"
        }
      ],
      "static_attributes": [
        {
          "type": "02598347",
          "name": "serialID"
        }
      ],
      "internal_attributes": []
    }
```

##### GET /iot/devices/:deviceId
Returns all the information about a particular device.

Returns: 
* 200 OK if successful, and the selected Device payload in JSON format.
* 404 NOT FOUND if the device was not found in the database.
* 500 SERVER ERROR if there was any error not contemplated above.

Example of return payload:
```json
{
  "device_id": "DevID1",
  "service": "ServiceTest",
  "service_path": "/testSubservice",
  "entity_name": "TheDevice1",
  "entity_type": "DeviceType",
  "attributes": [
    {
      "object_id": "t",
      "name": "temperature",
      "type": "float"
    },
    {
      "object_id": "h",
      "name": "humidity",
      "type": "float"
    }
  ],
  "lazy": [
    {
      "object_id": "l",
      "name": "luminosity",
      "type": "percentage"
    }
  ],
  "static_attributes": [
    {
      "name": "serialID",
      "type": "02598347"
    }
  ],
  "internal_attributes": []
}
```

##### DELETE /iot/devices/:deviceId
Remove a device from the device registry. No payload is required or received.

Returns: 
* 200 OK if successful, with no payload.
* 404 NOT FOUND if the device was not found in the database.
* 500 SERVER ERROR if there was any error not contemplated above.

##### PUT /iot/devices/:deviceId
Changes the stored values for the device with the provided Device payload. Neither the name, the type nor the ID of the
device can be changed using this method (as they are used to link the already created entities in the CB to the information
in the device). Service and servicepath, being taken from the headers, can't be changed also.

Returns: 
* 200 OK if successful, with no payload.
* 404 NOT FOUND if the device was not found in the database.
* 500 SERVER ERROR if there was any error not contemplated above.

Payload example:
```json
{ 
    "attributes": [ 
          { "object_id": "t", "name": "temperature", "type": "float" },
          { "object_id": "h", "name": "humidity", "type": "float" },
          { "object_id": "p", "name": "pressure", "type": "float" }
    ],
    "lazy":[
          { "object_id": "l", "name": "luminosity", "type": "percentage" }
    ],
    "commands": [
          { "object_id": "t", "name": "turn", "type": "string" }
    ],
    "static_attributes": [
          { "name": "serialID", "type": "02598347" }
    ]
}
```

### <a name="configurationapi"/> Configuration API
For some services, there will be no need to provision individual devices, but it will make more sense to provision
different device groups, each of one mapped to a different type of entity in the context broker. How the type of entity
is assigned to a device will depend on the Southbound technology (e.g.: path, port, APIKey...). Once the device has an
assigned type, its configuration values can be extracted from those of the type.

The IoT Agents provide two means to define those device groups:
* Static **Type Configuration**: configuring the `ngsi.types` property in the `config.js` file.
* Dynamic **Configuration API**: making use of the API URLS in the configuration URI, `/iot/services`. Please, note
that the configuration API manage servers under an URL that requires the `server.name` parameter to be set (the name of
the IoT Agent we are using). If no name is configured `default` is taken as the default one.

Both approaches provide the same configuration information for the types (and they, in fact, end up in the same
configuration collection).

Both approaches are better described in the sections bellow. 

#### Configuration API
The following sections show the available operations for the Configuration API. Every operation in the API require the `fiware-service` and `fiware-servicepath` to be defined; the operations are performed in the scope of those headers. For the list case, the special wildcard servicepath can be specified, '/*'. In this case, the operation applies to all the subservices of the service given by the `fiware-service` header.

For every Device Group, the pair (resource, apikey) *must* be unique (as it is used to identify which group to assign to which device). Those operations of the API targeting specific resources will need the use of the `resource` and `apikey` parameters to select the apropriate instance.

Note that there is a 1:1 correspondence between payload fields and DB fields (but with some changes in the attribute
naming; e.g.: subservice -> service_path).

##### Device Group Model
The next table shows the information held in the Device Group resource. The table also contains the correspondence between
the API resource fields and the same fields in the database model.

| Payload Field | DB Field | Definition                                     |
| ------------------- | ------------------- |:---------------------------------------------- |
| service    	        | service    	        | Service of the devices of this type |
| subservice    	    | subservice    	    | Subservice of the devices of this type. |
| resource    	      | resource    	      | string representing the Southbound resource that will be used to assign a type to a device (e.g.: pathname in the southbound port). |
| apikey    	        | apikey    	        | API Key string. |
| entity_type    	    | entity_type    	    | name of the type to assign to the group. |
| trust    	          | trust    	          | trust token to use for secured access to the Context Broker for this type of devices (optional; only needed for secured scenarios). |
| cbHost    	        | cbHost    	        | Context Broker connection information. This options can be used to override the global ones for specific types of devices. |
| lazy    	          | lazy    	          | list of lazy attributes of the device. For each attribute, its `name` and `type` must be provided. |
| commands    	      | commands    	      | list of commands attributes of the device. For each attribute, its `name` and `type` must be provided. |
| active    	        | attributes    	    | list of active attributes of the device. For each attribute, its `name` and `type` must be provided. |
| static_attributes   | staticAttributes    | this attributes will be added to all the entities of this group 'as is'. |
| internal_attributes | internalAttributes  | optional section with free format, to allow specific IoT Agents to store information along with the devices in the Device Registry. |


##### POST /iot/services
Creates a set of device groups for the given service and service path. The service and subservice information will taken from the headers, overwritting any preexisting values.

Body params:
* services: list of device groups to create. Each one adheres to the Device Group Model.

E.g.:
```
{
	"services": [
	{
	    "resource": "/deviceTest",
	    "apikey": "801230BJKL23Y9090DSFL123HJK09H324HV8732",
	    "type": "Light",
	    "trust": "8970A9078A803H3BL98PINEQRW8342HBAMS",
	    "cbHost": "http://unexistentHost:1026",
	    "commands": [
	        {
	            "name": "wheel1",
	            "type": "Wheel"
	        }
	    ],
	    "lazy": [
	        {
	            "name": "luminescence",
	            "type": "Lumens"
	        }
	    ],
	    "active": [
	        {
	            "name": "status",
	            "type": "Boolean"
	        }
	    ]
	}
	]
}
```

Returns: 
* 200 OK if successful, with no payload.
* 400 MISSING_HEADERS if any of the mandatory headers is not present.
* 400 WRONG_SYNTAX if the body doesn't comply with the schema.
* 500 SERVER ERROR if there was any error not contemplated above.

##### GET /iot/services
Retrieves device groups from the database. If the servicepath header has de wildcard expression, '/*', all the subservices for the service are returned. The specific subservice parameters are returned in any other case.

Returns: 
* 200 OK if successful, returning a device group body.
* 400 MISSING_HEADERS if any of the mandatory headers is not present.
* 500 SERVER ERROR if there was any error not contemplated above.

##### PUT /iot/services
Modifies the information for a device group configuration, identified by the `resource` and `apikey` query parameters. Takes a device group body as the payload. The body does not have to be complete: for incomplete bodies, just the existing attributes will be updated

E.g.:
```
{
    "trust": "8970A9078A803H3BL98PINEQRW8342HBAMS",
    "cbHost": "http://anotherUnexistentHost:1026"
}
```

Returns: 
* 200 OK if successful, returning the updated body.
* 400 MISSING_HEADERS if any of the mandatory headers is not present.
* 500 SERVER ERROR if there was any error not contemplated above.

##### DELETE /iot/services
Removes a device group configuration from the DB, specified by the `resource` and `apikey` query parameters. 

Returns: 
* 200 OK if successful.
* 400 MISSING_HEADERS if any of the mandatory headers is not present.
* 500 SERVER ERROR if there was any error not contemplated above.

#### Type Configuration
The IoT Agent can be configured to expect certain kinds of devices, with preconfigured sets of attributes, service information, security information and other attributes. The `types` attribute of the configuration is a map, where the key is the type name and the value is an object containing all the type information. Each type can has the following information configured:

* **service**: service of the devices of this type.
* **subservice**: subservice of the devices of this type.
* **active**: list of active attributes of the device. For each attribute, its `name` and `type` must be provided.
* **lazy**: list of lazy attributes of the device. For each attribute, its `name` and `type` must be provided.
* **commands**: list of commands attributes of the device. For each attribute, its `name` and `type` must be provided.
* **internalAttributes**: optional section with free format, to allow specific IoT Agents to store information along with the devices in the Device Registry.
* **staticAttributes**: this array of attributes will be added to every entity of this type 'as is'.
* **trust**: trust token to use for secured access to the Context Broker for this type of devices (optional; only needed for secured scenarios).
* **cbHost**: Context Broker host url. This option can be used to override the global CB configuration for specific types of devices.

## <a name="advancedtopics"/> Advanced Topics
### <a name="securedaccess"/> Secured access to the Context Broker
For access to instances of the Context Broker secured with a [PEP Proxy](https://github.com/telefonicaid/fiware-orion-pep), an authentication mechanism based in Keystone Trust tokens is provided. A Trust token is a long-term token that can be issued by any user to give another user permissions to impersonate him with a given role in a given project.

For the authentication mechanisms to work, the `authentication` attribute in the configuration has to be fully configured, and the `authentication.enabled` subattribute should have the value `true`.

When the administrator of a service is configuring a set of devices or device types in the IoT Agent to use a secured Context Broker, he should follow this steps:
* First, a Trust token should be requested to Keystone, using the service administrator credentials, the role ID and the IOT Agent User ID. The Trust token can be retrieved using the following request (shown as a curl command):
```
curl http://${KEYSTONE_HOST}/v3/OS-TRUST/trusts \
    -s \
    -H "X-Auth-Token: $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '
{
    "trust": {
        "impersonation": false,
        "project_id": "'$SUBSERVICE_ID'",
        "roles": [
            {
                "id": "'$ID_ROLE'"
            }
        ],
        "trustee_user_id": "'$ID_IOTAGENT_USER'",
        "trustor_user_id": "'$ID_ADM1'"
    }
}'
```
* Every device or type of devices configured to use a secured Context Broker must be provided with a Trust Token in its configuration.
* Before any request is sent to a secured Context Broker, the IoT Agent uses the Trust token to generate a temporary access token, that is attached to the request (in the `X-Auth-token` header).

Apart from the generation of the trust, the use of secured Context Brokers should be transparent to the user of the IoT Agent.

### <a name="datamapping"/> Data mapping plugins
#### Overview
The IoT Agent Library provides a plugin mechanism in order to facilitate reusing code that makes small transformations on 
incoming data (both from the device and from the context consumers). This mechanism is based in the use of middlewares,
i.e.: small pieces of code that receive and return an `entity`, making as many changes as they need, but taking care of
returning a valid entity, that can be used as the input for other middlewares; this way, all those pieces of
code can be chained together in order to make all the needed transformations in the target entity.

There are two kinds of middlewares: updateContext middlewares and queryContext middlewares. The updateContext middlewares
are applied before the information is sent to the Context Broker, modifiying the entity before it is sent to Orion. The 
queryContext middlewares are applied on the received data, whenever the IoT Agent queries the Context Broker for information.
I.e.: both middlewares will be automatically applied whenever the `update()` or `query()` functions are called in the 
library.

All the middlewares have the opportunity to break the chain of middleware applications by calling the `callback()` with
an error object (the usual convention). If any of the updateContext middlewares raise an error, no request will be sent
to the Context Broker. On the other hand, the queryContext request is always performed, but the call to the `query()` 
function will end up in an error if any of the queryContext middlewares report an error.

#### Development
All the middlewares have the same signature:
```
function middlewareName(entity, typeInformation, callback) {}
```
The arguments for any middleware are the NGSI data over which it can operate:
- An updateContext payload in the case of an updateContext middleware and a queryContext payload otherwise; 
- a typeInformation object containing all the information about the device stored during registration.
- and the customary `callback` parameter, with the usual meaning. It's really important for the library user to call 
this callback, as failing to do so may hang the IoT Agent completely. The callback must be called with the an optional 
error in the first argument and the same arguments recieved (potentially modified) as the following.

In order to manage the middlewares to the system, the following functions can be used:
- `addUpdateMiddleware`: adds an updateContext middleware to the stack of middlewares. All the middlewares will be 
applied to every call to the `update()` function. The final payload of the updateContext request will be the result
of applying all this middlewares in the order they have been defined.

- `addQueryMiddleware`: adds a queryContext middleware to the stack of middlewares. All the middlewares will be applied 
to every call to the `query()` function.

- `resetMiddlewares`: remove all the middlewares from the system.

Usually, the full list of middlewares an IoT Agent will use would be added in the IoTAgent start sequence, so they 
should not change a lot during the IoT lifetime.

#### Provided plugins
The library provides some plugins out of the box, in the `dataPlugins` collection. In order to load any of them, just
use the `addQueryMiddleware` and `addUpdateMiddleware` functions with the selected plugin, as in the example:
```
var iotaLib = require('iotagent-node-lib');

iotaLib.addUpdateMiddleware(iotaLib.dataPlugins.compressTimestamp.update);
iotaLib.addQueryMiddleware(iotaLib.dataPlugins.compressTimestamp.query);
```

##### Timestamp Compression plugin (compressTimestamp)
This plugins change all the timestamp attributes found in the entity, and all the timestamp metadata found in any 
attribute, from the basic complete calendar timestamp of the ISO8601 (e.g.: 20071103T131805) to the extended
complete calendar timestamp (e.g.: +002007-11-03T13:18). The middleware expects to receive the basic format in 
updates and return it in queries (and viceversa, receive the extended one in queries and return it in updates).  

##### Attribute Alias plugin (attributeAlias)
In the Device provision, an id can be specified for each attribute, along with its name. The Id can be used then as 
the left part of a mapping from attribute names in the south bound to attribute names in the North Bound. If the id and
name attributes are used in this way, this plugin makes the translation from one to the other automatically.

##### Event plugin (addEvents)
This plugin allows for the creation of Event attributes, i.e.: attributes whose value will be the timestamp of its
inclusion in the system, regardless of the value they carried in the Southbound API. If this plugin is active, all
the events in the IoT Agent with the configured type name will be marked as events. The event name can be configured
in the `config.eventType` attribute.

##### Timestamp Processing Plugin (timestampProcess)
This plugin processes the entity attributes looking for a TimeInstant attribute. If one is found, the plugin add a
TimeInstant attribute as metadata for every other attribute in the same request.

##### Expression Translation plugin (expressionTransformation)
This plugin allows the devices and configurations that have defined expressions to generate their values from those
expressions and the reported measure information.

For further information on how the expressions work, refer to the [Expression Language Reference](.doc/expressionLanguage).

##### Multientity plugin (multiEntity)
Allows the devices provisioned in the IoTAgent to map their attributes to more than one entity, declaring the target
entity through the Configuration or Device provisioning APIs.

##### Bidirectionality plugin (bidirectional)
This plugin allows the devices with composite values an expression to update the original values in the devices when
the composite expressions are updated in the Context Broker. This behavior is achieved through the use of subscriptions.

IoTAs using this plugins should also define a notification handler to handle incoming values. This handler will be
intercepted by the plugin, so the mapped values are included in the updated notification.

When a device is provisioned with bidirectional attributes, the IoTAgent subscribes to changes in that attribute. When a
change notification for that attribute arrives to the IoTA, it applies the transformation defined in the device provisioning
payload to the notification, and calls the underlying notification handler with the transformed entity.

The following `attributes` section shows an example of the plugin configuration:
```
      "attributes": [
        {
          "name":"location",
          "type":"geo:point",
          "expression": "${latitude}, ${longitude}",
          "reverse": [
            {
              "object_id":"longitude",
              "type": "string",
              "expression": "${trim(substr(@location, indexOf(@location, \",\") + 1, length(@location)))}"
            },
            {
              "object_id":"latitude",
              "type": "string",
              "expression": "${trim(substr(@location, 0, indexOf(@location, \",\")))}"
            }
          ]
        }
      ],
```
For each attribute that would have bidirectionality, a new field `reverse` must be configured. This field will contain
an array of fields that will be created based on the notifications content. The expression notification can contain
any attribute of the same entity as the bidirectional attribute; declaring them in the expressions will add them to
the subscription payload.

For each attribute in the `reverse` array, an expression must be defined to calculate its value based on the notification
attributes. This value will be passed to the underlying protocol with the `object_id` name. Details about how the value
is then progressed to the device are protocol-specific.

### <a name="datamigration"/> Old IoTAgent data migration
In order to ease the transition from the old IoTAgent implementation (formerly known as IDAS) to the new Node.js based
implementations, a data migration tool has been developed. This data migration tool has been integrated as a command
in the IoTAgent command line tester.

In order to perform a full migration, follow this steps:
* From the project root, start the command line tester:
<pre>
bin/iotAgentTester.js
</pre>

* Configure the MongoDB host and port, and the origin Database (that holds the data to be migrated):
<pre>
configMigration localhost 27017 originDB
</pre>

* Launch the migration, using the special value "*" as service and subservice
<pre>
migrate targetDB * *
</pre>

Some warnings may appear with the "Attribute [_id] was not found for item translation" message during the migration.
They show the values existing in the original DB that had no translation for the target DB.

If you want to restrict the migration for certain services and subservices, just substitute the '*' value for the particular
service and subservice you want to use.

## <a name="librarytesting"/> Testing
### Agent Console
A command line client to experiment with the library is packed with it. The command line client can be started using the following command:
```
bin/agentConsole.js
```
The client offers an API similar to the one offered by the library: it can start and stop an IoT agent, register and unregister devices, send measures mimicking the device and receive updates of the device data. Take into account that, by default, the console uses the same `config.js` file than the IoT Agent.

The command line client creates a console that offers the following options:

```
stressInit

	Start recording a stress batch.

stressCommit <delay> <times> <threads> <initTime>

	Executes the recorded batch as many times as requested, with delay (ms) between commands.
	The "threads" parameter indicates how many agents will repeat that same sequence. The "initTime" (ms)
	parameter indicates the mean of the random initial waiting times for each agent.

exit

	Exit from the command line.

start

	Start the IoT Agent

stop

	Stop the IoT Agent

register <id> <type>

	Register a new device in the IoT Agent. The attributes to register will be extracted from the
	type configuration

unregister <id> <type>

	Unregister the selected device

showConfig

	Show the current configuration file

config <newConfig>

	Change the configuration file to a new one

updatevalue <deviceId> <deviceType> <attributes>

	Update a device value in the Context Broker. The attributes should be triads with the following
	format: "name/type/value" sepparated by commas.

listdevices

	List all the devices that have been registered in this IoT Agent session

```
### Agent tester
#### Command line testing
The library also offers a Context Broker and IoT Agent client that can be used to:
* Simulate operations to the Context Broker used by the IoT Agent, triggering Context Provider forwardings for lazy attributes and checking the appropriate values for active ones.
* Simulate operations to the Device Provisioning API and Configuration API of the IoT Agent.

The tester can be started with the following command, from the root folder of the project:
```
bin/iotAgentTester.js
```
From the command line, the `help` command can be used to show a description of the currently supported features. These are the following:
```
stressInit

	Start recording a stress batch.

stressCommit <delay> <times> <threads> <initTime>

	Executes the recorded batch as many times as requested, with delay (ms) between commands.
	The "threads" parameter indicates how many agents will repeat that same sequence. The "initTime" (ms)
	parameter indicates the mean of the random initial waiting times for each agent.

exit

	Exit from the command line.

update <entity> <type> <attributes>

	Update the values of the defined set of attributes, using the following format: name#type=value(|name#type=value)*

append <entity> <type> <attributes>

	Append a new Entity with the defined set of attributes, using the following format: name:type=value(,name:type=value)*

query <entity> <type>

	Get all the information on the selected object.

queryAttr <entity> <type> <attributes>

	Get information on the selected object for the selected attributes.

discover <entity> <type>

	Get all the context providers for a entity and type.

configCb <host> <port> <service> <subservice>

	Config a new host and port for the remote Context Broker.

showConfigCb

	Show the current configuration of the client for the Context Broker.

configIot <host> <port> <service> <subservice>

	Config a new host and port for the remote IoT Agent.

showConfigIot

	Show the current configuration of the client for the IoT Agent.

provision <filename>

	Provision a new device using the Device Provisioning API. The device configuration is
	read from the file specified in the "filename" parameter.

provisionGroup <template> <data> <type>

	Provision a group of devices with the selected template, taking the information needed to
	fill the template from a CSV with two columns, DEVICE_ID and DEVICE_NAME. The third parameter, type
	will be used to replace the DEVICE_TYPE field in the template. All the devices will be provisioned
	to the same IoT Agent, once the templates have been fulfilled.

listProvisioned

	List all the provisioned devices in an IoT Agent.

removeProvisioned <deviceId>

	Remove the selected provisioned device from the IoT Agent, specified by its Device ID.

addGroup <filename>

	Add a new device group to the specified IoT Agent through the Configuration API. The
	body is taken from the file specified in the "filename" parameter.

listGroups

	List all the device groups created in the selected IoT Agent for the configured service

removeGroup <apiKey> <resource>

	Remove the device group corresponding to the current configured subservice.

authenticate <host> <port> <user> <password> <service>

	Authenticates to the given authentication server, and use the token in subsequent requests.

setProtocol <protocol>

	Sets the protocol to use in the requests (http or https). Defaults to http.

configMigration <host> <port> <originDb>

	Sets the configuration for a migration between a C++ IoTA and a Node.js one.

showConfigMigration

	Shows the current migration configuration.

addProtocols <protocols>

	Add a protocol translation table, in the following format:
		protocolOrigin1=protocolTarget1;protocolOrigin2=protocolTarget2...


migrate <targetDb> <service> <subservice>

	Migrate all the devices and services for the selected service and subservice into the
	specified Mongo database. To perform the migration for all the services or all the
	subservices, use the "*" value.

```

The agent session stores transient configuration data about the target Context Broker and the target IoT Agent. This configuration is independent, and can be checked with the `showConfigCb` and `showConfigIot` commands, respectively. Their values can be changed with the `configCb` and `configIot` commands respectively. The new configurations will be deleted upon startup.

#### Creating specialized testers
The command line testing tools make use of the [command-node Node.js library](https://github.com/telefonicaid/command-shell-lib) for command line
utils. In order to help creating testing tools for IoTAgents of specific protocols, all the commands of the library tester are offered as a array
that can be directly imported into other Command Line tools, using the following steps:

* Require the ´iotagent-node-lib´ command line module in your command line tool:
```
  var iotaCommands = require('iotagent-node-lib').commandLine;
```
* Initialize the command line utils (the initialization function takes two arguments, that will be explained in detail
below:
```
iotaCommands.init(configCb, configIot);
```
* Add the IOTA Lib commands to your array of commands
```
commands = commands.concat(commands, iotaCommands.commands);
```
* Execute the command line interpreter as usual:
```
clUtils.initialize(commandLine.commands, 'IoT Agent tester> ');
```

The command line module makes use of two configuration objects. Both can be shown and edited in the command line using the
provided commands, but a default value must be present.

The Context Broker configuration object holds all the information about the Context Broker where the IoT Agent to be tested
is connected. It MUST contain the following attributes:
* **host**: host where the Context Broker instance is located.
* **port**: port where the Context Broker instance is listening.
* **service**: service that will be used in all the NGSI operations.
* **subservice**: service that will be used in all the NGSI operations.

The IoT Agent configuration object holds information about the IoT Agent that is being tested. It MUST contain the following
attributes:
* **host**: host where the IoT Agent instance is located.
* **port**: port where the IoT Agent instance is listening.
* **service**: service that will be used to group devices and device information.
* **subservice**: subservice that will be used to group devices and device information.

##  <a name="development"/> Development documentation

Information about developing for the IoTAgent Library can be found at the corresponding section of the [User & Programmers Manual](docs/usermanual.md).

