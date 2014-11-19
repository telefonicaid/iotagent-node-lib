# fiware-iotagent-lib

## Overview
### Description
This project aims to provide a node.js module to enable IoT Agent developers to build custom agents for their devices that can 
easily connect to NGSI Context Brokers (such as [Orion](https://github.com/telefonicaid/fiware-orion) ). 

An IoT Agent is a FIWARE component that lets groups of devices send their data to and be managed from a NGSI Context Broker using their own native protocols. IoT Agents should also be able to deal with security aspects of the fiware platform (authentication and authorization of the channel) and provide other common services to the device programmer.

### Device to NGSI Mapping
Each Device will be mapped as an Entity associated to a Context Provider: the Device Id will be mapped to the entity ID and the type of the entity with a custom dependent on the device's service. Both the name and type will be configurable by the user.

Each of the measures obtained from the device will be mapped to a different attribute. The name and type of the attribute will
be configured by the user. Device measures can have two different behaviors:
* Active attributes: are measures that are pushed from the device to the IoT agent. This measure changes will be sent to the Context Broker as updateContext requests over the device entity.
* Lazy attributes: some sensors will be passive, and will wait for the IoT Agent to request for data. For those measures, the IoT Agent will register itself in the Context Broker as a Context Provider (for all the lazy measures of that device), so if any component asks the Context Broker for the value of that sensor, its request will be redirected to the IoT Agent. Updates over this measure will be transformed into commands over the device by the IoT Agent.

The following sequence diagram shows the different NGSI interactions an IoT Agent makes with the Context Broker, explained in the following subsections (using the example of a OMA Lightweight M2M device).

![General ](https://raw.github.com/dmoranj/iotagent-node-lib/develop/img/ngsiInteractions.png "NGSI Interactions")

#### Registration
Whenever a device is registered, the IoT Agent reads the device's entity information from the request or, it that information is not in the request, from the default values for that type of device. Among this information, theres should be the list of device values that will be considered lazy (or passive). With this information, the IoT Agent sends a new `registerContext` request to the Context Broker, registering itself as ContextProvider of all the lazy attributes of the device. The `registrationId` is then stored along the other device information inside the IoT Agent device regitry.

As NGSI9 does not allow the context registrations to be removed, when the device is removed from the IoT Agent, the registration is updated to an expiration date of 1s, so it is effectively disabled. Once it has been disabled, the device is removed from the IoT Agent's internal registry.

#### Lazy attributes
When a request for data from a lazy attribute arrives to the Context Broker, it forwards the request to the Context Provider of that entity, in this case the IoT Agent. The IoT Agent will in turn ask the device for the information needed, transform that information to a NSGI format and return it to the Context Broker. The latter will the forward the response to the caller, transparently.

#### Commands
Commands are modelled as updates over a lazy attribute. As in the case of the lazy attributes, updates over a command will be forwarded by the Context Broker to the IoT Agent, that will in turn interact with the device to perform the requested action. Parameters for the command will be passed inside the command value.

It's up to the agent whether to make the update synchronous or asynchronous. In the latter case, the update request will end in a `200OK` response, and the IoT Agent will have to create a new attribute in the device entity (with the same name of the command attribute and the suffix `_status`) with the current status of the command and subsequent updates of the same.

#### Active attributes
Whenever a device proactively sends a message to the IoT Agent, it should tranform its data to the appropriate NGSI format, and send it to the Context Broker as an `updateContext` request.

### Features
These are the features an IoT Agent is supposed to expose:
* Device registration: multiple devices will be connected to each IoT Agent, each one of those mapped to a CB entity. The IoT Agent will register itself as a Context Provider for each device, answering to requests and updates on any lazy attribute of the device.
* Device information update: whenever a device haves new measures to publish, it should send the information to the IoT Agent in its own native language. This message should , in turn, be should sent as an `updateContext` request to the Context Broker, were the measures will be updated in the device entity. 
* Device command execution and value updates: as a Context Provider, the IoT Agent should receive update operations from the Context Broker subscriptions, and relay them to the corresponding device (decoding it using its ID and Type, and other possible metadata). This commands will arrive as `updateContext` operations redirected from the Context Broker to the IoT Agent.
* Device management: the IoT Agent should offer a device repository where the devices can be registered, holding data needed for the connection to the Context Broker as the following: service and subservice for the device, API Key the device will be using to connect to the IoT Agent, Trust token the device will be using to retrieve the Keystone token to connect to the Context Broker.
* Device provisioning: the IoT Agent should offer an external API to make a preprovision of any devices. This preprovision should enable the user to customize the device`s entity name and type as well as their service information.
* Type configuration: if a device is registered without a preregistration, only its `id` and `type` attributes are mandatory. The IoT Agent should provide a mechanism to provide default values to the device attributes based on its type (a JSON configuration file with the default values per type).

Almost all of these features are common for every agent, so they can be abstracted into a library or external module. The objective of this project is to provide that abstraction. As all this common tasks are abstracted, the main task of the concrete IoT Agent implementations will be to map between the native device protocol and the library API.

The following figure offers a graphical example of how a COAP IoT Agent work, ordered from the registration of the device to a command update to the device.

![General ](https://raw.github.com/dmoranj/iotagent-node-lib/develop/img/iotAgentLib.png "Architecture Overview")

### Implementation decisions
Given the aforementioned requirements, there are some aspects of the implementation that were chosen, and are particularly under consideration:
* The IoT Agent Lib will save its configuration as a text file, and it will be updated using an external API (the API consisting in a single REST resource with a JSON object, that will be in the internal configuration format).
* Aside from its text configuration, the IoT Agent Lib is considered to be stateless. To be precise, the library mantains a state (the list of entities/devices whose information the agent can provide) but that state is considered to be transient. It's up to the particular implementation of the agent to consider whether it should have a persistent storage to hold the device information (so the internal list of devices is read from a DB) or to register the devices each time a device sends a measure.
* The IoT Agent does not care about the origin of the data, its type or structure. The mapping from raw data to the entity model, if there is any, is a responsability of the IoT Agent implementation, or of another third party library.

## Usage
### Library usage
#### General review
Note: as it is not yet published in npm repositories, this module has to be currently used as a github dependency in the package.json. To do so, add the following dependency to your package.json file, indicating the commit you want to use:
```
"iotagent-node-lib": "https://github.com/dmoranj/iotagent-node-lib/tarball/8f0e42fc02971fe7d05e75687b988f3ee9e9de13"
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
Activates the IoT Agent to start listening for NGSI Calls (to act as a Context Provider). It also creates the device registry for the IoT Agent (based on the deviceRegistry.type configuration option).
###### Params
* newConfig: Configuration of the Context Server

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
registerDevice(id, type, service, subservice, lazyAttributes, callback)
```
###### Description
Register a new device identified by the Id and Type in the Context Broker, and the internal registry.

The device id and type are required fields for any registration. The rest of the parameters are optional, but, if they are not present in the function call arguments, the type must be registered in the configuration, so the service can infer their default values from the configured type. If an optional attribute is not given in the parameter list and there isn't a default configuration for the given type, a TypeNotFound error is raised.

When an optional parameter is not included in the call, a null value must be given in its place.
###### Params
 * id: Device ID of the device to register (mandatory).
 * type: Type of device to register (mandatory).
 * service: Service where the device will be added (optional).
 * subservice: Subservice where the device will be added (optional).
 * lazyAttributes: List of the lazy attributes of the device with their types (optional).
##### iotagentLib.unregister()
###### Signature
```
function unregisterDevice(id, type, callback)
```
###### Description
Unregister a device from the Context broker and the internal registry.
###### Params
 * id: Device ID of the device to register.
 * type: Type of device to register.
##### iotagentLib.update()
###### Signature
```
updateValue(deviceId, deviceType, attributes, callback)
```
###### Description
Makes an update in the Device's entity in the context broker, with the values given in the 'attributes' array. This array should comply to the NGSI's attribute format.
###### Params
 * deviceId: Device ID of the device to register.
 * deviceType: Type of device to register.
 * attributes: Attribute array containing the values to update.
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
Sets the new user handler for Entity update requests. This handler will be called whenever an update request arrives with the following parameters: (id, type, attributes, callback). The callback is in charge of updating the corresponding values in the devices with the appropriate protocol.

In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each entity, and all the results will be combined into a single response.
###### Params
 * newHandler: User handler for update requests
##### iotagentLib.setDataQueryHandler()
###### Signature
```
function setQueryHandler(newHandler)
```
###### Description
Sets the new user handler for Entity query requests. This handler will be called whenever an update request arrives with the following parameters: (id, type, attributes, callback). The handler must retrieve all the corresponding information from the devices and return a NGSI entity with the requested values.

In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each entity, and all the results will be combined into a single response.
###### Params
 * newHandler: User handler for query requests.
### IoT Library testing
A command line client to experiment with the library is packed with it. The command line client can be started using the following command:
```
bin/agentConsole.js
```
The client offers an API similar to the one offered by the library: it can start and stop an IoT agent, register and unregister devices, send measures mimicking the device and receive updates of the device data.

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
## Development documentation
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

