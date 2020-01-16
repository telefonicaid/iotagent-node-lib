## Architecture

The following section defines the archtecture and message flow which is common to all IoT Agents which use the library.

### Device to NGSI Mapping

Each Device will be mapped as an Entity associated to a Context Provider: the Device ID will be mapped by default to the
entity ID and the type of the entity will be selected by the IoT Agent in a protocol-dependent way (e.g: with different
URLs for different types). Both the name and type will be configurable by the user, either by type configuration or with
the device preprovisioning.

Each of the measures obtained from the device should be mapped to a different attribute. The name and type of the
attribute will be configured by the user (globally for all the types in the IoT Agent configuration or in a per device
basis preprovisioning the devices). Device measures can have three different behaviors:

-   **Active attributes**: are measures that are pushed from the device to the IoT agent. This measure changes will be
    sent to the Context Broker as updateContext requests over the device entity. NGSI queries to the context broker will
    be resolved in the Broker database.

-   **Lazy attributes**: some sensors will be passive, and will wait for the IoT Agent to request for data. For those
    measures, the IoT Agent will register itself in the Context Broker as a Context Provider (for all the lazy measures
    of that device), so if any component asks the Context Broker for the value of that sensor, its request will be
    redirected to the IoT Agent (that behaves as a NGSI10 Context Provider). This operation will be synchronous from the
    customer perspective: the Context Broker won't return a response until the device has returned its response to the
    IoT Agent.

-   **Commands**: in this case, the interaction will begin by setting an attribute in the device's entity, for which the
    IoT Agent will be regitered as CP. The IoT Agent will return an immediate response to the Context Broker, and will
    be held responsible of contacting the device to perform the command itself, updating special `status` and `info`
    attributes in the entity as soon as it has any information of the command progress.

The following sequence diagram shows the different NGSI interactions an IoT Agent makes with the Context Broker,
explained in the following subsections (using the example of a OMA Lightweight M2M device).

![General ](./img/ngsiInteractions.png 'NGSI Interactions')

Be aware that the IoT Agents are only required to support NGSI10 operations `updateContext` and `queryContext` in their
standard formats (currently in JSON format; XML deprecated) but will not answer to NGSI9 operations (or NGSI convenience
operations of any kind).

#### Configurations and Device provisioning information

In order for a device to connect to the IoT Agent, the device should be provisioned (although there may be occasions
where this registration is not needed). The provision process is meant to provide the IoT Agent with the following
information:

-   **Entity translation information**: information about how to convert the data coming from the South Bound into NGSI
    information. This includes things as the entity name and type and the name and type of all the attributes that will
    be created in the entity. This includes the service and subservice the entity belongs to.

-   **Southbound protocol identification**: attributes that will identify a particular device when a new measure comes
    to the Southbound (typically the Device ID and API Key).

-   **Security information**: trust token for the devices to be inserted in a PEP Protected Context Broker.

-   **Other information**: as timezone or alternative Context Brokers.

In order to provide this information, the IoT Agent Northbound API provides two resources: Device and Configuration
provisioning.

**Configurations** may be used when a set of similar devices will be connected to the IoT Agent, to avoid provisioning
the same set of information for every device. Custom APIKeys can be only provided with the use of Configurations for
device groups. When a device is provisioned, it is assigned to a configuration _if there is one that matches its type,
its service and its subservice_. In that case, all the default information in the Configuration is merged with the
device information to create the definitive Device object that will be stored in the system.

Particular IoT Agents _may_ support autoregistration of devices into configurations, if enough information is given from
the Southbound.

#### Configurations and subservices

Configurations are meant to be a mean of simplifying the device provisioning for groups of very similar devices.
Considering that different groups of devices may be created in the same subservice that may require different
configurations, multiple configurations are allowed for each subservice. Considering the key in the association between
Device and Configuration was the triplet (service, subservice, type), all of these elements are considered mandatory.

This statement doesn't hold true for older IoT Agents, though. In older versions of the IoT Agents, each device
configuration was assigned to a particular subservice and just one configuration was allowed per subservice, so the
relation between a Device and a Configuration didn't need the type to discriminate between Configurations. That's why
for those agents, type was not a mandatory parameter.

In order to allow backward-compatibility with those agents, the IoT Agent Library now implement a compatibility mode:
the **Single Configuration Mode**, that makes the agent behave like the old agents. In this mode:

-   Each Subservice can contain just one Configuration. If a second Configuration is created for a Subservice, an error
    is raised.

