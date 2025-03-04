## Architecture

The following section defines the architecture and message flow which is common to all IoT Agents which use the library.

### Device to NGSI Mapping

The following sequence diagram shows the different NGSI interactions an IoT Agent makes with the Context Broker,
explained in the following subsections (using the example of a OMA Lightweight M2M device).

![General ](../img/ngsiInteractions.png 'NGSI Interactions')

Be aware that the IoT Agents are only required to support NGSI10 operations `updateContext` and `queryContext` in their
standard formats (currently in JSON format; XML deprecated) but will not answer to NGSI9 operations (or NGSI convenience
operations of any kind).

#### Config groups and Device provisioning information

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

**Config groups** may be used when a set of similar devices will be connected to the IoT Agent, to avoid provisioning
the same set of information for every device. Custom APIKeys can be only provided with the use of config group for
device groups. When a device is provisioned, it is assigned to a configuration _if there is one that matches its type,
its service and its subservice_. In that case, all the default information in the Configuration is merged with the
device information to create the definitive Device object that will be stored in the system.

Particular IoT Agents _may_ support autoregistration of devices into config groups, if enough information is given from
the Southbound.

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

**IMPORTANT NOTE:** at the present moment, commands (both push and poll) are supported only in the case of explicitly
provisioned agents. For autoprovisioned agents commands are not currently supported, although
[an issue](https://github.com/telefonicaid/iotagent-node-lib/issues/572) has been created about this functionality.

Commands are modelled as updates over a lazy attribute. As in the case of the lazy attributes, updates over a command
will be forwarded by the Context Broker to the IoT Agent, that will in turn interact with the device to perform the
requested action. Parameters for the command will be passed inside the command `value` along with any `metadata`, and in
the case of an NGSI-LD command a `datasetId` if provided.

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

![General ](../img/iotAgentLib.png 'Architecture Overview')
