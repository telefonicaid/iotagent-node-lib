# User & Programmers Manual

## Index

* [Usage](#usage)
  * [Stats Registry](#statsregistry)
  * [Alarm Module](#alarms)
  * [Logs](#logs)
  * [Transactions](#transactions)
  * [Library Overview](#overview)
  * [Function reference](#reference)
* [Development Documentation](#development)

## <a name="usage"/> Usage
### <a name="statsregistry"/> Stats Registry
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

### <a name="alarms"/> Alarm module

The library provide an alarm module that can be used to track through the logs alarms raised in the IoTAgent. This module
provides:

* Two functions to raise and release and alarm (`raise()` and `release()`): every alarm is identified by a name and a
description. When the alarm is raised, an error with the text `Raising [%s]` is logged. When the alarm is released, the
corresponding text, `Releasing [%s]` is logged. If an alarm is raised multiple times, it is only logged once. If its
released multiple times it is only released once. Releasing a non-existing alarm has no effect.

* Functions to list all the raised alarms and clean all the alarms (`list()` and `clean()`).

* A function to instrument other functions, so when one of that functions return an error, an alarm is raised, and
when it returns a success an alarm is ceased (`intercept()`).

All this functions can be accessed through the `.alarms` attribute of the library.

### <a name="logs"/> Logs
The IoT Agent Library makes use of the [Logops logging library](https://github.com/telefonicaid/logops). This library
is required in a `logger` object, shared between all of the modules. In order for the logging to be consistent across
the diferent modules of an IoTAgent (i.e.: the ones provided by the IoTA Library as well as those created for the
particular IoTAgent), the `logger` object is exported in the `logModule` property of the library. The agents should
use this module for logging.

The IoT Agent Library also provides a configuration API that lets the administrator change and manage the log level
in realtime. This API has the following two actions:

#### Set new log level (PUT /admin/log)
This operation gets the new log level using the query parameter `level`. If the new level is a valid level for Logops
(i.e.: one of the items in the array ['INFO', 'ERROR', 'FATAL', 'DEBUG', 'WARNING']), it will be automatically changed
for future logs.

#### Get log level (GET /admin/log)
Returns the current log level, in a json payload with a single attribute `level`.


### <a name="transactions"/> Transactions
The library implements a concept of transactions, in order to follow the execution flow the library follows when treating
requests entering both from the Northbound and the Southbound.

To follow the transactions, a new Domain is created for each incoming request; in the case of Northbound requests, this
domain is automatically created by a Express middleware, and no further action is needed from the user. For the case of
Southbound requests, the user is responsible of creating an stopping the transaction, using the `ensureSouthboundDomain`
and `finishSouthBoundTransaction`. In this case, the transaction will last from the invocation to the former to the
invocation of the latter.

The Transaction Correlator is used along all the IoT Platform to follow the trace of a transaction between multiple components.
To do so, in all the HTTP requests sent to other components of the platform, a custom header named `Fiware-Correlator` is sent with the
correlator of the transaction that generated the request. If a component of the platform receives a request containing
this header that starts a transaction, the component will create the transaction with the received correlator, instead
of creating a new one. If the header is not present or the transaction originates in the component, the transaction ID in
this component will be used as the correlator.

During the duration of a transaction, all the log entries created by the code will write the current Transaction ID and
correlator for the operation being executed.

### <a name="overview"/> Library overview
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

### <a name="reference"/> Function reference
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
function unregisterDevice(id, service, subservice, callback)
```
###### Description
Unregister a device from the Context broker and the internal registry.
###### Params
 * id: Device ID of the device to register.
 * service: Service of the device to unregister.
 * subservice: Subservice inside the service for the unregisterd device.

##### iotagentLib.update()
###### Signature
```
update(entityName, attributes, typeInformation, token, callback)
```
###### Description
Makes an update in the Device's entity in the context broker, with the values given in the 'attributes' array. This
array should comply to the NGSI's attribute format.

###### Params
 * entityName: Name of the entity to register.
 * attributes: Attribute array containing the values to update.
 * typeInformation: Configuration information for the device.
 * token: User token to identify against the PEP Proxies (optional).

##### iotagentLib.setCommandResult()
###### Signature
```
setCommandResult(entityName, resource, apikey, commandName, commandResult, status, deviceInformation, callback)
```
###### Description
Update the result of a command in the Context Broker. The result of the command has two components: the result
of the command itself will be represented with the sufix '_result' in the entity while the status is updated in the
attribute with the '_info' sufix.

###### Params
 * entityName: Name of the entity holding the command.
 * resource: Resource name of the endpoint the device is calling.
 * apikey: Apikey the device is using to send the values (can be the empty string if none is needed).
 * commandName: Name of the command whose result is being updated.
 * commandResult: Result of the command in string format.
 * deviceInformation: Device information, including security and service information. (optional).


##### iotagentLib.listDevices()
###### Signature
```
function listDevices(callback)
function listDevices(limit, offset, callback)
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
Sets the new user handler for Entity update requests. This handler will be called whenever an update request arrives
with the following parameters: (id, type, service, subservice, attributes, callback). The handler is in charge of
updating the corresponding values in the devices with the appropriate protocol.

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

In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each
entity, and all the results will be combined into a single response.
###### Params
 * newHandler: User handler for update requests

##### iotagentLib.setDataQueryHandler()
###### Signature
```
function setDataQueryHandler(newHandler)
```
###### Description
Sets the new user handler for Entity query requests. This handler will be called whenever a query request arrives,
with the following parameters: (id, type, service, subservice, attributes, callback). The handler must retrieve all the
corresponding information from the devices and return a NGSI entity with the requested values.

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

In the case of NGSI requests affecting multiple entities, this handler will be called multiple times, one for each
entity, and all the results will be combined into a single response.
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
Sets the new user handler for the configuration updates. This handler will be called every time a new configuration is
created or an old configuration is updated.

The handler must adhere to the following signature:
```
function(newConfiguration, callback)
```
The `newConfiguration` parameter will contain the newly created configuration. The handler is expected to call its
callback with no parameters (this handler should only be used for reconfiguration purposes of the IOT Agent).

For the cases of multiple updates (a single Device Configuration POST that will create several device groups), the
handler will be called once for each of the configurations (both in the case of the creations and the updates).


##### iotagentLib.getDevice()
###### Signature
```
function getDevice(deviceId, service, subservice, callback)
```
###### Description
Retrieve all the information about a device from the device registry.
###### Params
 * deviceId: ID of the device to be found.
 * service: Service for which the requested device.
 * subservice: Subservice inside the service for which the device is requested.

##### iotagentLib.getDeviceByName()
###### Signature
```
function getDeviceByName(deviceName, service, subservice, callback)
```
###### Description
Retrieve a device from the registry based on its entity name.

###### Params
* deviceName: Name of the entity associated to a device.
* service: Service the device belongs to.
* subservice: Division inside the service.

##### iotagentLib.getDevicesByAttribute()
###### Signature
```
function getDevicesByAttribute(attributeName, attributeValue, service, subservice, callback)
```
###### Description
Retrieve all the devices having an attribute named `name` with value `value`.

###### Params
* name: name of the attribute to match.
* value: value to match in the attribute.
* service: Service the device belongs to.
* subservice: Division inside the service.


##### iotagentLib.retrieveDevice()
###### Signature
```
function retrieveDevice(deviceId, apiKey, callback)
```
###### Description
Retrieve a device from the device repository based on the given APIKey and DeviceID, creating one if none is found
for the given data.

###### Params
* deviceId: Device ID of the device that wants to be retrieved or created.
* apiKey: APIKey of the Device Group (or default APIKey).

##### iotagentLib.mergeDeviceWithConfiguration()
###### Signature
```
function mergeDeviceWithConfiguration(fields, defaults, deviceData, configuration, callback)
```
###### Description
Complete the information of the device with the information in the configuration group (with precedence of the
device). The first argument indicates what fields would be merged.

###### Params
* fields: Fields that will be merged.
* defaults: Default values fot each of the fields.
* deviceData: Device data.
* configuration: Configuration data.

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

##### iotagentLib.getEffectiveApiKey()
###### Signature
```
function getEffectiveApiKey(service, subservice, type, callback)
```
###### Description
Get the API Key for the selected service if there is any, or the default API Key if a specific one does not exist.

###### Params
* service: Name of the service whose API Key we are retrieving.
* subservice: Name of the subservice whose API Key we are retrieving.
* type: Type of the device.

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

##### iotagentLib.unsubscribe()
###### Signature
```
function unsubscribe(device, id, callback)
```
###### Description
Removes a single subscription from the selected device, identified by its id.

###### Params
* device: Object containing all the information about a particular device.
* id: ID of the subscription to remove.


##### iotagentLib.ensureSouthboundDomain()
###### Signature
```
function ensureSouthboundTransaction(context, callback)
```
###### Description
Ensures that the current operation is executed inside a transaction with all the information needed
for the appropriate platform logging: start date, transaction ID and correlator in case one is needed.
If the function is executed in the context of a previous transaction, just the context is changed
(and the Transaction ID and start time are kept).

###### Params
* context: New context data for the transaction.


##### iotagentLib.finishSouthBoundTransaction()
```
function finishSouthboundTransaction(callback)
```
###### Description
Terminates the current transaction, if there is any, cleaning its context.

#### Generic middlewares
This collection of utility middlewares is aimed to be used in the northbound of the IoTAgent Library, as well as in other
HTTP-based APIs of the IoTAs. All the middlewares follow the Express convention of (req, res, next) objects, so this
information will not be repeated in the descriptions for the middleware functions. All the middlewares can be added
to the servers using the standard Express mechanisms.

##### iotagentLib.middlewares.handleError()
###### Signature
```
function handleError(error, req, res, next)
```
###### Description
Express middleware for handling errors in the IoTAs. It extracts the code information to return from the error itself
returning 500 when no error code has been found.


##### iotagentLib.middlewares.traceRequest()
###### Signature
```
function traceRequest(req, res, next)
```
###### Description
Express middleware for tracing the complete request arriving to the IoTA in debug mode.


##### iotagentLib.middlewares.changeLogLevel()
###### Signature
```
function changeLogLevel(req, res, next)
```
###### Description
Changes the log level to the one specified in the request.

##### iotagentLib.middlewares.ensureType()
###### Signature
```
function ensureType(req, res, next)
```
###### Description
Ensures the request type is one of the supported ones.

##### iotagentLib.middlewares.validateJson()
###### Signature
```
function validateJson(template)
```
###### Description
Generates a Middleware that validates incoming requests based on the JSON Schema template passed as a parameter.

Returns an Express middleware used in request validation with the given template.

###### Params
* *template*: JSON Schema template to validate the request.

##### iotagentLib.middlewares.retrieveVersion()
###### Signature
```
function retrieveVersion(req, res, next)
```
###### Description
Middleware that returns all the IoTA information stored in the module.


##### iotagentLib.middlewares.setIotaInformation()
###### Signature
```
function setIotaInformation(newIoTAInfo)
```
###### Description
Stores the information about the IoTAgent for further use in the `retrieveVersion()` middleware.

###### Params
* *newIoTAInfo*: Object containing all the IoTA Information.



## <a name="development"/> Development documentation
### Contributions
All contributions to this project are welcome. Developers planning to contribute should follow the [Contribution Guidelines](./docs/contribution.md)

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