-   Each Device provisioned for a Subservice is automatically assigned to the Subservice one Configuration if there is
    any.

This compatibility has to be set for the whole IoT Agent, and there is no option of having both modes simultaneously
running. Transitions from one mode to the other should be made with care, and may involve data migration.

#### Registration

Whenever a device is registered, the IoT Agent reads the device's entity information from the request or, if that
information is not in the request, from the default values for that type of device. Among this information, there should
be the list of device attributes that will be considered lazy (or passive). With this information, the IoT Agent sends a
new `registerContext` request to the Context Broker, registering itself as ContextProvider of all the lazy attributes
for the device's entity. The `registrationId` is then stored along the other device information inside the IoT Agent
device registry.

As NGSI9 does not allow the context registrations to be removed, when the device is removed from the IoT Agent, the
registration is updated to an expiration date of 1s, so it is effectively disabled. Once it has been disabled, the
device is removed from the IoT Agent's internal registry.

#### Lazy attributes

When a request for data from a lazy attribute arrives to the Context Broker, it forwards the request to the Context
Provider of that entity, in this case the IoT Agent. The IoT Agent will in turn ask the device for the information
needed, transform that information to a NGSI format and return it to the Context Broker. The latter will the forward the
response to the caller, transparently.

#### Commands

**IMPORTANT NOTE:** at the present moment, commands (both push and poll) are supported only in the case of explictely
provisioned agents. For autoprovisioned agents commands are not currently supported, although
[an issue](https://github.com/telefonicaid/iot-agent-node-lib/issues/572) has been created about this functionality.

Commands are modelled as updates over a lazy attribute. As in the case of the lazy attributes, updates over a command
will be forwarded by the Context Broker to the IoT Agent, that will in turn interact with the device to perform the
requested action. Parameters for the command will be passed inside the command value.

There are two differences with the lazy attributes:

-   First of all, for every command defined in a device, two new attributes are created in the entity with the same name
    as the command but with a prefix:

    -   `_info`: this attribute reflect the current execution status of the command. When a command request is issued by
        the Context Broker, the IoT Agent library generates this attribute with 'PENDING' value. The value of this
        attribute will be changed each time a command error or result is issued to the IoT Agent.
    -   `_result`: this attribute reflect the result of the execution of the defined command.

-   Commands can also be updated when new information about its execution arrives to the agent. This information will be
    mapped to the command's utility attributes `_info` and `_result` leaving alone the command attribute itself. The
    values for this attributes are stored locally in the Context Broker (instead of being redirected with the Context
    Provider operations).

There are two types of commands:

-   **Push commands**: when a command of this type arrives to the IoT Agent, the IoT Agent will immediately forward the
    command request to the device, translating the request to the proper protocol (that will depend on the type of IoT
    Agent). The library implement this kind of commands by offering a set functions that can be used to set an IoT
    Agent-specific handler for incoming commands. In order for this type of commands to work properly, the devices must
    be preprovisioned with an endpoint of the proper protocol, where it can be accessed by the IoT Agent who pushes de
    commits.

-   **Poll commands**: polling commands are meant to be used on those cases where the device can't be online the whole
    time waiting for commands. In this case, the IoT Agents must store the received commands, offering a way for the
    device to retrieve the pending commands upon connection. To enable this feature, the Library offers a set of
    functions to manage command storage, and a mechanism to automatically store incoming commands for those devices
    marked as 'polling devices'.

The distinction between push and poll commands will be made based on the presence of a `polling` flag in the device
provisioning data. The details on how this flag is derived for provisioning data would depend on the particular IOT
Agent implementation using this libray (in other words, there isn't any standard way of doing so). The default option
(with the flag with value `false` or not present) is to use push commands (as they were the only ones available until
the latest versions).

Polling commands could be subjected to expiration: two configuration properties `pollingExpiration` and
`pollingDaemonFrequency` can be set to start a daemon that will remove expired commands from the DB if the device is
taking too much to pick them up. See the configuration section for details.

The library does not deal with protocol transformation or South Bound communications for neither of the command types
(that's the task for those specific IoT Agents using the library).

#### Active attributes

Whenever a device proactively sends a message to the IoT Agent, it should transform its data to the appropriate NGSI
format, and send it to the Context Broker as an `updateContext` request.

### Features

These are the features an IoT Agent is supposed to expose (those not supported yet by this library are marked as
PENDING):

-   **Device registration**: multiple devices will be connected to each IoT Agent, each one of those mapped to a CB
    entity. The IoT Agent will register itself as a Context Provider for each device, answering to requests and updates
    on any lazy attribute of the device.

-   **Device information update**: whenever a device haves new measures to publish, it should send the information to
    the IoT Agent in its own native language. This message should , in turn, should be sent as an `updateContext`
    request to the Context Broker, were the measures will be updated in the device entity.

-   **Device command execution and value updates**: as a Context Provider, the IoT Agent should receive update
    operations from the Context Broker subscriptions, and relay them to the corresponding device (decoding it using its
    ID and Type, and other possible metadata). This commands will arrive as `updateContext` operations redirected from
    the Context Broker to the IoT Agent (Command execution PENDING; value updates available).

-   **Device management**: the IoT Agent should offer a device repository where the devices can be registered, holding
    data needed for the connection to the Context Broker as the following: service and subservice for the device, API
    Key the device will be using to connect to the IoT Agent, Trust token the device will be using to retrieve the
    Keystone token to connect to the Context Broker.

-   **Device provisioning**: the IoT Agent should offer an external API to make a preprovision of any devices. This
    preprovision should enable the user to customize the device's entity name and type as well as their service
    information.

-   **Type configuration**: if a device is registered without a preregistration, only its `id` and `type` attributes are
    mandatory. The IoT Agent should provide a mechanism to provide default values to the device attributes based on its
    type.

Almost all of these features are common for every agent, so they can be abstracted into a library or external module.
The objective of this project is to provide that abstraction. As all this common tasks are abstracted, the main task of
the concrete IoT Agent implementations will be to map between the native device protocol and the library API.

The following figure offers a graphical example of how a COAP IoT Agent work, ordered from the registration of the
device to a command update to the device.

![General ](./img/iotAgentLib.png 'Architecture Overview')

### The `TimeInstant` element

As part of the device to entity mapping process the IoT Agent creates and updates automatically a special timestamp.
This timestamp is represented as two different properties of the mapped entity::

-   An attribute metadata named `TimeInstant` per dynamic attribute mapped, which captures as an ISO8601 timestamp when
    the associated measurement (represented as attribute value) was observed.

-   An entity attribute named `TimeInstant` which captures as an ISO8601 timestamp when the last measurement received
    from the device was observed.

If no information about the measurement timestamp is received by the IoT Agent, the arrival time of the measurement will
be used to generate a `TimeInstant` for both the entity and the attribute's metadata.

Take into account that:

-   the timestamp of different attributes belonging to the same measurement record may not be equal.
-   the arrival time and the measurement timestamp will not be the same in the general case.
-   if `timezone` field is defined as part of the provisioning of the device or group, timestamp fields will be
    generated using it. For instance, if `timezone` is set to `America/Los_Angeles`, a possible timestamp could be
    `2025-08-05T00:35:01.468-07:00`. If `timezone` field is not defined, by default Zulu Time Zone (UTC +0) will be
    used. Following the previous example, timestamp could be `2015-08-05T07:35:01.468Z`.

E.g.: in the case of a device that can take measurements every hour of both temperature and humidity and sends the data
once every day, at midnight, the `TimeInstant` reported for each measurement will be the hour when that measurement was
observed (e.g. 4:00 PM), while all the measurements will have an arrival time around midnight. If no timestamps were
reported with such measurements, the `TimeInstant` attribute would take those values around midnight.

This functionality can be turned on and off through the use of the `timestamp` configuration flag (described in the
configuration), as well as 'timestamp' flag in device or group provision.

### Implementation decisions

Given the aforementioned requirements, there are some aspects of the implementation that were chosen, and are
particularly under consideration:

-   Aside from its configuration, the IoT Agent Lib is considered to be stateless. To be precise, the library mantains a
    state (the list of entities/devices whose information the agent can provide) but that state is considered to be
    transient. It's up to the particular implementation of the agent to consider whether it should have a persistent
    storage to hold the device information (so the internal list of devices is read from a DB) or to register the
    devices each time a device sends a measure. To this extent, two flavours of the Device Registry has been provided: a
    transient one (In-memory Registry) and a persistent one (based in MongoDB).
-   The IoT Agent does not care about the origin of the data, its type or structure. The mapping from raw data to the
    entity model, if there is any, is a responsibility of the particular IoT Agent implementation, or of another third
    party library.
