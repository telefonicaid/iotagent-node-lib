# FIWARE IoT Agent Framework

## Index

* [Overview](#overview)
* [Usage](#usage)
* [IoT Library testing](#librarytesting)
* [Configuration](#configuration)
* [Device Provisioning API](#provisioningapi)
* [Configuration API](#configurationapi)
* [Secured access to the Context Broker](#securedaccess)
* [Data mapping plugins](#datamapping)
* [Development Documentation](#development)

## <a name="overview"/> Overview
### Description
This project aims to provide a node.js module to enable IoT Agent developers to build custom agents for their devices that can 
easily connect to NGSI Context Brokers (such as [Orion](https://github.com/telefonicaid/fiware-orion) ). 

An IoT Agent is a component that lets groups of devices send their data to and be managed from a FIWARE NGSI Context Broker using their own native protocols. IoT Agents should also be able to deal with security aspects of the fiware platform (authentication and authorization of the channel) and provide other common services to the device programmer.

### Device to NGSI Mapping
Each Device will be mapped as an Entity associated to a Context Provider: the Device Id will be mapped by default to the entity ID and the type of the entity will be selected by the IoT Agent in a protocol-dependent way (e.g: with different URLs for different types). Both the name and type will be configurable by the user, either by type configuration or with the device preprovisioning).

Each of the measures obtained from the device should be mapped to a different attribute. The name and type of the attribute will be configured by the user (globally for all the types in the IoT Agent configuration or in a per device basis preprovisioning the devices). Device measures can have two different behaviors:

* **Active attributes**: are measures that are pushed from the device to the IoT agent. This measure changes will be sent to the Context Broker as updateContext requests over the device entity. NGSI queries to the context broker will be resolved in the Broker database.
* **Lazy attributes**: some sensors will be passive, and will wait for the IoT Agent to request for data. For those measures, the IoT Agent will register itself in the Context Broker as a Context Provider (for all the lazy measures of that device), so if any component asks the Context Broker for the value of that sensor, its request will be redirected to the IoT Agent (that behaves as a NGSI10 Context Provider). 

The following sequence diagram shows the different NGSI interactions an IoT Agent makes with the Context Broker, explained in the following subsections (using the example of a OMA Lightweight M2M device).

![General ](https://raw.github.com/dmoranj/iotagent-node-lib/develop/img/ngsiInteractions.png "NGSI Interactions")

Be aware that the IoT Agents are only required to support NGSI10 operations `updateContext` and `queryContext` in their standard formats (both in XML and JSON) but will not answer to NGSI9 operations (or NGSI convenience operations of any kind).

#### Registration
Whenever a device is registered, the IoT Agent reads the device's entity information from the request or, if that information is not in the request, from the default values for that type of device. Among this information, there should be the list of device attributes that will be considered lazy (or passive). With this information, the IoT Agent sends a new `registerContext` request to the Context Broker, registering itself as ContextProvider of all the lazy attributes for the device's entity. The `registrationId` is then stored along the other device information inside the IoT Agent device registry.

As NGSI9 does not allow the context registrations to be removed, when the device is removed from the IoT Agent, the registration is updated to an expiration date of 1s, so it is effectively disabled. Once it has been disabled, the device is removed from the IoT Agent's internal registry.

#### Lazy attributes
When a request for data from a lazy attribute arrives to the Context Broker, it forwards the request to the Context Provider of that entity, in this case the IoT Agent. The IoT Agent will in turn ask the device for the information needed, transform that information to a NSGI format and return it to the Context Broker. The latter will the forward the response to the caller, transparently.

#### Commands
Commands are modelled as updates over a lazy attribute. As in the case of the lazy attributes, updates over a command will be forwarded by the Context Broker to the IoT Agent, that will in turn interact with the device to perform the requested action. Parameters for the command will be passed inside the command value.

There are two differences with the lazy attributes:
* First of all, for every command defined in a device, two new attributes are created in the entity with the same name as the command but with a prefix:
	* '_status': this attribute reflect the current execution status of the command. When a command request is issued by the Context Broker, the IoT Agent library generates this attribute with 'PENDING' value. The value of this attribute will be changed each time a command error or result is issued to the IoT Agent.
	* '_result': this attribute reflect the result of the execution of the defined command.

* Commands can also be updated when new information about its execution arrives to the agent. This information will be mapped to the command's utility attributes `_status` and `_result` leaving alone the command attribute itself. The values for this attributes are stored locally in the Context Broker (instead of being redirected with the Context Provider operations).

#### Active attributes
Whenever a device proactively sends a message to the IoT Agent, it should tranform its data to the appropriate NGSI format, and send it to the Context Broker as an `updateContext` request.

### Features
These are the features an IoT Agent is supposed to expose (those not supported yet by this library are marked as PENDING):
* **Device registration**: multiple devices will be connected to each IoT Agent, each one of those mapped to a CB entity. The IoT Agent will register itself as a Context Provider for each device, answering to requests and updates on any lazy attribute of the device.
* **Device information update**: whenever a device haves new measures to publish, it should send the information to the IoT Agent in its own native language. This message should , in turn, should be sent as an `updateContext` request to the Context Broker, were the measures will be updated in the device entity. 
* **Device command execution and value updates**: as a Context Provider, the IoT Agent should receive update operations from the Context Broker subscriptions, and relay them to the corresponding device (decoding it using its ID and Type, and other possible metadata). This commands will arrive as `updateContext` operations redirected from the Context Broker to the IoT Agent (Command execution PENDING; value updates available).
* **Device management**: the IoT Agent should offer a device repository where the devices can be registered, holding data needed for the connection to the Context Broker as the following: service and subservice for the device, API Key the device will be using to connect to the IoT Agent, Trust token the device will be using to retrieve the Keystone token to connect to the Context Broker.
* **Device provisioning**: the IoT Agent should offer an external API to make a preprovision of any devices. This preprovision should enable the user to customize the device`s entity name and type as well as their service information.
* **Type configuration**: if a device is registered without a preregistration, only its `id` and `type` attributes are mandatory. The IoT Agent should provide a mechanism to provide default values to the device attributes based on its type (a JSON configuration file with the default values per type).

Almost all of these features are common for every agent, so they can be abstracted into a library or external module. The objective of this project is to provide that abstraction. As all this common tasks are abstracted, the main task of the concrete IoT Agent implementations will be to map between the native device protocol and the library API.

The following figure offers a graphical example of how a COAP IoT Agent work, ordered from the registration of the device to a command update to the device.

![General ](https://raw.github.com/dmoranj/iotagent-node-lib/develop/img/iotAgentLib.png "Architecture Overview")

### Implementation decisions
Given the aforementioned requirements, there are some aspects of the implementation that were chosen, and are particularly under consideration:
* The IoT Agent Lib will save its configuration as a text file, and it will be updated using an external API (the API consisting in a single REST resource with a JSON object, that will be in the internal configuration format).
* Aside from its text configuration, the IoT Agent Lib is considered to be stateless. To be precise, the library mantains a state (the list of entities/devices whose information the agent can provide) but that state is considered to be transient. It's up to the particular implementation of the agent to consider whether it should have a persistent storage to hold the device information (so the internal list of devices is read from a DB) or to register the devices each time a device sends a measure. To this extent, two flavours of the Device Registry has been provided: a transient one (In-memory Registry) and a persistent one (based in MongoDB).
* The IoT Agent does not care about the origin of the data, its type or structure. The mapping from raw data to the entity model, if there is any, is a responsability of the particular IoT Agent implementation, or of another third party library.

## <a name="usage"/> Usage
### Library usage
#### Stats Registry
The library provides a mechanism for the periodic reporting of stats related to the library's work. In order to activate
the use of the periodic stats, it must be configured in the config file, as described in the [Configuration](#configuration) 
section.

The Stats Registry holds two dictionaries, with the same set of stats. For each stat, one of the dictionaries holds the
historical global value and the other one stores the value since the last value reporting (or current value).

The stats library currently stores only the following values:
* **deviceCreationRequests**: number of Device Creation Requests that arrived to the API (no matter the result).
* **deviceRemovalRequests**: number of Removal Device Requests that arrived to the API (no matter the result). 
* **measureRequests**: number of times the ngsiService.update() function has been invoked (no matter the result).

More values will be added in the future to the library. The applications using the library can add values to the Stats Registry
just by using the following function:
```
iotagentLib.statsRegistry.add('statName', statIncrementalValue, callback)
```
The first time this function is invoked, it will add the new stat to the registry. Subsequent calls will add the value
to the specified stat both to the current and global measures. The stat will be cleared in each interval as usual.

#### General review
In order to use the library, add the following dependency to your package.json file:
```
"iotagent-node-lib": "*"
```
In order to use this library, first you must require it:
```
var iotagentLib = require('iotagent-node-lib');
```
The library supports four groups of features, one for each direction of the communication: 
client-to-server and server-to-client (and each flow both for the client and the server). Each feature set is defined 
in the following sections.

#### Operations
##### iotagentLib.activate()
###### Signature
```
function activate(newConfig, callback)
```
###### Description
Activates the IoT Agent to start listening for NGSI Calls (acting as a Context Provider). It also creates the device registry for the IoT Agent (based on the deviceRegistry.type configuration option).
###### Params
* newConfig: Configuration of the Context Server (described in the [Configuration](#configuration) section).

##### iotagentLib.deactivate()
###### Signature
```
function deactivate(callback)
```
###### Description
Stops the HTTP server.
###### Params

##### iotagentLib.register()
###### Signature
```
registerDevice(deviceObj, callback)
```
###### Description
Register a new device in the IoT Agent. This registration will also trigger a Context Provider registration in the Context Broker for all its lazy attributes.

The device Object can have the following attributes:
* id: Device ID of the device.
* type: type to be assigned to the device.
* name: name that will be used for the Entity representing the device in the Context Broker.
* service: name of the service associated with the device.
* subservice: name of the subservice associated with th device.
* lazy:	list of lazy attributes with their types.
* active: list of active attributes with their types.
* staticAttributes: list of NGSI attributes to add to the device entity 'as is' in updates, queries and registrations.
* internalAttributes: optional section with free format, to allow specific IoT Agents to store information along with the devices in the Device Registry.


The device id and type are required fields for any registration. The rest of the attributes are optional, but, if they are not present in the function call arguments, the type must be registered in the configuration, so the service can infer their default values from the configured type. If an optional attribute is not given in the parameter list and there isn't a default configuration for the given type, a TypeNotFound error is raised.

If the device has been previously preprovisioned, the missing data will be completed with the values from the registered device.

###### Params
 * deviceObj: object containing all the information about the device to be registered (mandatory).

##### iotagentLib.unregister()
###### Signature
```
function unregisterDevice(id, callback)
```
###### Description
Unregister a device from the Context broker and the internal registry.
###### Params
 * id: Device ID of the device to register.
 
##### iotagentLib.update()
###### Signature
```
updateValue(deviceId, resource, apikey, attributes, deviceInformation, callback)
```
###### Description
Launches the updating process, getting the security token in case the authorization sequence is enabled. This method
can be invoked with an externally added deviceInformation object to overwrite the information on the configuration
(for preregistered devices).

###### Params
 * deviceId: Device ID of the device to register.
 * resource: Resource name of the endpoint the device is calling.
 * apikey: Apikey the device is using to send the values (can be the empty string if none is needed).
 * attributes: Attribute array containing the values to update.
 * deviceInformation: Device information object (containing security and service information).

##### iotagentLib.setCommandResult()
###### Signature
```
setCommandResult(deviceId, resource, apikey, commandName, commandResult, status, deviceInformation, callback)
```
###### Description
Update the result of a command in the Context Broker. The result of the command has two components: the result
of the command itself will be represented with the sufix '_result' in the entity while the status is updated in the
attribute with the '_status' sufix.

###### Params
 * deviceId: Device ID of the device to register.
 * resource: Resource name of the endpoint the device is calling.
 * apikey: Apikey the device is using to send the values (can be the empty string if none is needed).
 * commandName: Name of the command whose result is being updated.
 * commandResult: Result of the command in string format.
 * deviceInformation: Device information, including security and service information. (optional).


##### iotagentLib.listDevices()
###### Signature
```
function listDevices(service, subservice, limit, offset, callback)
```
###### Description
Return a list of all the devices registered in the specified service and subservice. This function can be invoked in 
three different ways:
* with just one parameter (the callback)
* with three parameters (service, subservice and callback) 
* or with five parameters (including limit and offset).
###### Params
* service: service from where the devices will be retrieved.
* subservice: subservice from where the devices will be retrieved.
* limit: maximum number of results to retrieve (optional).
* offset: number of results to skip from the listing (optional).

##### iotagentLib.setDataUpdateHandler()
###### Signature
```
function setDataUpdateHandler(newHandler)
```
###### Description
Sets the new user handler for Entity update requests. This handler will be called whenever an update request arrives with the following parameters: (id, type, attributes, callback). The handler is in charge of updating the corresponding values in the devices with the appropriate protocol. 

Once all the updates have taken place, the callback must be invoked with the updated Context Element. E.g.:
```
    callback(null, {
        type: 'TheType',
        isPattern: false,
        id: 'EntityID',
        attributes: [
        	{
        		name: 'lumniscence',
        		type: 'Lumens',
        		value: '432'
        	}
        ]
    });
```

In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each entity, and all the results will be combined into a single response.
###### Params
 * newHandler: User handler for update requests

##### iotagentLib.setDataQueryHandler()
###### Signature
```
function setDataQueryHandler(newHandler)
```
###### Description
Sets the new user handler for Entity query requests. This handler will be called whenever a query request arrives, with the following parameters: (id, type, attributes, callback). The handler must retrieve all the corresponding information from the devices and return a NGSI entity with the requested values.

The callback must be invoked with the updated Context Element, using the information retrieved from the devices. E.g.:
```
    callback(null, {
        type: 'TheType',
        isPattern: false,
        id: 'EntityID',
        attributes: [
        	{
        		name: 'lumniscence',
        		type: 'Lumens',
        		value: '432'
        	}
        ]
    });
```

In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each entity, and all the results will be combined into a single response.
###### Params
 * newHandler: User handler for query requests.

##### iotagentLib.setNotificationHandler()
###### Signature
```
function setNotificationHandler(newHandler)
```
###### Description
Sets the new handler for incoming notifications. The notifications are sent by the Context Broker based on the IOTA subscriptions created
with the subscribe() function. 
 
The handler must adhere to the following signature:
```
function mockedHandler(device, data, callback)
```
The `device` parameter contains the device object corresponding to the entity whose changes were notified
with the incoming notification. Take into account that multiple entities may be modified with each single notification.
The handler will be called once for each one of those entities.

The `data` parameter is an array with all the attributes that were requested in the subscription and its respective
values.

The handler is expected to call its callback once with no parameters (failing to do so may cause unexpected behaviors in the IOTA).


##### iotagentLib.setConfigurationHandler()
###### Signature
```
function setConfigurationHandler(newHandler)
```
###### Description
Sets the new user handler for the configuration updates. This handler will be called every time a new configuration is created or an old configuration is updated. 

The handler must adhere to the following signature:
```
function(newConfiguration, callback)
```
The `newConfiguration` parameter will contain the newly created configuration. The handler is expected to call its callback with no parameters (this handler should only be used for reconfiguration purposes of the IOT Agent).

For the cases of multiple updates (a single Device Configuration POST that will create several device groups), the handler will be called once for each of the configurations (both in the case of the creatinos and the updates).

##### iotagentLib.listDevices()
###### Signature
```
function listDevices(callback)
function listDevices(limit, offset, callback)
```
###### Description
Return a list of all the devices registered in the system. If invoked with three parameters, it limits the number of devices to return and the first device to be returned.
###### Params
* limit: maximum number of devices to return in the results.
* offset: number of results to skip before returning the results.
##### iotagentLib.getDevice()
###### Signature
```
function getDevice(deviceId, callback)
```
###### Description
Retrieve all the information about a device from the device registry.
###### Params
* deviceId: ID of the device to be found.

##### iotagentLib.getDeviceByName()
###### Signature
```
function getDeviceByName(name, callback)
```
###### Description
Retrieve a device from the registry based on its entity name.

###### Params
* deviceName: Name of the entity associated to a device.

##### iotagentLib.getDevicesByAttribute()
###### Signature
```
function getDevicesByAttribute(name, value, callback)
```
###### Description
Retrieve all the devices having an attribute named `name` with value `value`.

###### Params
* name: name of the attribute to match.
* value: value to match in the attribute.

##### iotagentLib.getConfiguration()
###### Signature
```
function getConfiguration(resource, apikey, callback)
```
###### Description
Gets the device group identified by the given (`resource`, `apikey`) pair.

###### Params
* resource: representation of the configuration in the IoT Agent (dependent on the protocol) .
* apikey: special key the devices will present to prove they belong to a particular configuration.


##### iotagentLib.findConfiguration()
###### Signature
```
function findConfiguration(service, subservice, callback)
```
###### Description
Find a device group based on its service and subservice.

###### Params
* service: name of the service of the configuration.
* subservice: name of the subservice of the configuration.

##### iotagentLib.subscribe()
###### Signature
```
function subscribe(device, triggers, content, callback)
```
###### Description
Creates a subscription for the IoTA to the entity representing the selected device. 

###### Params
* device:       Object containing all the information about a particular device.
* triggers:     Array with the names of the attributes that would trigger the subscription
* content:      Array with the names of the attributes to retrieve in the notification.

##### iotagentLib.unsuscribe()
###### Signature
```
function unsubscribe(device, id, callback)
```
###### Description
Removes a single subscription from the selected device, identified by its id. 

###### Params
* device: Object containing all the information about a particular device.
* id: ID of the subscription to remove.

## <a name="librarytesting"/> IoT Library Testing
### Agent Console
A command line client to experiment with the library is packed with it. The command line client can be started using the following command:
```
bin/agentConsole.js
```
The client offers an API similar to the one offered by the library: it can start and stop an IoT agent, register and unregister devices, send measures mimicking the device and receive updates of the device data. Take into account that, by default, the console uses the same `config.js` file than the IoT Agent.

The command line client creates a console that offers the following options:

```
start  

	Start the IoT Agent

stop  

	Stop the IoT Agent

register <id> <type>  

	Register a new device in the IoT Agent. The attributes to register will be extracted from then
 	type configuration

unregister <id> <type>  

	Unregister the selected device

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

removeGroup  

	Remove the device group corresponding to the current configured subservice.

authenticate <host> <port> <user> <password> <service>  

	Authenticates to the given authentication server, and use the token in subsequent requests.

exit  

	Exit the process
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


## <a name="configuration"/> Configuration
The `activate()` function that starts the IoT Agent receives as single parameter with the configuration for the IoT Agent. The Agent Console reads the same configuration from the `config.js` file.

### Global Configuration
These are the parameters that can be configured in the global section:
* **logLevel**: minimum log level to log. May take one of the following values: DEBUG, INFO, ERROR, FATAL. E.g.: 'DEBUG'.
* **contextBroker**: connection data to the Context Broker (host and port). E.g.: 
```
	{
	host: '192.168.56.101',
	port: '1026'
    	}
```
* **server**: configuration used to create the Context Server (port where the IoT Agent will be listening as a Context Provider and base root to prefix all the paths). The `port` attribute is required. If no `baseRoot` attribute is used, '/' is used by default. E.g.: 
```
	{
	baseRoot: '/',
        port: 4041
    	}
```    	 
* **stats**: configure the periodic collection of statistics. Use `interval` in miliseconds to set the time between stats writings.
```
    stats: {
        interval: 100
    }
```
* **authentication**: authentication data, for use in retrieving tokens for devices with a trust token (just needed in scenarios with security enabled in the Context Broker side). E.g.:
```	
	{
        host: 'localhost',
        port: '5000',
        user: 'iotagent',
        password: 'iotagent'
	}
```
* **deviceRegistry**: type of Device Registry to create. Currently, two values are supported: `memory` and `mongodb`. If the former is configured, a transient memory-based device registry will be used to register all the devices. This registry will be emptied whenever the process is restarted. If the latter is selected, a MongoDB database will be used to store all the device information, so it will be persistent from one execution to the other. Mongodb databases must be configured in the `mongob` section (as described bellow). E.g.:
```
{
  type: 'mongodb'
}
```
* **mongodb**: configures the MongoDB driver for those repositories with 'mongodb' type. E.g.:
```
{
  host: 'localhost',
  port: '27017',
  db: 'iotagent'
}
```
* **types**: See **Type Configuration** in the [Configuration API](#configurationapi) section below.
* **service**: default service for the IoT Agent. If a device is being registered, and no service information comes with the device data, and no service information is configured for the given type, the default IoT agent service will be used instead. E.g.: 'smartGondor'.
* **subservice**: default subservice for the IoT Agent. If a device is being registered, and no subservice information comes with the device data, and no subservice information is configured for the given type, the default IoT agent subservice will be used instead. E.g.: '/gardens'.
* **providerUrl**: URL to send in the Context Provider registration requests. Should represent the external IP of the deployed IoT Agent (the IP where the Context Broker will redirect the NGSI requests). E.g.: 'http://192.168.56.1:4041'.
* **deviceRegistrationDuration**: duration of the registrations as Context Providers, in [ISO 8601](http://en.wikipedia.org/wiki/ISO_8601) standard format. E.g.: 'P1M'.
* **iotaVersion**: indicates the version of the IoTA that will be displayed in the about method (it should be filled automatically by each IoTA).
* **appendMode**: if this flag is activated, the update requests to the Context Broker will be performed always with APPEND type, instead of the default UPDATE. This
have implications in the use of attributes with Context Providers, so this flag should be used with care.
* **dieOnUnexpectedError**: if this flag is activated, the IoTAgent will not capture global exception, thus dying upon any unexpected error.
* **timestamp**: if this flag is activated, the IoT Agent will add a 'TimeInstant' metadata attribute to all the attributes updateded from device information. 

## <a name="aboutapi"/> About API
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

## <a name="provisioningapi"/> Device Provisioning API
### Overview
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

### Device model
| Attribute           | Definition                                     | Example of value                      |
| ------------------- |:---------------------------------------------- |:------------------------------------- |
| device_id    	      | Device ID that will be used to identify the device. | UO834IO   |
| service             | Name of the service the device belongs to (will be used in the fiware-service header).  | smartGondor |
| service_path        | Name of the subservice the device belongs to (used in the fiware-servicepath header). | /gardens |
| entity_name         | Name of the entity representing the device in the Context Broker	| ParkLamplight12 |
| entity_type         | Type of the entity in the Context Broker | Lamplights |
| timezone            | Time zone of the sensor if it has any | America/Santiago |
| protocol            | Name of the device protocol, for its use with an IoT Manager. | America/Santiago |
| attributes          | List of active attributes of the device	| `[ { "name": "attr_name", "type": "string" } ]` |
| lazy                | List of lazy attributes of the device	| `[ { "name": "attr_name", "type": "string" } ]` |
| commands            | List of commands of the device	| `[ { "name": "attr_name", "type": "string" } ]` |
| internal_attributes | List of internal attributes with free format for specific IoT Agent configuration | LWM2M mappings from object URIs to attributes |
| static_attributes   | List of static attributes to append to the entity. All the updateContext requests to the CB will have this set of attributes appended.	| `[ { "name": "attr_name", "type": "string" } ]` |

### Attribute lists
In the device model there are three list of attributes that can be declared: attributes, lazy and commands. All of them 
have the same syntax, an object containing the following attributes:
* **object_id** (optional): name of the attribute as coming from the device.
* **name** (mandatory): id of the attribute in the target entity in the Context Broker.
* **type** (mandatory): name of the type of the attribute in the target entity.

### API Actions
#### POST /iot/devices
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

#### GET /iot/devices
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

#### GET /iot/devices/:deviceId
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

#### DELETE /iot/devices/:deviceId
Remove a device from the device registry. No payload is required or received.

Returns: 
* 200 OK if successful, with no payload.
* 404 NOT FOUND if the device was not found in the database.
* 500 SERVER ERROR if there was any error not contemplated above.

#### PUT /iot/devices/:deviceId
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

## <a name="configurationapi"/> Configuration API
For some services, there will be no need to provision individual devices, but it will make more sense to provision different device groups, each of one mapped to a different type of entity in the context broker. How the type of entity is assigned to a device will depend on the Southbound technology (e.g.: path, port, APIKey...). Once the device has an assigned type, its configuration values can be extracted from those of the type.

The IoT Agents provide two means to define those device groups:
* Static **Type Configuration**: configuring the `ngsi.types` property in the `config.js` file.
* Dinamic **Configuration API**: making use of the API URLS in the configuration URI, `/iot/services`. Please, note that the configuration API manage servers under an URL that requires the `server.name` parameter to be set (the name of the IoT Agent we are using). If no name is configured `default` is taken as the default one.

Both approaches provide the same configuration information for the types (and they, in fact, end up in the same configuration collection), but, for the moment, the file and API nomenclatures differ (to be fixed soon, issue #33). 

Both approaches are better described in the sections bellow. 

### Configuration API
The following sections show the available operations for the Configuration API. Every operation in the API require the `fiware-service` and `fiware-servicepath` to be defined; the operations are performed in the scope of those headers. For the list case, the special wildcard servicepath can be specified, '/*'. In this case, the operation applies to all the subservices of the service given by the `fiware-service` header.

For every Device Group, the pair (resource, apikey) *must* be unique (as it is used to identify which group to assign to which device). Those operations of the API targeting specific resources will need the use of the `resource` and `apikey` parameters to select the apropriate instance.

#### Device Group Model
Device groups contain the following attributes:
* **service**: service of the devices of this type.
* **subservice**: subservice of the devices of this type.
* **resource**: string representing the Southbound resource that will be used to assign a type to a device (e.g.: pathname in the southbound port).
* **apikey**: API Key string.
* **type**: name of the type to assign to the group.
* **trust**: trust token to use for secured access to the Context Broker for this type of devices (optional; only needed for secured scenarios).
* **cbHost**: Context Broker connection information. This options can be used to override the global ones for specific types of devices.
* **lazy**: list of lazy attributes of the device. For each attribute, its `name` and `type` must be provided.
* **commands**: list of commands attributes of the device. For each attribute, its `name` and `type` must be provided.
* **active**: list of active attributes of the device. For each attribute, its `name` and `type` must be provided.
* **staticAttributes**: this attributes will be added to all the entities of this group 'as is'.
* **internalAttributes**: optional section with free format, to allow specific IoT Agents to store information along with the devices in the Device Registry.

#### POST /iot/services
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

#### GET /iot/services
Retrieves device groups from the database. If the servicepath header has de wildcard expression, '/*', all the subservices for the service are returned. The specific subservice parameters are returned in any other case.

Returns: 
* 200 OK if successful, returning a device group body.
* 400 MISSING_HEADERS if any of the mandatory headers is not present.
* 500 SERVER ERROR if there was any error not contemplated above.

#### PUT /iot/services
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

#### DELETE /iot/services
Removes a device group configuration from the DB, specified by the `resource` and `apikey` query parameters. 

Returns: 
* 200 OK if successful.
* 400 MISSING_HEADERS if any of the mandatory headers is not present.
* 500 SERVER ERROR if there was any error not contemplated above.

### Type Configuration
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

## <a name="securedaccess"/> Secured access to the Context Broker
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

## <a name="datamapping"/> Data mapping plugins
### Overview
The IoT Agent Library provides a plugin mechanism in order to facilitate reusing code that makes small transformations on 
incoming data (both from the device and from the context consumers). This mechanism is based in the use of middlewares,
i.e.: small pieces of code that receive and return an `entity`, making as many changes as they need, but taking care of
returning a valid entity, that can be used as the input for other middlewares; this way, allo those pieces of 
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

### Development
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

### Provided plugins
The library provides some plugins out of the box, in the `dataPlugins` collection. In order to load any of them, just
use the `addQueryMiddleware` and `addUpdateMiddleware` functions with the selected plugin, as in the example:
```
var iotaLib = require('iotagent-node-lib');

iotaLib.addUpdateMiddleware(iotaLib.dataPlugins.compressTimestamp.update);
iotaLib.addQueryMiddleware(iotaLib.dataPlugins.compressTimestamp.query);
```

#### Timestamp Compression plugin (compressTimestamp)
This plugins change all the timestamp attributes found in the entity, and all the timestamp metadata found in any 
attribute, from the basic complete calendar timestamp of the ISO8601 (e.g.: 20071103T131805) to the extended
complete calendar timestamp (e.g.: +002007-11-03T13:18). The middleware expects to receive the basic format in 
updates and return it in queries (and viceversa, receive the extended one in queries and return it in updates).  

#### Attribute Alias plugin (attributeAlias)
In the Device provision, an id can be specified for each attribute, along with its name. The Id can be used then as 
the left part of a mapping from attribute names in the south bound to attribute names in the North Bound. If the id and
name attributes are used in this way, this plugin makes the translation from one to the other automatically.

## <a name="development"/> Development documentation
### Branches and release process
The project have two standard branches:
* **master**: is the branch with the code of the last stable release.
* **develop**: is the official branch for current development.

All the contributions to the repository by the developer team will be developed in a branch created from the `develop` branch, and will be merged with the same one, with a publicly reviewed Pull Request. External contributions to the repository must also be performed against `develop`. No contribution will be accepted targeting `master`.

Releases will be created periodically from develop contents. The process of a release will involve:
* Creating a tag for the release.
* Merging `develop` into `master`.
* Changing the version number in `develop`.
* Publishing `master` to the NPM registry.

### Project build
The project is managed using Grunt Task Runner.

For a list of available task, type
```bash
grunt --help
```

The following sections show the available options in detail.

### Testing
[Mocha](http://visionmedia.github.io/mocha/) Test Runner + [Chai](http://chaijs.com/) Assertion Library + [Sinon](http://sinonjs.org/) Spies, stubs.

The test environment is preconfigured to run [BDD](http://chaijs.com/api/bdd/) testing style with
`chai.expect` and `chai.should()` available globally while executing tests, as well as the [Sinon-Chai](http://chaijs.com/plugins/sinon-chai) plugin.

Module mocking during testing can be done with [proxyquire](https://github.com/thlorenz/proxyquire)

To run tests, type
```bash
grunt test
```

Tests reports can be used together with Jenkins to monitor project quality metrics by means of TAP or XUnit plugins.
To generate TAP report in `report/test/unit_tests.tap`, type
```bash
grunt test-report
```

### Coding guidelines
jshint, gjslint

Uses provided .jshintrc and .gjslintrc flag files. The latter requires Python and its use can be disabled
while creating the project skeleton with grunt-init.
To check source code style, type
```bash
grunt lint
```

Checkstyle reports can be used together with Jenkins to monitor project quality metrics by means of Checkstyle
and Violations plugins.
To generate Checkstyle and JSLint reports under `report/lint/`, type
```bash
grunt lint-report
```


### Continuous testing

Support for continuous testing by modifying a src file or a test.
For continuous testing, type
```bash
grunt watch
```


### Source Code documentation
dox-foundation

Generates HTML documentation under `site/doc/`. It can be used together with jenkins by means of DocLinks plugin.
For compiling source code documentation, type
```bash
grunt doc
```


### Code Coverage
Istanbul

Analizes the code coverage of your tests.

To generate an HTML coverage report under `site/coverage/` and to print out a summary, type
```bash
# Use git-bash on Windows
grunt coverage
```

To generate a Cobertura report in `report/coverage/cobertura-coverage.xml` that can be used together with Jenkins to
monitor project quality metrics by means of Cobertura plugin, type
```bash
# Use git-bash on Windows
grunt coverage-report
```


### Code complexity
Plato

Analizes code complexity using Plato and stores the report under `site/report/`. It can be used together with jenkins
by means of DocLinks plugin.
For complexity report, type
```bash
grunt complexity
```

### PLC

Update the contributors for the project
```bash
grunt contributors
```


### Development environment

Initialize your environment with git hooks.
```bash
grunt init-dev-env 
```

We strongly suggest you to make an automatic execution of this task for every developer simply by adding the following
lines to your `package.json`
```
{
  "scripts": {
     "postinstall": "grunt init-dev-env"
  }
}
``` 


### Site generation

There is a grunt task to generate the GitHub pages of the project, publishing also coverage, complexity and JSDocs pages.
In order to initialize the GitHub pages, use:

```bash
grunt init-pages
```

This will also create a site folder under the root of your repository. This site folder is detached from your repository's
history, and associated to the gh-pages branch, created for publishing. This initialization action should be done only
once in the project history. Once the site has been initialized, publish with the following command:

```bash
grunt site
```

This command will only work after the developer has executed init-dev-env (that's the goal that will create the detached site).

This command will also launch the coverage, doc and complexity task (see in the above sections).

