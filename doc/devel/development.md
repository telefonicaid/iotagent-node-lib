# Development documentation

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
    -   [Config group model](#config-group-model)
    -   [Device model](#device-model)
-   [Developing a new IoT Agent](#developing-a-new-iot-agent)
    -   [Protocol](#protocol)
    -   [Requirements](#requirements)
    -   [Basic IOTA](#basic-iot-agent)
    -   [IOTA With Active attributes](#iot-agent-with-active-attributes)
    -   [IOTA With Lazy attributes](#iota-with-lazy-attributes)
        -   [Previous considerations](#previous-considerations)
        -   [Implementation](#implementation)
    -   [IoT Agent in multi-thread mode](#iot-agent-in-multi-thread-mode)
    -   [Configuration management](#configuration-management)
        -   [Provisioning handlers](#provisioning-handlers)
-   [IoT Agent additional tools](#iot-agent-additional-tools)

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

The library provides a mechanism for the collection of stats related to the library's work. The Stats Registry holds a
dictionary with the historical global value of each stat.

The stats library currently stores only the following values:

-   **deviceCreationRequests**: number of Device Creation Requests that arrived to the API (no matter the result).
-   **deviceRemovalRequests**: number of Removal Device Requests that arrived to the API (no matter the result).
-   **measureRequests**: number of times the ngsiService.update() function has been invoked (no matter the result).
-   **raiseAlarm**: number of times the alarmManagement.raise() function has been invoked.
-   **releaseAlarm**: number of times the alarmManagement.release() function has been invoked.
-   **updateEntityRequestsOk**: number of times the ngsiService.sendUpdateValue() function has been invoked
    successfully.
-   **updateEntityRequestsError**: number of times the ngsiService.sendUpdateValue() function has been invoked and
    failed.

More values will be added in the future to the library. The applications using the library can add values to the Stats
Registry just by using the following function:

```javascript
iotagentLib.statsRegistry.add('statName', statIncrementalValue, callback);
```

The first time this function is invoked, it will add the new stat to the registry. Subsequent calls will add the value
to the specified stat.

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

> **WARNING** This section is outdated. Functions described here may be outdated and not reflect the current
> implementation of the IoT Agent Library. You could have a look to [iotagentLib.js](./lib/iotagentLib.js) file to see
> the current detail of functions implemented.

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

-   newConfig: Configuration of the Context Server (described in the [Configuration](../admin.md#configuration)
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
handler will be called once for each of the config groups (both in the case of the creations and the updates).

The handler will be also called in the case of updates related to config groups. In that situation, the
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
(described in the [Configuration](../admin.md#configuration) section). If the value is `False` (either was directly
specified `False` in the `config.js` or it was not specified and by default is assigned `False`), it is a normal
(single-thread) behaviour. Nevertheless, if _multiCore_ is `True`, the IoTAgent is executed in multi-thread environment.

The number of parallel processes is calculated based on the number of available CPUs. In case of some of the process
unexpectedly dead, a new process is created automatically to keep always the maximum of them working in parallel.

> Note: `startServer()` initializes the server but it does not activate the library. The function in the Node Lib will
> call the `iotAgent.start()` in order to complete the activation of the library. Therefore, it is expected that the IoT
> Agent implement the `iotAgent.start()` function with the proper invocation to the `iotAgentLib.activate()`.

###### Params

-   newConfig: Configuration of the Context Server (described in the [Configuration](../admin.md#configuration)
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

> **WARNING** This section is outdated. DB fields described here may be outdated and not reflect the current
> implementation of the IoT Agent Library.

The following sections describe the models used in the database to store the information about the devices and the
config groups.

### Config group model

The table below shows the information held in the Config group provisioning resource and the correspondence between the
API resource fields and the same fields in the database model.

You can find the description of the fields in the config group datamodel of the
[API document](../api.md#config-group-datamodel).

| Payload Field                  | DB Field                       | Note                                                                                                                                              |
| ------------------------------ | ------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| `service`                      | `service`                      |                                                                                                                                                   |
| `subservice`                   | `subservice`                   |                                                                                                                                                   |
| `resource`                     | `resource`                     |                                                                                                                                                   |
| `apikey`                       | `apikey`                       |                                                                                                                                                   |
| `timestamp`                    | `timestamp`                    |                                                                                                                                                   |
| `entity_type`                  | `entity_type`                  |                                                                                                                                                   |
| `trust`                        | `trust`                        |                                                                                                                                                   |
| `cbHost`                       | `cbHost`                       |                                                                                                                                                   |
| `lazy`                         | `lazy`                         |                                                                                                                                                   |
| `commands`                     | `commands`                     |                                                                                                                                                   |
| `attributes`                   | `attributes`                   |                                                                                                                                                   |
| `static_attributes`            | `staticAttributes`             |                                                                                                                                                   |
| `internal_attributes`          | `internalAttributes`           |                                                                                                                                                   |
| `explicitAttrs`                | `explicitAttrs`                |                                                                                                                                                   |
| `entityNameExp`                | `entityNameExp`                |                                                                                                                                                   |
| `ngsiVersion`                  | `ngsiVersion`                  |                                                                                                                                                   |
| `defaultEntityNameConjunction` | `defaultEntityNameConjunction` | optional string value to set default conjunction string used to compose a default `entity_name` when is not provided at device provisioning time. |
| `autoprovision`                | `autoprovision`                |                                                                                                                                                   |

### Device model

The table below shows the information held in the Device resource. The table also contains the correspondence between
the API resource fields and the same fields in the database model.

You can find the description of the fields in the config group datamodel of the
[API document](../api.md#device-datamodel).

| Payload Field         | DB Field             | Note                                                                                                                                 |
| --------------------- | -------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| `device_id`           | `id`                 |                                                                                                                                      |
| `service`             | `service`            |                                                                                                                                      |
| `service_path`        | `subservice`         |                                                                                                                                      |
| `entity_name`         | `name`               |                                                                                                                                      |
| `entity_type`         | `type`               |                                                                                                                                      |
| `timezone`            | `timezone`           |                                                                                                                                      |
| `timestamp`           | `timestamp`          |                                                                                                                                      |
| `apikey`              | `apikey`             |                                                                                                                                      |
| `endpoint`            | `endpoint`           |                                                                                                                                      |
| `protocol`            | `protocol`           | Name of the device protocol, for its use with an IoT Manager. IE: IoTA-UL                                                            |
| `transport`           | `transport`          |                                                                                                                                      |
| `attributes`          | `active`             |                                                                                                                                      |
| `lazy`                | `lazy`               |                                                                                                                                      |
| `commands`            | `commands`           |                                                                                                                                      |
| `internal_attributes` | `internalAttributes` | List of internal attributes with free format for specific IoT Agent configuration. I.E:LWM2M mappings from object URIs to attributes |
| `static_attributes`   | `staticAttributes`   |                                                                                                                                      |
| `explicitAttrs`       | `explicitAttrs`      |                                                                                                                                      |
| `ngsiVersion`         | `ngsiVersion`        |                                                                                                                                      |

## Developing a new IoT Agent

> **WARNING** This section is outdated. Methods and steps described here may be outdated and not reflect the current
> implementation of the IoT Agent Library. You could have a look to other IoT Agents developed using the IoT Agent
> Library to get a better idea of how to use it, like the
> [IoT Agent JSON](http://www.github.com/telefonicaid/iotagent-json)

This section's goal is to show how to develop a new IoT Agent step by step. To do so, a simple invented HTTP protocol
will be used, so it can be tested with simple command-line instructions as `curl` and `nc`.

### Protocol

The invented protocol will be freely adapted from
[Ultralight 2.0](https://github.com/telefonicaid/fiware-IoTAgent-Cplusplus/blob/develop/doc/modules.md#ultra-light-agent).
Whenever a device wants to send an update, it will send a request as the following:

```bash
curl -X GET 'http://127.0.0.1:8080/iot/d?i=ULSensor&k=abc&d=t|15,l|19.6' -i
```

Where:

-   **i**: is the device ID.
-   **k**: the API Key for the device's service.
-   **d**: the data payload, consisting of key-value pairs separated by a pipe (`|`), with each pair separated by comma
    (`,`);

### Requirements

This tutorial expects a Node.js v8 (at least) installed and working on your machine. It also expects you to have access
to a Context Broker (without any security proxies).

### Basic IoT Agent

In this first chapter, we will just develop an IoT Agent with a fully connected North Port. This will send and receive
NGSI traffic and can be administered using the IoT Agent's Device Provisioning API. The South Port will remain
unconnected and no native protocol traffic will be sent to the devices. This may seem useless (and indeed it is) but it
will serve us well on showing the basic steps in the creation of an IoT Agent.

First of all, we have to create the Node project. Create a folder to hold your project and type the following
instruction:

```bash
npm init
```

This will create the `package.json` file for our project. Now, add the following lines to your project file:

```json
  "dependencies": {
    "iotagent-node-lib": "*"
  },

```

And install the dependencies, executing, as usual:

```bash
npm install
```

The first step is to write a configuration file, that will be used to tune the behavior of our IOTA. The contents can be
copied from the following example:

```javascript
var config = {
    logLevel: 'DEBUG',
    contextBroker: {
        host: 'localhost',
        port: '1026'
    },
    server: {
        port: 4041
    },
    deviceRegistry: {
        type: 'memory'
    },
    types: {},
    service: 'howtoService',
    subservice: '/howto',
    providerUrl: 'http://localhost:4041',
    defaultType: 'Thing'
};

module.exports = config;
```

Create a `config.js` file with it in the root folder of your project. Remember to change the Context Broker IP to your
local Context Broker.

Now we can begin with the code of our IoT Agent. The very minimum code we need to start an IoT Agent is the following:

```javascript
var iotAgentLib = require('iotagent-node-lib'),
    config = require('./config');

iotAgentLib.activate(config, function (error) {
    if (error) {
        console.log('There was an error activating the IOTA');
        process.exit(1);
    }
});
```

The IoT Agent is now ready to be used. Execute it with the following command:

```bash
node index.js
```

The North Port interface should now be fully functional, i.e.: management of device registrations and config groups.

### IoT Agent With Active attributes

In the previous section we created an IoT Agent that exposed just the North Port interface, but that was pretty useless
(aside from its didactic use). In this section we are going to create a simple South Port interface. It's important to
remark that the nature of the traffic South of the IoT Agent itself has nothing to do with the creation process of an
IoT Agent. Each device protocol will use its own mechanisms and it is up to the IoT Agent developer to find any
libraries that would help him in its development. In this example, we will use Express as such library.

In order to add the Express dependency to your project, add the following line to the `dependencies` section of the
`package.json`:

```json
    "express": "*",
```

The require section would end up like this (the standard `http` module is also needed):

```javascript
var iotAgentLib = require('iotagent-node-lib'),
    http = require('http'),
    express = require('express'),
    config = require('./config');
```

And install the dependencies as usual with `npm install`. You will have to require both `express` and `http` in your
code as well.

Now, in order to accept connections in our code, we have to start express first. With this purpose in mind, we will
create a new function `initSouthbound()`, that will be called from the initialization code of our IoT Agent:

```javascript
function initSouthbound(callback) {
    southboundServer = {
        server: null,
        app: express(),
        router: express.Router()
    };

    southboundServer.app.set('port', 8080);
    southboundServer.app.set('host', '0.0.0.0');

    southboundServer.router.get('/iot/d', manageULRequest);
    southboundServer.server = http.createServer(southboundServer.app);
    southboundServer.app.use('/', southboundServer.router);
    southboundServer.server.listen(southboundServer.app.get('port'), southboundServer.app.get('host'), callback);
}
```

This Express code sets up a HTTP server, listening in the 8080 port, that will handle incoming requests targeting path
`/iot/d` using the middleware `manageULRequest()`. This middleware will contain all the logic south of the IoT Agent,
and the library methods we need in order to progress the information to the Context Broker. The code of this middleware
would be as follows:

```javascript
function manageULRequest(req, res, next) {
    var values;

    iotAgentLib.retrieveDevice(req.query.i, req.query.k, function (error, device) {
        if (error) {
            res.status(404).send({
                message: "Couldn't find the device: " + JSON.stringify(error)
            });
        } else {
            values = parseUl(req.query.d, device);
            iotAgentLib.update(device.name, device.type, '', values, device, function (error) {
                if (error) {
                    res.status(500).send({
                        message: 'Error updating the device'
                    });
                } else {
                    res.status(200).send({
                        message: 'Device successfully updated'
                    });
                }
            });
        }
    });
}
```

For this middleware we have made use of a function `parseUl()` that parses the data payload and transforms it in the
data object expected by the update function (i.e.: an attribute array with NGSI syntax):

```javascript
function parseUl(data, device) {
    function findType(name) {
        for (var i = 0; i < device.active.length; i++) {
            if (device.active[i].name === name) {
                return device.active[i].type;
            }
        }

        return null;
    }

    function createAttribute(element) {
        var pair = element.split('|'),
            attribute = {
                name: pair[0],
                value: pair[1],
                type: findType(pair[0])
            };

        return attribute;
    }

    return data.split(',').map(createAttribute);
}
```

Here as an example of the output of the function return for the UL payload `t|15,l|19.6`:

```json
[
    {
        "name": "t",
        "type": "celsius",
        "value": "15"
    },
    {
        "name": "l",
        "type": "meters",
        "value": "19.6"
    }
]
```

The last thing to do is to invoke the initialization function inside the IoT Agent startup function. The next excerpt
show the modifications in the `activate()` function:

```javascript
iotAgentLib.activate(config, function (error) {
    if (error) {
        console.log('There was an error activating the IOTA');
        process.exit(1);
    } else {
        initSouthbound(function (error) {
            if (error) {
                console.log('Could not initialize South bound API due to the following error: %s', error);
            } else {
                console.log('Both APIs started successfully');
            }
        });
    }
});
```

Some logs were added in this piece of code to help debugging.

Once the IOTA is finished the last thing to do is to test it. To do so, launch the IoT Agent and provision a new device
(an example for provisioning can be found in the `examples/howtoProvisioning1.json` file). Once the device is
provisioned, send a new measure by using the example command:

```bash
curl -X GET 'http://127.0.0.1:8080/iot/d?i=ULSensor&k=abc&d=t|15,l|19.6' -i
```

Now you should be able to see the measures in the Context Broker entity of the device.

### IOTA With Lazy attributes

#### Previous considerations

The IoT Agents also give the possibility for the device to be asked about the value of one of its measures, instead of
reporting it. In order to do so, the device must be capable of receiving messages of some kind. In this case, we are
going to simulate an HTTP server with `nc` in order to see the values sent by the IOTA. We also have to decide a syntax
for the protocol request for asking the device about a measure. For clarity, we will use the same HTTP GET request we
used to report a measure, but indicating the attribute to ask instead of the data payload. Something like:

```bash
curl -X GET 'http://127.0.0.1:9999/iot/d?i=ULSensor&k=abc&q=t,l' -i
```

In a real implementation, the server will need to know the URL and port where the devices are listening, in order to
send the request to the appropriate device. For this example, we will assume that the device is listening in port 9999
in localhost. For more complex cases, the mechanism to bind devices to addresses would be IoT-Agent-specific (e.g.: the
OMA Lightweight M2M IoT Agent captures the address of the device in the device registration, and stores the
device-specific information in a MongoDB document).

Being lazy attributes of a read/write nature, another syntax has to be declared for updating. This syntax will mimic the
one used for updating the server:

```
curl -X GET 'http://127.0.0.1:9999/iot/d?i=ULSensor&k=abc&d=t|15,l|19.6' -i
```

Both types of calls to the device will be distinguished by the presence or absence of the `d` and `q` attributes.

A HTTP request library will be needed in order to make those calls. To this extent, `mikeal/request` library will be
used. In order to do so, add the following require statement to the initialization code:

```javascript
request = require('request');
```

and add the `request` dependency to the `package.json` file:

```json
  "dependencies": [
  [...]

    "request": "*",

  ]
```

The require section should now look like this:

```javascript
var iotAgentLib = require('iotagent-node-lib'),
    http = require('http'),
    express = require('express'),
    request = require('request'),
    config = require('./config');
```

#### Implementation

##### QueryContext implementation

The main step to complete in order to implement the Lazy attributes mechanism in the IoT Agent is to provide handlers
for the context provisioning requests. At this point, we should provide two handlers: the `/v2/op/update` and the
`/v2/op/query` handlers. To do so, we must first define the handlers themselves:

```javascript
function queryContextHandler(id, type, service, subservice, attributes, callback) {
    var options = {
        url: 'http://127.0.0.1:9999/iot/d',
        method: 'GET',
        qs: {
            q: attributes.join()
        }
    };

    request(options, function (error, response, body) {
        if (error) {
            callback(error);
        } else {
            callback(null, createResponse(id, type, attributes, body));
        }
    });
}
```

The queryContext handler is called whenever a `/v2/op/query` request arrives at the North port of the IoT Agent. It is
invoked once for each entity requested, passing the entity ID and Type as the parameters, as well as a list of the
attributes that are requested. In our case, the handler uses this parameters to compose a request to the device. Once
the results of the device are returned, the values are returned to the caller, in the NGSI attribute format.

In order to format the response from the device in a readable way, we created a `createResponse()` function that maps
the values to its correspondent attributes. This function assumes the type of all the attributes is "string" (this will
not be the case in a real scenario, where the IoT Agent should retrieve the associated device to guess the type of its
attributes). Here is the code for the `createResponse()` function:

```javascript
function createResponse(id, type, attributes, body) {
    var values = body.split(','),
        responses = [];

    for (var i = 0; i < attributes.length; i++) {
        responses.push({
            name: attributes[i],
            type: 'string',
            value: values[i]
        });
    }

    return {
        id: id,
        type: type,
        attributes: responses
    };
}
```

##### UpdateContext implementation

```javascript
function updateContextHandler(id, type, service, subservice, attributes, callback) {
    var options = {
        url: 'http://127.0.0.1:9999/iot/d',
        method: 'GET',
        qs: {
            d: createQueryFromAttributes(attributes)
        }
    };

    request(options, function (error, response, body) {
        if (error) {
            callback(error);
        } else {
            callback(null, {
                id: id,
                type: type,
                attributes: attributes
            });
        }
    });
}
```

The updateContext handler deals with the modification requests that arrive at the North Port of the IoT Agent via
`/v2/op/update`. It is invoked once for each entity requested (note that a single request can contain multiple entity
updates), with the same parameters used in the queryContext handler. The only difference is the value of the attributes
array, now containing a list of attribute objects, each containing name, type and value. The handler must also make use
of the callback to return a list of updated attributes.

For this handler we have used a helper function called `createQueryFromAttributes()`, that transforms the NGSI
representation of the attributes to the UL type expected by the device:

```javascript
function createQueryFromAttributes(attributes) {
    var query = '';

    for (var i in attributes) {
        query += attributes[i].name + '|' + attributes[i].value;

        if (i != attributes.length - 1) {
            query += ',';
        }
    }

    return query;
}
```

##### Handler registration

Once both handlers have been defined, they have to be registered in the IoT Agent, adding the following code to the
setup function:

```javascript
iotAgentLib.setDataUpdateHandler(updateContextHandler);
iotAgentLib.setDataQueryHandler(queryContextHandler);
```

Where necessary, additional handlers to deal with command actuations and merge-patch operations may also be added when
necessary.

```javascript
iotAgentLib.setCommandHandler(commandHandler);
iotAgentLib.setMergePatchHandler(mergePatchHandler);
```

##### IOTA Testing

In order to test it, we need to create an HTTP server simulating the device. The quickest way to do that may be using
netcat. In order to start it just run the following command from the command-line (Linux and Mac only):

```bash
nc -l 9999
```

This will open a simple TCP server listening on port `9999`, where the requests from the IoT Agent will be printed. In
order for the complete workflow to work (and to receive the response in the application side), the HTTP response has to
be written in the `nc` console (although for testing purposes this is not needed).

While netcat is great to test simple connectivity, you will need something just a bit more complex to get the complete
scenario working (at least without the need to be incredibly fast sending your response). In order to do so, a simple
echo server was created, that answers 42 to any query to its `/iot/d` path. You can use it to test your attributes one
by one (or you can modify it to accept more requests and give more complex responses). Copy the
[Echo Server script](echo.js) to the same folder of your IoTAgent (as it uses the same dependencies). In order to run
the echo server, just execute the following command:

```bash
node echo.js
```

Once the mock server has been started (either `nc` or the `echo` server), proceed with the following steps to test your
implementation:

1. Provision a device with two lazy attributes. The following request can be used as an example:

```text
POST /iot/devices HTTP/1.1
Host: localhost:4041
Content-Type: application/json
fiware-service: howtoserv
fiware-servicepath: /test
Cache-Control: no-cache
Postman-Token: 993ac66b-72da-9e96-ab46-779677a5896a

{
    "devices": [
      {
        "device_id": "ULSensor",
        "entity_name": "Sensor01",
        "entity_type": "BasicULSensor",
        "lazy": [
            {
                "name": "t",
                "type": "celsius"
            },
            {
                "name": "l",
                "type": "meters"
            }
        ],
        "attributes": [
        ]
      }
    ]
}
```

2. Execute a `/v2/op/query` or `/v2/op/update` against one of the entity attributes (use a NGSI client of curl command).

```text
POST /v2/op/query HTTP/1.1
Host: localhost:1026
Content-Type: application/json
Accept: application/json
Fiware-Service: howtoserv
Fiware-ServicePath: /test
Cache-Control: no-cache

{
  entities: [
    {
      id: 'Light:light1'
    }
  ],
  attrs: ['dimming']
}
```

3. Check the received request in the nc console is the expected one.

4. (In case you use netcat). Answer the request with an appropriate HTTP response and check the result of the
   `/v2/op/query` or `/v2/op/update` request is the expected one. An example of HTTP response, for a query to the `t`
   and `l` attributes would be:

```text
HTTP/1.0 200 OK
Content-Type: text/plain
Content-Length: 3

5,6
```

This same response can be used both for updates and queries for testing purposes (even though in the former the body
won't be read).

### IoT Agent in multi-thread mode

It is possible that an IoT Agent can be executed in multi-thread approach, which will increase the number of
request/seconds that can be manage by the server. It's important to remark that the nature of this functionality in
included in the IoT Agent Node Lib but it is not mandatory that you activate this functionality. In this example, we
will see how to use this functionality to deploy an IoT Agent in multi-thread environment.

In order to activate the functionality, you have two options, configure the `config.js` file to add the following line:

```javascript
/**
 * flag indicating whether the node server will be executed in multi-core option (true) or it will be a
 * single-thread one (false).
 */
config.multiCore = true;
```

or you can define the proper IOTA_MULTI_CORE environment variable. By default, the first choice is the environment
variable and afterward the value of the multiCore in the `config.js` file. The require section would end up like this
(the standard `http` module is also needed):

```javascript
var iotAgent = require('../lib/iotagent-implementation'),
    iotAgentLib = require('iotagent-node-lib'),
    config = require('./config');
```

It is important to mention the purpose of the `iotAgent` variable. It is the proper implementation of the IoT Agent
based on the IoT Agent Node Lib. We will need this variable just to make a callback to the corresponding `start()`
process from the library. The variable `config` is used to get details of the configuration file and send that
information to the Node Lib. The Node Lib will take the decision of single-thread or multi-thread execution base on the
value of `config.multiCore` attribute.

Finally, we can call the corresponding [iotagentLib.startServer()](#iotagentlibstartserver) like the following code with
a callback function to show details about any error during the execution or just print the message about starting the
IoTAgent:

```javascript
iotAgentLib.startServer(config, iotAgent, function (error) {
    if (error) {
        console.log(context, 'Error starting IoT Agent: [%s] Exiting process', error);
    } else {
        console.log(context, 'IoT Agent started');
    }
});
```

> Note: `startServer()` initializes the server but it does not activate the library. The function in the Node Lib will
> call the `iotAgent.start()` in order to complete the activation of the library. Therefore, it is expected that the IoT
> Agent implement the `iotAgent.start()` function with the proper invocation to the `iotAgentLib.activate()`.

### Configuration management

For some IoT Agents, it will be useful to know what devices or config groups were registered in the Agent, or to do
some actions whenever a new device is registered. All this configuration and provisioning actions can be performed using
two mechanisms: the provisioning handlers and the provisioning API.

#### Provisioning handlers

The handlers provide a way for the IoT Agent to act whenever a new device, or configuration is provisioned. This can be
used for registering the device in external services, for storing important information about the device, or to listen
in new ports in the case of new configuration. For the simple example we are developing, we will just print the
information we are receiving whenever a new device or configuration is provisioned.

We need to complete two further steps to have a working set of provisioning handlers. First of all, defining the
handlers themselves. Here we can see the definition of the configuration handler:

```javascript
function configurationHandler(configuration, callback) {
    console.log('\n\n* REGISTERING A NEW CONFIGURATION:\n%s\n\n', JSON.stringify(configuration, null, 4));
    callback(null, configuration);
}
```

As we can see, the handlers receive the device or configuration that is being provisioned, as well as a callback. The
handler MUST call the callback once in order for the IOTA to work properly. If an error is passed as a parameter to the
callback, the provisioning will be aborted. If no error is passed, the provisioning process will continue. This
mechanism can be used to implement security mechanisms or to filter the provisioning of devices to the IoT Agent.

Note also that the same `device` or `configuration` object is passed along to the callback. This lets the IoT Agent
change some of the values provisioned by the user, to add or restrict information in the provisioning. To test this
feature, let's use the provisioning handler to change the value of the type of the provisioning device to
`CertifiedType` (reflecting some validation process performed on the provisioning):

```javascript
function provisioningHandler(device, callback) {
    console.log('\n\n* REGISTERING A NEW DEVICE:\n%s\n\n', JSON.stringify(device, null, 4));
    device.type = 'CertifiedType';
    callback(null, device);
}
```

Once the handlers are defined, the new set of handlers has to be registered into the IoT Agent:

```javascript
iotAgentLib.setConfigurationHandler(configurationHandler);
iotAgentLib.setProvisioningHandler(provisioningHandler);
```

Now we can test our implementation by sending provisioning requests to the North Port of the IoT Agent. If we provision
a new device into the platform, and then we ask for the list of provisioned devices, we shall see the type of the
provisioned device has changed to `CertifiedType`.

## IoT Agent additional tools

The IoT Agent Node Lib provides some additional tools that can be used to ease the development of IoT Agents and test
their functionality.

### Agent Console

A command-line client to experiment with the library is packed with it. The command-line client can be started using the
following command:

```console
bin/agentConsole.js
```

The client offers an API similar to the one offered by the library: it can start and stop an IoT agent, register and
unregister devices, send measures mimicking the device and receive updates of the device data. Take into account that,
by default, the console uses the same `config.js` file than the IoT Agent.

The command-line client creates a console that offers the following options:

```text
stressInit

	Start recording a stress batch.

stressCommit <delay> <times> <threads> <initTime>

	Executes the recorded batch as many times as requested, with delay (ms) between commands.
	The "threads" parameter indicates how many agents will repeat that same sequence. The "initTime" (ms)
	parameter indicates the mean of the random initial waiting times for each agent.

exit

	Exit from the command-line.

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

#### Command-line testing

The library also offers a Context Broker and IoT Agent client that can be used to:

-   Simulate operations to the Context Broker used by the IoT Agent, triggering Context Provider forwardings for lazy
    attributes and checking the appropriate values for active ones.
-   Simulate operations to the Device Provisioning API and Configuration API of the IoT Agent.

The tester can be started with the following command, from the root folder of the project:

```console
bin/iotAgentTester.js
```

From the command-line, the `help` command can be used to show a description of the currently supported features. These
are the following:

```text
stressInit

	Start recording a stress batch.

stressCommit <delay> <times> <threads> <initTime>

	Executes the recorded batch as many times as requested, with delay (ms) between commands.
	The "threads" parameter indicates how many agents will repeat that same sequence. The "initTime" (ms)
	parameter indicates the mean of the random initial waiting times for each agent.

exit

	Exit from the command-line.

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

	Migrate all the devices and groups for the selected service and subservice into the
	specified Mongo database. To perform the migration for all the services or all the
	subservices, use the "*" value.
```

The agent session stores transient configuration data about the target Context Broker and the target IoT Agent. This
configuration is independent, and can be checked with the `showConfigCb` and `showConfigIot` commands, respectively.
Their values can be changed with the `configCb` and `configIot` commands respectively. The new config group will be
deleted upon startup.

---
