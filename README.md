# FIWARE IoT Agent Framework

## Index

* [Overview](#overview)
* [Usage](#usage)
* [IoT Library testing](#librarytesting)
* [Configuration](#configuration)
* [Device Provisioning API](#provisioningapi)
* [Configuration API](#configurationapi)
* [Secured access to the Context Broker](#securedaccess)
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
Whenever a device is registered, the IoT Agent reads the device's entity information from the request or, it that information is not in the request, from the default values for that type of device. Among this information, theres should be the list of device attributes that will be considered lazy (or passive). With this information, the IoT Agent sends a new `registerContext` request to the Context Broker, registering itself as ContextProvider of all the lazy attributes for the device's entity. The `registrationId` is then stored along the other device information inside the IoT Agent device regitry.

As NGSI9 does not allow the context registrations to be removed, when the device is removed from the IoT Agent, the registration is updated to an expiration date of 1s, so it is effectively disabled. Once it has been disabled, the device is removed from the IoT Agent's internal registry.

#### Lazy attributes
When a request for data from a lazy attribute arrives to the Context Broker, it forwards the request to the Context Provider of that entity, in this case the IoT Agent. The IoT Agent will in turn ask the device for the information needed, transform that information to a NSGI format and return it to the Context Broker. The latter will the forward the response to the caller, transparently.

#### Commands
Commands are modelled as updates over a lazy attribute. As in the case of the lazy attributes, updates over a command will be forwarded by the Context Broker to the IoT Agent, that will in turn interact with the device to perform the requested action. Parameters for the command will be passed inside the command value.

It's up to the agent whether to make the update synchronous or asynchronous. In the latter case, the update request will end in a `200OK` response, and the IoT Agent will have to create a new attribute in the device entity (with the same name of the command attribute and the suffix `_status`) with the current status of the command and subsequent updates of the same.

NOTE: this behavior is not yet implemented in the current version and it's only described for documentation.

#### Active attributes
Whenever a device proactively sends a message to the IoT Agent, it should tranform its data to the appropriate NGSI format, and send it to the Context Broker as an `updateContext` request.

### Features
These are the features an IoT Agent is supposed to expose (those not supported yet by this library are marked as PENDING):
* **Device registration**: multiple devices will be connected to each IoT Agent, each one of those mapped to a CB entity. The IoT Agent will register itself as a Context Provider for each device, answering to requests and updates on any lazy attribute of the device.
* **Device information update**: whenever a device haves new measures to publish, it should send the information to the IoT Agent in its own native language. This message should , in turn, should be sent as an `updateContext` request to the Context Broker, were the measures will be updated in the device entity. 
* **Device command execution and value updates**: as a Context Provider, the IoT Agent should receive update operations from the Context Broker subscriptions, and relay them to the corresponding device (decoding it using its ID and Type, and other possible metadata). This commands will arrive as `updateContext` operations redirected from the Context Broker to the IoT Agent (Command execution PENGIND; value updates available).
* **Device management**: the IoT Agent should offer a device repository where the devices can be registered, holding data needed for the connection to the Context Broker as the following: service and subservice for the device, API Key the device will be using to connect to the IoT Agent, Trust token the device will be using to retrieve the Keystone token to connect to the Context Broker.
* **Device provisioning**: the IoT Agent should offer an external API to make a preprovision of any devices. This preprovision should enable the user to customize the device`s entity name and type as well as their service information.
* **Type configuration**: if a device is registered without a preregistration, only its `id` and `type` attributes are mandatory. The IoT Agent should provide a mechanism to provide default values to the device attributes based on its type (a JSON configuration file with the default values per type).

Almost all of these features are common for every agent, so they can be abstracted into a library or external module. The objective of this project is to provide that abstraction. As all this common tasks are abstracted, the main task of the concrete IoT Agent implementations will be to map between the native device protocol and the library API.

The following figure offers a graphical example of how a COAP IoT Agent work, ordered from the registration of the device to a command update to the device.

![General ](https://raw.github.com/dmoranj/iotagent-node-lib/develop/img/iotAgentLib.png "Architecture Overview")

### Implementation decisions
Given the aforementioned requirements, there are some aspects of the implementation that were chosen, and are particularly under consideration:
* The IoT Agent Lib will save its configuration as a text file, and it will be updated using an external API (the API consisting in a single REST resource with a JSON object, that will be in the internal configuration format).
* Aside from its text configuration, the IoT Agent Lib is considered to be stateless. To be precise, the library mantains a state (the list of entities/devices whose information the agent can provide) but that state is considered to be transient. It's up to the particular implementation of the agent to consider whether it should have a persistent storage to hold the device information (so the internal list of devices is read from a DB) or to register the devices each time a device sends a measure. To this extent, two flavours of the Device Registry has been provided: a transient one (In-memory Registyr) and a persistent one (based in MongoDB).
* The IoT Agent does not care about the origin of the data, its type or structure. The mapping from raw data to the entity model, if there is any, is a responsability of the particular IoT Agent implementation, or of another third party library.

## <a name="usage"/> Usage
### Library usage
#### General review
In order to use the library, add the following dependency to your package.json file:
```
"iotagent-node-lib": "*"
```
In order to use this library, first you must require it:
```
var iotagentLib = require('iotagent-node-lib');
```
As a Lightweight M2M Server, the library supports four groups of features, one for each direction of the communication: client-to-server and server-to-client (and each flow both for the client and the server). Each feature set is defined in the following sections.

#### Operations
##### iotagentLib.activate
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
updateValue(deviceId, deviceType, attributes, deviceInformation, callback)
```
###### Description
Launches the updating process, getting the security token in case the authorization sequence is enabled. This method
can be invoked with an externally added deviceInformation object to overwrite the information on the configuration
(for preregistered devices).

###### Params
 * deviceId: Device ID of the device to register.
 * deviceType: Type of device to register.
 * attributes: Attribute array containing the values to update.
 * deviceInformation: Device information object (containing security and service information).

##### iotagentLib.listDevices()
###### Signature
```
function listDevices(callback)
```
###### Description
Return a list of all the devices registered in the system.
###### Params

##### iotagentLib.setDataUpdateHandler()
###### Signature
```
function setUpdateHandler(newHandler)
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
function setQueryHandler(newHandler)
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
 
##### iotagentLib.listDevices()
###### Signature
```
function listDevices(callback)
```
###### Description
Return a list of all the devices registered in the system. 
###### Params

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

## <a name="librarytesting"/> IoT Library testing
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
The library also offers a Context Broker client that can be used to simulate queries and other operations to the Context Broker used by the IoT Agent, triggering Context Provider forwardings for lazy attributes and checking the appropriate values for active ones.

The tester can be started with the following command, from the root folder of the project:
```
bin/iotAgentTester.js
```
From the command line, the `help` command can be used to show a description of the currently supported features. These are the following:
```
update <entity> <type> <attributes>  

	Update the values of the defined set of attributes, using the following format: name:type=value(,name:type=value)*

append <entity> <type> <attributes>  

	Append a new Entity with the defined set of attributes, using the following format: name:type=value(,name:type=value)*

query <entity> <type>  

	Get all the information on the selected object.

queryAttr <entity> <type> <attributes>  

	Get information on the selected object for the selected attributes.

discover <entity> <type>  

	Get all the context providers for a entity and type.

config <host> <port> <service> <subservice>  

	Config a new host and port for the remote Context Broker.

showConfig  

	Show the current configuration of the client.

provision <host> <port> <filename>  

	Provision a new device using the Device Provisioning API. The device configuration is 
	read from the script location.
```
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
* **authentication**: authentication data, for use in retrieving tokens for devices with a trust token (just needed in scenarios with security enabled in the Context Broker side). E.g.:
```	
	{
        host: 'localhost',
        port: '5000',
        user: 'iotagent',
        password: 'iotagent'
	}
```
* **deviceRegistry**: type of Device Registry to create. Currently, two values are supported: `memory` and `mongodb`. If the former is configured, a transient memory-based device registry will be used to register all the devices. This registry will be emptied whenever the process is restarted. If the latter is selected, a MongoDB database will be used to store all the device information, so it will be persistent from one execution to the other (take into account that, in the case of the MongoDB registry, multiple fields has to be completed). E.g.:
```
	{
            type: 'mongodb',
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

## <a name="provisioningapi"/> Device Provisioning API
### Overview
The IoT Agents offer a provisioning API where devices can be preregistered, so all the information about service and subservice mapping, security information and attribute configuration can be specified in a per device way instead of relaying on the type configuration. The following section specified the format of the device payload; this will be the payload accepted by all the write operations and that will be returned by all the read operations.

### Device model
| Attribute           | Definition                                     | Example of value                      |
| ------------------- |:---------------------------------------------- |:------------------------------------- |
| name       	      | Device ID that will be used to identify the device. | UO834IO   |
| service             | Name of the service the device belongs to (will be used in the fiware-service header).  | smartGondor |
| service_path        | Name of the subservice the device belongs to (used in the fiware-servicepath header). | /gardens |
| entity_name         | Name of the entity representing the device in the Context Broker	| ParkLamplight12 |
| entity_type         | Type of the entity in the Context Broker | Lamplights |
| timezone            | Time zone of the sensor if it has any | America/Santiago |
| attributes          | List of active attributes of the device	| `[ { "name": "attr_name", "type": "string" } ]` |
| static_attributes   | List of active lazy attributes of the device	| `[ { "name": "attr_name", "type": "string" } ]` |
| commands            | List of active commands of the device	| `[ { "name": "attr_name", "type": "string" } ]` |
| internal_attributes | List of internal attributes with free format for specific IoT Agent configuration | LWM2M mappings from object URIs to attributes |

### API Actions
#### POST /iot/devices
Provision a new device in the IoT Agent's device registry. Takes a Device in JSON format as the payload. 

Returns: 
* 200 OK if successful.
* 500 SERVER ERROR if there was any error not contemplated above.

#### GET /iot/devices
Returns a list of all the devices in the device registry with all its data.

Returns: 
* 200 OK if successful, and the selected Device payload in JSON format.
* 404 NOT FOUND if the device was not found in the database.
* 500 SERVER ERROR if there was any error not contemplated above.

#### GET /iot/devices/:deviceId
Returns all the information about a particular device.

Returns: 
* 200 OK if successful, and the selected Device payload in JSON format.
* 404 NOT FOUND if the device was not found in the database.
* 500 SERVER ERROR if there was any error not contemplated above.

#### DELETE /iot/devices/:deviceId
Remove a device from the device registry.

Returns: 
* 200 OK if successful, with no payload.
* 404 NOT FOUND if the device was not found in the database.
* 500 SERVER ERROR if there was any error not contemplated above.

#### PUT /iot/devices/:deviceId
Changes the stored values for the device with the provided Device payload. 

Returns: 
* 200 OK if successful, with no payload.
* 404 NOT FOUND if the device was not found in the database.
* 500 SERVER ERROR if there was any error not contemplated above.

## <a name="configurationapi"/> Configuration API
For some services, there will be no need to provision individual devices, but it will make more sense to provision different device groups, each of one mapped to a different type of entity in the context broker. How the type of entity is assigned to a device will depend on the Southbound technology (e.g.: path, port, APIKey...). Once the device has an assigned type, its configuration values can be extracted from those of the type.

The IoT Agents provide two means to define those device groups:
* Static **Type Configuration**: configuring the `ngsi.types` property in the `config.js` file.
* Dinamic **Configuration API**: making use of the API URLS in the configuration URI, `/iot/agent/:agentName/services`.

Both approaches are better described in the sections bellow.

### Configuration API



### Type Configuration
The IoT Agent can be configured to expect certain kinds of devices, with preconfigured sets of attributes, service information, security information and other attributes. The `types` attribute of the configuration is a map, where the key is the type name and the value is an object containing all the type information. Each type can has the following information configured:

* service: service of the devices of this type.
* subservice: subservice of the devices of this type.
* active: list of active attributes of the device. For each attribute, its `name` and `type` must be provided.
* lazy: list of lazy attributes of the device. For each attribute, its `name` and `type` must be provided.
* commands: list of commands attributes of the device. For each attribute, its `name` and `type` must be provided.
* internalAttributes: optional section with free format, to allow specific IoT Agents to store information along with the devices in the Device Registry.
* trust: trust token to use for secured access to the Context Broker for this type of devices (optional; only needed for secured scenarios).
* contextBroker: Context Broker connection information. This options can be used to override the global ones for specific types of devices.

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

## <a name="development"/> Development documentation
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

