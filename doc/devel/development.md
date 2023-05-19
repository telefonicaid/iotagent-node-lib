## Development documentation

-   [Development documentation](#development-documentation)
-   [Preface](#preface)
-   [Contributing](#contributing)
-   [Project management](#project-management)
    -   [Installing dependencies](#installing-dependencies)
    -   [Project build](#project-build)
    -   [Testing](#testing)
        -   [Test requirements](#test-requirements)
        -   [Debug Test](#debug-test)
        -   [Continuous testing](#continuous-testing)
        -   [Code Coverage](#code-coverage)
    -   [Clean](#clean)
    -   [Checking code style](#checking-code-style)
        -   [Source code style validation - ESLint](#source-code-style-validation---eslint)
        -   [Documentation Markdown validation](#documentation-markdown-validation)
        -   [Documentation Spell-checking](#documentation-spell-checking)
        -   [Prettify Code](#prettify-code)
-   [Library functions and modules](#library-functions-and-modules)
    -   [Stats Registry](#stats-registry)
    -   [Alarm module](#alarm-module)
    -   [Transactions](#transactions)
    -   [Library overview](#library-overview)
    -   [Function reference](#function-reference)
        -   [Generic middlewares](#generic-middlewares)
-   [DB Models from API document](#db-models-from-api-document)
    -   [Service group model](#service-group-model)
    -   [Device model](#device-model)
-   [Data mapping plugins](#data-mapping-plugins)
    -   [Plugins usage](#plugins-usage)
    -   [Provided plugins](#provided-plugins)

## Preface

The **IoT Agent node library** as the name suggests is a library that provides a set of functions that can be used by
IoT Agents to implement the northbound interface. The library is used by several FIWARE IoT Agents, such as:

a standalone library that can be used by any IoT Agent to implement the northbound interface,

is not a standalone product and should be added as a dependency to `package.json` of the IoT Agent.

```json
...
"dependencies": {
	"iotagent-node-lib": "*",
}
```

In order to use the library within your own IoT Agent, you must first you require it before use:

```javascript
const iotagentLib = require('iotagent-node-lib');
```

This file contains the documentation for developers who wish to contribute to the **IoT Agent node library** project and
also for those who wish to use the library within their own IoT Agent project.

## Contributing

Contributions to this project are welcome. Developers planning to contribute should follow the
[Contribution Guidelines](contribution-guidelines.md)

## Project management

The **IoT Agent node library** project is managed using [npm](https://www.npmjs.com/). The following sections show the
available options in detail:

### Installing dependencies

This is the first step to be executed after cloning the project. To install them, type the following command:

```bash
npm install
```

### Project build

The project is managed using npm.

For a list of available task, type

```bash
npm run
```

The following sections show the available options in detail.

### Testing

[Mocha](https://mochajs.org/) Test Runner + [Should.js](https://shouldjs.github.io/) Assertion Library.

The test environment is preconfigured to run BDD testing style.

Module mocking during testing can be done with [proxyquire](https://github.com/thlorenz/proxyquire)

To run tests, type

```bash
npm test
```

There are additional targets starting with `test:` prefix to run specific test subsets isolated. For instance, the
`test:expressions` target runs the subset of tests related with expression language feature:

```bash
npm run test:expressions
```

#### Test requirements

A [MongoDB](https://www.mongodb.com/) 3.2+ instance is required to run tests. You can deploy one by using the commodity
`docker-compose-dev.yml`:

```
docker-compose -f docker-compose-dev.yml up -d
```

To run docker compose you will need [docker](https://docs.docker.com/get-docker/) and
[docker-compose](https://docs.docker.com/compose/install/).

#### Debug Test

To debug the code while running run tests, type

```bash
npm run test:debug
```

In the console the link to the debugger will be provided. You can connect to it via Chrome, for example, by opening the
following url: `chrome://inspect`.

Additional debug clients are listed on [node.js](https://nodejs.org/en/docs/guides/debugging-getting-started/).

#### Continuous testing

Support for continuous testing by modifying a src file or a test. For continuous testing, type

```bash
npm run test:watch
```

If you want to continuously check also source code style, use instead:

```bash
npm run watch
```

#### Code Coverage

Istanbul

Analyze the code coverage of your tests.

To generate an HTML coverage report under `site/coverage/` and to print out a summary, type

```bash
# Use git-bash on Windows
npm run test:coverage
```

### Clean

Removes `node_modules` and `coverage` folders, and `package-lock.json` file so that a fresh copy of the project is
restored.

```bash
# Use git-bash on Windows
npm run clean
```

### Checking code style

#### Source code style validation - ESLint

Uses the provided `.eslintrc.json` flag file. To check source code style, type

```bash
npm run lint
```

#### Documentation Markdown validation

Checks the Markdown documentation for consistency

```bash
# Use git-bash on Windows
npm run lint:md
```

#### Documentation Spell-checking

Uses the provided `.textlintrc` flag file. To check the Markdown documentation for spelling and grammar errors, dead
links & etc.

```bash
# Use git-bash on Windows
npm run lint:text
```

#### Prettify Code

Runs the [prettier](https://prettier.io) code formatter to ensure consistent code style (whitespacing, parameter
placement and breakup of long lines etc.) within the codebase.

```bash
# Use git-bash on Windows
npm run prettier
```

To ensure consistent Markdown formatting run the following:

```bash
# Use git-bash on Windows
npm run prettier:text
```

## Library functions and modules

### Stats Registry

The library provides a mechanism for the periodic reporting of stats related to the library's work. In order to activate
the use of the periodic stats, it must be configured in the config file, as described in the
[Configuration](installationguide.md#configuration) section.

The Stats Registry holds two dictionaries, with the same set of stats. For each stat, one of the dictionaries holds the
historical global value and the other one stores the value since the last value reporting (or current value).

The stats library currently stores only the following values:

-   **deviceCreationRequests**: number of Device Creation Requests that arrived to the API (no matter the result).
-   **deviceRemovalRequests**: number of Removal Device Requests that arrived to the API (no matter the result).
-   **measureRequests**: number of times the ngsiService.update() function has been invoked (no matter the result).

More values will be added in the future to the library. The applications using the library can add values to the Stats
Registry just by using the following function:

```javascript
iotagentLib.statsRegistry.add('statName', statIncrementalValue, callback);
```

The first time this function is invoked, it will add the new stat to the registry. Subsequent calls will add the value
to the specified stat both to the current and global measures. The stat will be cleared in each interval as usual.

### Alarm module

The library provide an alarm module that can be used to track through the logs alarms raised in the IoTAgent. This
module provides:

-   Two functions to raise and release and alarm (`raise()` and `release()`): every alarm is identified by a name and a
    description. When the alarm is raised, an error with the text `Raising [%s]` is logged. When the alarm is released,
    the corresponding text, `Releasing [%s]` is logged. If an alarm is raised multiple times, it is only logged once. If
    its released multiple times it is only released once. Releasing a non-existing alarm has no effect.

-   Functions to list all the raised alarms and clean all the alarms (`list()` and `clean()`).

-   A function to instrument other functions, so when one of that functions return an error, an alarm is raised, and
    when it returns a success an alarm is ceased (`intercept()`).

All this functions can be accessed through the `.alarms` attribute of the library.

### Transactions

The library implements a concept of transactions, in order to follow the execution flow the library follows when
treating requests entering both from the North and the South ports of the IoT Agent.

To follow the transactions, a new Domain is created for each incoming request; in the case of requests received on the
North Port of the IoT Agent, this domain is automatically created by a Express middleware, and no further action is
needed from the user. For the case of requests received on the South Port of the IoT Agent, the user is responsible of
creating an stopping the transaction, using the `ensureSouthboundDomain` and `finishSouthBoundTransaction`. In this
case, the transaction will last from the invocation to the former to the invocation of the latter.

The Transaction Correlator is used along all the IoT Platform to follow the trace of a transaction between multiple
components. To do so, in all the HTTP requests sent to other components of the platform, a custom header named
`Fiware-Correlator` is sent with the correlator of the transaction that generated the request. If a component of the
platform receives a request containing this header that starts a transaction, the component will create the transaction
with the received correlator, instead of creating a new one. If the header is not present or the transaction originates
in the component, the transaction ID in this component will be used as the correlator.

During the duration of a transaction, all the log entries created by the code will write the current Transaction ID and
correlator for the operation being executed.

### Library overview

In order to use the library, add the following dependency to your package.json file:

```json
"iotagent-node-lib": "*"
```

In order to use this library, first you must require it:

```javascript
var iotagentLib = require('iotagent-node-lib');
```

The library supports four groups of features, one for each direction of the communication: client-to-server and
server-to-client (and each flow both for the client and the server). Each feature set is defined in the following
sections.

### Function reference

The following fucntions are available in the library:

-   [iotagentLib.activate()](#iotagentlibactivate)
-   [iotagentLib.deactivate()](#iotagentlibdeactivate)
-   [iotagentLib.register()](#iotagentlibregister)
-   [iotagentLib.unregister()](#iotagentlibunregister)
-   [iotagentLib.update()](#iotagentlibupdate)
-   [iotagentLib.setCommandResult()](#iotagentlibsetcommandresult)
-   [iotagentLib.listDevices()](#iotagentliblistdevices)
-   [iotagentLib.setDataUpdateHandler()](#iotagentlibsetdataupdatehandler)
-   [iotagentLib.setDataQueryHandler()](#iotagentlibsetdataqueryhandler)
-   [iotagentLib.setNotificationHandler()](#iotagentlibsetnotificationhandler)
-   [iotagentLib.setCommandHandler()](#iotagentlibsetcommandhandler)
-   [iotagentLib.setMergePatchHandler()](#iotagentlibsetmergepatchhandler)
-   [iotagentLib.setProvisioningHandler()](#iotagentlibsetprovisioninghandler)
-   [iotagentLib.setRemoveDeviceHandler()](#iotagentlibsetremovedevicehandler)
-   [iotagentLib.setConfigurationHandler()](#iotagentlibsetconfigurationhandler)
-   [iotagentLib.setRemoveConfigurationHandler()](#iotagentlibsetremoveconfigurationhandler)
-   [iotagentLib.getDevice()](#iotagentlibgetdevice)
-   [iotagentLib.getDeviceByName()](#iotagentlibgetdevicebyname)
-   [iotagentLib.getDevicesByAttribute()](#iotagentlibgetdevicesbyattribute)
-   [iotagentLib.retrieveDevice()](#iotagentlibretrievedevice)
-   [iotagentLib.mergeDeviceWithConfiguration()](#iotagentlibmergedevicewithconfiguration)
-   [iotagentLib.getConfiguration()](#iotagentlibgetconfiguration)
-   [iotagentLib.findConfiguration()](#iotagentlibfindconfiguration)
-   [iotagentLib.getEffectiveApiKey()](#iotagentlibgeteffectiveapikey)
-   [iotagentLib.subscribe()](#iotagentlibsubscribe)
-   [iotagentLib.unsubscribe()](#iotagentlibunsubscribe)
-   [iotagentLib.ensureSouthboundDomain()](#iotagentlibensuresouthbounddomain)
-   [iotagentLib.finishSouthBoundTransaction()](#iotagentlibfinishsouthboundtransaction)
-   [iotagentLib.startServer()](#iotagentlibstartserver)
-   [iotagentLib.request()](#iotagentlibrequest)

##### iotagentLib.activate()

###### Signature

```javascript
function activate(newConfig, callback)
```

###### Description

Activates the IoT Agent to start listening for NGSI Calls (acting as a Context Provider). It also creates the device
registry for the IoT Agent (based on the deviceRegistry.type configuration option).

###### Params

-   newConfig: Configuration of the Context Server (described in the [Configuration](installationguide.md#configuration)
    section).

##### iotagentLib.deactivate()

###### Signature

```javascript
function deactivate(callback)
```

###### Description

Stops the HTTP server.

###### Params

##### iotagentLib.register()

###### Signature

```javascript
function registerDevice(deviceObj, callback)
```

###### Description

Register a new device in the IoT Agent. This registration will also trigger a Context Provider registration in the
Context Broker for all its lazy attributes.

The device Object can have the following attributes:

-   `id`: Device ID of the device.
-   `type`: type to be assigned to the device.
-   `name`: name that will be used for the Entity representing the device in the Context Broker.
-   `service`: name of the service associated with the device.
-   `subservice`: name of the subservice associated with th device.
-   `lazy`: list of lazy attributes with their types.
-   `active`: list of active attributes with their types.
-   `staticAttributes`: list of NGSI attributes to add to the device entity 'as is' in updates, queries and
    registrations.
-   `internalAttributes`: optional section with free format, to allow specific IoT Agents to store information along
    with the devices in the Device Registry.

The device `id` and `type` are required fields for any registration. The rest of the attributes are optional, but, if
they are not present in the function call arguments, the type must be registered in the configuration, so the service
can infer their default values from the configured type. If an optional attribute is not given in the parameter list and
there isn't a default configuration for the given type, a TypeNotFound error is raised.

If the device has been previously preprovisioned, the missing data will be completed with the values from the registered
device.

###### Params

-   deviceObj: object containing all the information about the device to be registered (mandatory).

##### iotagentLib.unregister()

###### Signature

```javascript
function unregisterDevice(id, service, subservice, callback)
```

###### Description

Unregister a device from the Context broker and the internal registry.

###### Params

-   id: Device ID of the device to register.
-   service: Service of the device to unregister.
-   subservice: Subservice inside the service for the unregistered device.

##### iotagentLib.update()

###### Signature

```javascript
function update(entityName, attributes, typeInformation, token, callback)
```

###### Description

Makes an update in the Device's entity in the context broker, with the values given in the 'attributes' array. This
array should comply to the NGSI's attribute format.

###### Params

-   entityName: Name of the entity to register.
-   attributes: Attribute array containing the values to update.
-   typeInformation: Configuration information for the device.
-   token: User token to identify against the PEP Proxies (optional).

##### iotagentLib.setCommandResult()

###### Signature

```javascript
function setCommandResult(entityName, resource, apikey, commandName, commandResult, status, deviceInformation, callback)
```

###### Description

Update the result of a command in the Context Broker. The result of the command has two components: the result of the
command itself will be represented with the suffix `_info` in the entity while the status is updated in the attribute
with the `_status` suffix.

###### Params

-   entityName: Name of the entity holding the command.
-   resource: Resource name of the endpoint the device is calling.
-   apikey: Apikey the device is using to send the values (can be the empty string if none is needed).
-   commandName: Name of the command whose result is being updated.
-   commandResult: Result of the command in string format.
-   deviceInformation: Device information, including security and service information. (optional).

##### iotagentLib.listDevices()

###### Signature

```javascript
function listDevices(callback)
function listDevices(limit, offset, callback)
function listDevices(service, subservice, limit, offset, callback)
```

###### Description

Return a list of all the devices registered in the specified service and subservice. This function can be invoked in
three different ways:

-   with just one parameter (the callback)
-   with three parameters (service, subservice and callback)
-   or with five parameters (including limit and offset).

###### Params

-   service: service from where the devices will be retrieved.
-   subservice: subservice from where the devices will be retrieved.
-   limit: maximum number of results to retrieve (optional).
-   offset: number of results to skip from the listing (optional).

##### iotagentLib.setDataUpdateHandler()

###### Signature

```javascript
function setDataUpdateHandler(newHandler)
```

###### Description

Sets the new user handler for Entity update requests. This handler will be called whenever an update request arrives
with the following parameters: (`id`, `type`, `service`, `subservice`, `attributes`, `callback`). Every object within of
the `attributes` array contains `name`, `type` and `value` attributes, and may also include additional attributes for
`metadata` and `datasetId`. The handler is in charge of updating the corresponding values in the devices with the
appropriate protocol.

Once all the updates have taken place, the callback must be invoked with the updated Context Element. E.g.:

```javascript
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

In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each
entity, and all the results will be combined into a single response.

###### Params

-   newHandler: User handler for update requests

##### iotagentLib.setDataQueryHandler()

###### Signature

```javascript
function setDataQueryHandler(newHandler)
```

###### Description

Sets the new user handler for Entity query requests. This handler will be called whenever a query request arrives, with
the following parameters: (`id`, `type`, `service`, `subservice`, `attributes`, `callback`). The handler must retrieve
all the corresponding information from the devices and return a NGSI entity with the requested values.

The callback must be invoked with the updated Context Element, using the information retrieved from the devices. E.g.:

```javascript
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

In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each
entity, and all the results will be combined into a single response.

###### Params

-   newHandler: User handler for query requests.

##### iotagentLib.setNotificationHandler()

###### Signature

```javascript
function setNotificationHandler(newHandler)
```

###### Description

Sets the new handler for incoming notifications. The notifications are sent by the Context Broker based on the IoT Agent
subscriptions created with the `subscribe()` function.

The handler must adhere to the following signature:

```javascript
function mockedHandler(device, data, callback)
```

The `device` parameter contains the device object corresponding to the entity whose changes were notified with the
incoming notification. Take into account that multiple entities may be modified with each single notification. The
handler will be called once for each one of those entities.

The `data` parameter is an array with all the attributes that were requested in the subscription and its respective
values.

The handler is expected to call its callback once with no parameters (failing to do so may cause unexpected behaviors in
the IoT Agent).

##### iotagentLib.setCommandHandler()

###### Signature

```javascript
function setCommandHandler(newHandler)
```

###### Description

Sets the new user handler for registered entity commands. This handler will be called whenever a command request
arrives, with the following parameters: (`id`, `type`, `service`, `subservice`, `attributes`, `callback`). The handler
must retrieve all the corresponding information from the devices and return a NGSI entity with the requested values.

The callback must be invoked with the updated Context Element, using the information retrieved from the devices. E.g.:

```javascript
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

In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each
entity, and all the results will be combined into a single response. Only IoT Agents which deal with actuator devices
will include a handler for commands.

###### Params

-   newHandler: User handler for command requests.

##### iotagentLib.setMergePatchHandler()

###### Signature

```javascript
function setMergePatchHandler(newHandler)
```

###### Description

Sets the new user handler for NGSI-LD Entity [merge-patch](https://datatracker.ietf.org/doc/html/rfc7386) requests. This
handler will be called whenever a merge-patch request arrives, with the following parameters: (`id`, `type`, `service`,
`subservice`, `attributes`, `callback`). The handler must retrieve all the corresponding information from the devices
and return a NGSI entity with the requested values.

The callback must be invoked with the updated Context Element, using the information retrieved from the devices. E.g.:

```javascript
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

In the case of NGSI-LD requests affecting multiple entities, this handler will be called multiple times. Since
merge-patch is an advanced function, not all IoT Agents will include a handler for merge-patch.

###### Params

-   newHandler: User handler for merge-patch requests.

##### iotagentLib.setProvisioningHandler()

###### Signature

```javascript
function setProvisioningHandler (newHandler)
```

###### Description

Sets the new user handler for the provisioning of devices. This handler will be called every time a new device is
created.

The handler must adhere to the following signature:

```javascript
function(newDevice, callback)
```

The `newDevice` parameter will contain the newly created device. The handler is expected to call its callback with no
parameters (this handler should only be used for reconfiguration purposes of the IoT Agent).

##### iotagentLib.setRemoveDeviceHandler()

###### Signature

```javascript
function setRemoveDeviceHandler(newHandler)
```

###### Description

Sets the new user handler for the removal of a device. This handler will be called every time a device is removed.

The handler must adhere to the following signature:

```javascript
function(deviceToDelete, callback)
```

The `deviceToDelete` parameter will contain the device to be deleted. The handler is expected to call its callback with
no parameters (this handler should only be used for reconfiguration purposes of the IoT Agent).

##### iotagentLib.setConfigurationHandler()

###### Signature

```javascript
function setConfigurationHandler(newHandler)
```

###### Description

Sets the new user handler for the configuration updates. This handler will be called every time a new configuration is
created or an old configuration is updated.

The handler must adhere to the following signature:

```javascript
function(newConfiguration, callback)
```

The `newConfiguration` parameter will contain the newly created configuration. The handler is expected to call its
callback with no parameters (this handler should only be used for reconfiguration purposes of the IoT Agent).

For the cases of multiple updates (a single Device Configuration POST that will create several device groups), the
handler will be called once for each of the configurations (both in the case of the creations and the updates).

The handler will be also called in the case of updates related to configurations. In that situation, the
`newConfiguration` parameter contains also the fields needed to identify the configuration to be updated, i.e.,
`service`, `subservice`, `resource` and `apikey`.

##### iotagentLib.setRemoveConfigurationHandler()

###### Signature

```javascript
function setRemoveConfigurationHandler(newHandler)
```

###### Description

Sets the new user handler for the removal of configuratios. This handler will be called every time a configuration is
removed.

The handler must adhere to the following signature:

```javascript
function(configurationToDelete, callback)
```

The `configurationToDelete` parameter will contain the configuration to be deleted. The handler is expected to call its
callback with no parameters (this handler should only be used for reconfiguration purposes of the IoT Agent).

##### iotagentLib.getDevice()

###### Signature

```javascript
function getDevice(deviceId, service, subservice, callback)
```

###### Description

Retrieve all the information about a device from the device registry.

###### Params

-   deviceId: ID of the device to be found.
-   service: Service for which the requested device.
-   subservice: Subservice inside the service for which the device is requested.

##### iotagentLib.getDeviceByName()

###### Signature

```javascript
function getDeviceByName(deviceName, service, subservice, callback)
```

###### Description

Retrieve a device from the registry based on its entity name.

###### Params

-   deviceName: Name of the entity associated to a device.
-   service: Service the device belongs to.
-   subservice: Division inside the service.

##### iotagentLib.getDevicesByAttribute()

###### Signature

```javascript
function getDevicesByAttribute(attributeName, attributeValue, service, subservice, callback)
```

###### Description

Retrieve all the devices having an attribute named `name` with value `value`.

###### Params

-   name: name of the attribute to match.
-   value: value to match in the attribute.
-   service: Service the device belongs to.
-   subservice: Division inside the service.

##### iotagentLib.retrieveDevice()

###### Signature

```javascript
function retrieveDevice(deviceId, apiKey, callback)
```

###### Description

Retrieve a device from the device repository based on the given APIKey and DeviceID, creating one if none is found for
the given data.

###### Params

-   deviceId: Device ID of the device that wants to be retrieved or created.
-   apiKey: APIKey of the Device Group (or default APIKey).

##### iotagentLib.mergeDeviceWithConfiguration()

###### Signature

```javascript
function mergeDeviceWithConfiguration(fields, defaults, deviceData, configuration, callback)
```

###### Description

Complete the information of the device with the information in the configuration group (with precedence of the device).
The first argument indicates what fields would be merged.

###### Params

-   fields: Fields that will be merged.
-   defaults: Default values fot each of the fields.
-   deviceData: Device data.
-   configuration: Configuration data.

##### iotagentLib.getConfiguration()

###### Signature

```javascript
function getConfiguration(resource, apikey, callback)
```

###### Description

Gets the device group identified by the given (`resource`, `apikey`) pair.

###### Params

-   resource: representation of the configuration in the IoT Agent (dependent on the protocol) .
-   apikey: special key the devices will present to prove they belong to a particular configuration.

##### iotagentLib.findConfiguration()

###### Signature

```javascript
function findConfiguration(service, subservice, callback)
```

###### Description

Find a device group based on its service and subservice.

###### Params

-   service: name of the service of the configuration.
-   subservice: name of the subservice of the configuration.

##### iotagentLib.getEffectiveApiKey()

###### Signature

```javascript
function getEffectiveApiKey(service, subservice, type, callback)
```

###### Description

Get the API Key for the selected service if there is any, or the default API Key if a specific one does not exist.

###### Params

-   service: Name of the service whose API Key we are retrieving.
-   subservice: Name of the subservice whose API Key we are retrieving.
-   type: Type of the device.

##### iotagentLib.subscribe()

###### Signature

```javascript
function subscribe(device, triggers, content, callback)
```

###### Description

Creates a subscription for the IoTA to the entity representing the selected device.

###### Params

-   device: Object containing all the information about a particular device.
-   triggers: Array with the names of the attributes that would trigger the subscription
-   content: Array with the names of the attributes to retrieve in the notification.

##### iotagentLib.unsubscribe()

###### Signature

```javascript
function unsubscribe(device, id, callback)
```

###### Description

Removes a single subscription from the selected device, identified by its ID.

###### Params

-   `device`: Object containing all the information about a particular device.
-   `id`: ID of the subscription to remove.

##### iotagentLib.ensureSouthboundDomain()

###### Signature

```javascript
function ensureSouthboundTransaction(context, callback)
```

###### Description

Ensures that the current operation is executed inside a transaction with all the information needed for the appropriate
platform logging: start date, transaction ID and correlator in case one is needed. If the function is executed in the
context of a previous transaction, just the context is changed (and the Transaction ID and start time are kept).

###### Params

-   context: New context data for the transaction.

##### iotagentLib.finishSouthBoundTransaction()

###### Signature

```javascript
function finishSouthboundTransaction(callback)
```

###### Description

Terminates the current transaction, if there is any, cleaning its context.

##### iotagentLib.startServer()

###### Signature

```javascript
function startServer(newConfig, iotAgent, callback)
```

###### Description

Start the HTTP server either in single-thread or multi-thread (multi-core) based on the value of _multiCore_ variable
(described in the [Configuration](installationguide.md#configuration) section). If the value is `False` (either was
directly specified `False` in the `config.js` or it was not specified and by default is assigned `False`), it is a
normal (single-thread) behaviour. Nevertheless, if _multiCore_ is `True`, the IoTAgent is executed in multi-thread
environment.

The number of parallel processes is calculated based on the number of available CPUs. In case of some of the process
unexpectedly dead, a new process is created automatically to keep always the maximum of them working in parallel.

> Note: `startServer()` initializes the server but it does not activate the library. The function in the Node Lib will
> call the `iotAgent.start()` in order to complete the activation of the library. Therefore, it is expected that the IoT
> Agent implement the `iotAgent.start()` function with the proper invocation to the `iotAgentLib.activate()`.

###### Params

-   newConfig: Configuration of the Context Server (described in the [Configuration](installationguide.md#configuration)
    section).
-   iotAgent: The IoT Agent Objects, used to start the agent.
-   callback: The callback function.

##### iotagentLib.request()

###### Signature

```javascript
function request(options, callback)
```

###### Description

Make a direct HTTP request using the underlying request library (currently [got](https://github.com/sindresorhus/got)),
this is useful when creating agents which use an HTTP transport for their southbound commands, and removes the need for
the custom IoT Agent to import its own additional request library

###### Params

-   options: definition of the request (see
    [got options](https://github.com/sindresorhus/got/blob/main/documentation/2-options.md) for more details). The
    following attributes are currently exposed.
    -   `method` - HTTP Method
    -   `searchParams` - query string params
    -   `qs` - alias for query string params
    -   `headers`
    -   `responseType` - either `text` or `json`. `json` is the default
    -   `json` - a supplied JSON object as the request body
    -   `body` - any ASCII text as the request body. It takes precedence over `json` if both are provided at the same
        time (not recommended).
    -   `url` - the request URL
    -   `uri` - alternative alias for the request URL.
-   callback: The callback currently returns an `error` Object, the `response` and `body`. The `body` is parsed to a
    JSON object if the `responseType` is JSON.

#### Generic middlewares

This collection of utility middlewares is aimed to be used to north of the IoT Agent Library, as well as in other
HTTP-based APIs of the IoT Agents. All the middlewares follow the Express convention of `(req, res, next)` objects, so
this information will not be repeated in the descriptions for the middleware functions. All the middlewares can be added
to the servers using the standard Express mechanisms.

##### iotagentLib.middlewares.handleError()

###### Signature

```javascript
function handleError(error, req, res, next)
```

###### Description

Express middleware for handling errors in the IoTAs. It extracts the code information to return from the error itself
returning 500 when no error code has been found.

##### iotagentLib.middlewares.traceRequest()

###### Signature

```javascript
function traceRequest(req, res, next)
```

###### Description

Express middleware for tracing the complete request arriving to the IoTA in debug mode.

##### iotagentLib.middlewares.changeLogLevel()

###### Signature

```javascript
function changeLogLevel(req, res, next)
```

###### Description

Changes the log level to the one specified in the request.

##### iotagentLib.middlewares.ensureType()

###### Signature

```javascript
function ensureType(req, res, next)
```

###### Description

Ensures the request type is one of the supported ones.

##### iotagentLib.middlewares.validateJson()

###### Signature

```javascript
function validateJson(template)
```

###### Description

Generates a Middleware that validates incoming requests based on the JSON Schema template passed as a parameter.

Returns an Express middleware used in request validation with the given template.

###### Params

-   _template_: JSON Schema template to validate the request.

##### iotagentLib.middlewares.retrieveVersion()

###### Signature

```javascript
function retrieveVersion(req, res, next)
```

###### Description

Middleware that returns all the IoTA information stored in the module.

##### iotagentLib.middlewares.setIotaInformation()

###### Signature

```javascript
function setIotaInformation(newIoTAInfo)
```

###### Description

Stores the information about the IoTAgent for further use in the `retrieveVersion()` middleware.

###### Params

-   _newIoTAInfo_: Object containing all the IoTA Information.

## DB Models (from API document)

The following sections describe the models used in the database to store the information about the devices and the
config groups.

### Service group model

The table below shows the information held in the service group provisioning resource. The table also contains the
correspondence between the API resource fields and the same fields in the database model.

| Payload Field                  | DB Field                       | Definition                                                                                                                                                                                                                                                                |
| ------------------------------ | ------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `service`                      | `service`                      | Service of the devices of this type                                                                                                                                                                                                                                       |
| `subservice`                   | `subservice`                   | Subservice of the devices of this type.                                                                                                                                                                                                                                   |
| `resource`                     | `resource`                     | string representing the Southbound resource that will be used to assign a type to a device (e.g.: pathname in the southbound port).                                                                                                                                       |
| `apikey`                       | `apikey`                       | API Key string.                                                                                                                                                                                                                                                           |
| `timestamp`                    | `timestamp`                    | Optional flag about whether or not to add the `TimeInstant` attribute to the device entity created, as well as a `TimeInstant` metadata to each attribute, with the current timestamp. With NGSI-LD, the Standard `observedAt` property-of-a-property is created instead. |
| `entity_type`                  | `entity_type`                  | name of the Entity `type` to assign to the group.                                                                                                                                                                                                                         |
| `trust`                        | `trust`                        | trust token to use for secured access to the Context Broker for this type of devices (optional; only needed for secured scenarios).                                                                                                                                       |
| `cbHost`                       | `cbHost`                       | Context Broker connection information. This options can be used to override the global ones for specific types of devices.                                                                                                                                                |
| `lazy`                         | `lazy`                         | list of common lazy attributes of the device. For each attribute, its `name` and `type` must be provided.                                                                                                                                                                 |
| `commands`                     | `commands`                     | list of common commands attributes of the device. For each attribute, its `name` and `type` must be provided, additional `metadata` is optional.                                                                                                                          |
| `attributes`                   | `attributes`                   | list of common active attributes of the device. For each attribute, its `name` and `type` must be provided, additional `metadata` is optional.                                                                                                                            |
| `static_attributes`            | `staticAttributes`             | this attributes will be added to all the entities of this group 'as is', additional `metadata` is optional.                                                                                                                                                               |
| `internal_attributes`          | `internalAttributes`           | optional section with free format, to allow specific IoT Agents to store information along with the devices in the Device Registry.                                                                                                                                       |
| `expressionLanguage`           | `expresionLanguage`            | optional boolean value, to set expression language used to compute expressions, possible values are: legacy or jexl. When not set or wrongly set, `legacy` is used as default value.                                                                                      |
| `explicitAttrs`                | `explicitAttrs`                | optional field to support selective ignore of measures so that IOTA doesn’t progress. See details in [specific section](../api.md#explicitly-defined-attributes-explicitattrs)                                                                                            |
| `entityNameExp`                | `entityNameExp`                | optional field to allow use expressions to define entity name, instead default `id` and `type`                                                                                                                                                                            |
| `ngsiVersion`                  | `ngsiVersion`                  | optional string value used in mixed mode to switch between **NGSI-v2** and **NGSI-LD** payloads. Possible values are: `v2` or `ld`. The default is `v2`. When not running in mixed mode, this field is ignored.                                                           |
| `defaultEntityNameConjunction` | `defaultEntityNameConjunction` | optional string value to set default conjunction string used to compose a default `entity_name` when is not provided at device provisioning time.                                                                                                                         |
| `autoprovision`                | `autoprovision`                | optional boolean: If `false`, autoprovisioned devices (i.e. devices that are not created with an explicit provision operation but when the first measure arrives) are not allowed in this group. Default (in the case of omitting the field) is `true`.                   |

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
| `explicitAttrs`       | `explicitAttrs`      | optional field to support selective ignore of measures so that IOTA doesn’t progress. See details in [specific section](../api.md#explicitly-defined-attributes-explicitattrs)                                                                                            | (see details in specific section)             |
| `ngsiVersion`         | `ngsiVersion`        | optional string value used in mixed mode to switch between **NGSI-v2** and **NGSI-LD** payloads. The default is `v2`. When not running in mixed mode, this field is ignored.                                                                                              | `v2/ld`                                       |

## Data mapping plugins

The IoT Agent Library provides a plugin mechanism in order to facilitate reusing code that makes small transformations
on incoming data (both from the device and from the context consumers). This mechanism is based in the use of
middlewares, i.e.: small pieces of code that receive and return an `entity`, making as many changes as they need, but
taking care of returning a valid entity, that can be used as the input for other middlewares; this way, all those pieces
of code can be chained together in order to make all the needed transformations in the target entity.

There are two kinds of middlewares: updateContext middlewares and queryContext middlewares. The updateContext
middlewares are applied before the information is sent to the Context Broker, modifiying the entity before it is sent to
Orion. The queryContext middlewares are applied on the received data, whenever the IoT Agent queries the Context Broker
for information. I.e.: both middlewares will be automatically applied whenever the `update()` or `query()` functions are
called in the library.

All the middlewares have the opportunity to break the chain of middleware applications by calling the `callback()` with
an error object (the usual convention). If any of the updateContext middlewares raise an error, no request will be sent
to the Context Broker. On the other hand, the queryContext request is always performed, but the call to the `query()`
function will end up in an error if any of the queryContext middlewares report an error.

### Plugins usage

All the middlewares have the same signature:

```javascript
function middlewareName(entity, typeInformation, callback) {}
```

The arguments for any middleware are the NGSI data over which it can operate:

-   An updateContext payload in the case of an updateContext middleware and a queryContext payload otherwise;
-   a typeInformation object containing all the information about the device stored during registration.
-   and the customary `callback` parameter, with the usual meaning. It's really important for the library user to call
    this callback, as failing to do so may hang the IoT Agent completely. The callback must be called with the an
    optional error in the first argument and the same arguments received (potentially modified) as the following.

In order to manage the middlewares to the system, the following functions can be used:

-   `addUpdateMiddleware`: adds an updateContext middleware to the stack of middlewares. All the middlewares will be
    applied to every call to the `update()` function. The final payload of the updateContext request will be the result
    of applying all this middlewares in the order they have been defined.

-   `addQueryMiddleware`: adds a queryContext middleware to the stack of middlewares. All the middlewares will be
    applied to every call to the `query()` function.

-   `resetMiddlewares`: remove all the middlewares from the system.

Usually, the full list of middlewares an IoT Agent will use would be added in the IoTAgent start sequence, so they
should not change a lot during the IoT lifetime.

### Provided plugins

The library provides some plugins out of the box, in the `dataPlugins` collection. In order to load any of them, just
use the `addQueryMiddleware` and `addUpdateMiddleware` functions with the selected plugin, as in the example:

```javascript
var iotaLib = require('iotagent-node-lib');

iotaLib.addUpdateMiddleware(iotaLib.dataPlugins.compressTimestamp.update);
iotaLib.addQueryMiddleware(iotaLib.dataPlugins.compressTimestamp.query);
```
