# Administration

-   [Configuration](#configuration)
    -   [Configuration parameters:](#configuration-parameters)
        -   [loglevel](#loglevel)
        -   [contextBroker](#contextbroker)
        -   [server](#server)
        -   [authentication](#authentication)
        -   [deviceRegistry](#deviceregistry)
        -   [mongodb](#mongodb)
        -   [iotManager](#iotmanager)
        -   [types](#types)
        -   [service](#service)
        -   [subservice](#subservice)
        -   [providerUrl](#providerurl)
        -   [iotaVersion](#iotaversion)
        -   [dieOnUnexpectedError](#dieonunexpectederror)
        -   [timestamp](#timestamp)
        -   [defaultResource](#defaultresource)
        -   [defaultKey](#defaultkey)
        -   [componentName](#componentname)
        -   [pollingExpiration](#pollingexpiration)
        -   [pollingDaemonFrequency](#pollingdaemonfrequency)
        -   [multiCore](#multicore)
        -   [fallbackTenant](#fallbacktenant)
        -   [fallbackPath](#fallbackpath)
        -   [explicitAttrs](#explicitattrs)
        -   [defaultEntityNameConjunction](#defaultentitynameconjunction)
        -   [relaxTemplateValidation](#relaxtemplatevalidation)
    -   [Configuration using environment variables](#configuration-using-environment-variables)
-   [Logs](#logs)
    -   [Errors](#errors)
-   [Alarms](#alarms)

The **IoT Agent node library** is not a standalone product and should be added as a dependency to `package.json` of the
project is going to be used in. The library is published in the npm repository, so it can be added to the project by
adding the following line to the `package.json` file:

```json
...
"dependencies": {
    "iotagent-node-lib": "x.y.z",
}
```

wher `x.y.z` is an actual version number.

As alternative, you can use the master branch as dependency. In this case, you will be using the latest version of the
code but note that some instability could exist (as the code in master is work in progress until the next version is
closed).

```json
...
"dependencies": {
    "iotagent-node-lib": "https://github.com/telefonicaid/iotagent-node-lib.git#master",
}
```

In order to use the library within your own IoT Agent, you must first you require it before use:

```javascript
const iotagentLib = require('iotagent-node-lib');
```

## Configuration

The `activate()` function that starts the IoT Agent receives as single parameter with the configuration for the IoT
Agent. The Agent Console reads the same configuration from the `config.js` file or from the environment variables. The
configuration parameters work in the same way in both cases but the environment variables have precedence over the
`config.js` file. The following sections describe the configuration parameters that can be used in the IoT Agent.

### Configuration parameters:

These are the parameters that can be configured in the global section:

#### `loglevel`

It is the minimum log level to log. May take one of the following values: DEBUG, INFO, ERROR, FATAL. E.g.: 'DEBUG'.

#### `contextBroker`

It configures the connection parameters to stablish a connection to the Context Broker (host and port). E.g.:

```javascript
{
    host: '192.168.56.101',
    port: '1026'
}
```

-   If you want to use **NGSI v2**:

```javascript
{
    host: '192.168.56.101',
    port: '1026',
    ngsiVersion: 'v2'
}
```

-   If you want to use **NGSI-LD** (experimental):

```javascript
{
    host: '192.168.56.101',
    port: '1026',
    ngsiVersion: 'ld',
    jsonLdContext: 'http://context.json-ld' // or ['http://context1.json-ld','http://context2.json-ld'] if you need more than one
}
```

Where `http://context.json-ld` is the location of the NGSI-LD `@context` element which provides additional information
allowing the computer to interpret the rest of the data with more clarity and depth. Read the
[JSON-LD specification](https://w3c.github.io/json-ld-syntax/#the-context) for more information.

-   If you want to support a "mixed" mode with both **NGSI-v2** and **NGSI-LD** (experimental):

```javascript
{
    host: '192.168.56.101',
    port: '1026',
    ngsiVersion: 'mixed',
    jsonLdContext: 'http://context.json-ld' // or ['http://context1.json-ld','http://context2.json-ld'] if you need more than one
}
```

Under mixed mode, **NGSI v2** payloads are used for context broker communications by default, but this payload may also
be switched to **NGSI LD** at group or device provisioning time using the `ngsiVersion` field in the provisioning API.
The `ngsiVersion` field switch may be added at either group or device level, with the device level overriding the group
setting.

#### `server`

This parameter is used to create the Context Server (port where the IoT Agent will be listening as a Context Provider
and base root to prefix all the paths). The `port` attribute is required. If no `baseRoot` attribute is used, '/' is
used by default. E.g.:

```javascript
{
    baseRoot: '/',
    port: 4041
}
```

When connected to an **NGSI-LD** context broker, an IoT Agent is able to indicate whether it is willing to accept `null`
values and also whether it is able to process the **NGSI-LD** `datasetId` metadata element. Setting these values to
`false` will cause the IoT Agent to return a 400 **Bad Request** HTTP status code explaining that the IoT Agent does not
support nulls or multi-attribute requests if they are encountered.

```javascript
{
    baseRoot: '/',
    port: 4041,
    ldSupport : {
      null: true,
      datasetId: true
    }
}
```

#### `authentication`

Stores the authentication data, for use in retrieving tokens for devices with a trust token (required in scenarios with
security enabled in the Context Broker side). Currently, two authentication provider are supported: `keystone` and
`oauth2`. Authentication need to be enabled by setting the field `enabled` to `true`. In `keystone` based
authentication, the `trust` associated to the `device` or `deviceGroup` is a token representing a specific user and his
rights on a given domain (i.e. combination of `fiware-service` and `fiware-servicepath`). The authentication process use
the trust delegation workflow to check if the trust provided is valid, in which case return a `x-subject-token` that can
be used to authenticate the request to the Context Broker. Required parameters are: the `url` of the keystone to be used
(alternatively `host` and `port` but if you use this combination, the IoT Agent will assume that the protocol is HTTP),
the `user` and `password` to which it is delegated the `trust` verification. E.g.:

```javascript
{
    enabled: true,
    url: 'https://localhost:5000',
    type: 'keystone',
    user: 'iotagent',
    password: 'iotagent'
}
```

In `oauth2` based authentication, two types of tokens can be used depending on the availability in the IDM to be used.
On one hand, the `trust` associated to the `device` or `deviceGroup` is a `refresh_token` issued by a specific user for
the Context Broker client. The authentication process uses the
[`refresh_token` grant type](https://tools.ietf.org/html/rfc6749#section-1.5) to obtain an `access_token` that can be
used to authenticate the request to the Context Broker. At the time being the assumption is that the `refresh_token` is
a not expiring `offline_token` (we believe this is the best solution in the case of IoT Devices, since injecting a
refresh token look may slow down communication. Still, the developer would be able to invalidate the refresh token on
the provider side in case of security issues connected to a token). The code was tested using
[Keycloak](http://www.keycloak.org), [Auth0](https://auth0.com) and [FIWARE Keyrock](https://github.com/ging/fiware-idm)
(it may require customisation for other providers - while OAuth2 is a standard, not all implementations behave in the
same way, especially as regards status codes and error messages). Required parameters are: the `url` of the OAuth 2
provider to be used (alternatively `host` and `port` but if you use this combination, the IoT Agent will assume that the
protocol is HTTP), the `tokenPath` to which the validation request should be sent
(`/auth/realms/default/protocol/openid-connect/token` for Keycloak and Auth0, `/oauth2/token` for Keyrock), the
`clientId` and `clientSecret` that identify the Context Broker, and the `header` field that should be used to send the
authentication request (that will be sent in the form `Authorization: Bearer <access_token>`). E.g.:

```javascript
{
    enabled: true,
    type: 'oauth2',
    url: 'http://localhost:3000',
    header: 'Authorization',
    clientId: 'context-broker',
    clientSecret: 'c8d58d16-0a42-400e-9765-f32e154a5a9e',
    tokenPath: '/auth/realms/default/protocol/openid-connect/token'
}
```

Nevertheless, this kind of authentication relying on `refresh_token` grant type implies that when the acces_token
expires, it is needed to request a new one from the IDM, causing some overhead in the communication with the Context
Broker. To mitigate this issue, FIWARE KeyRock IDM implements `permanent tokens` that can be retrieved using
`scope=permanent`. With this approach, the IOTA does not need to interact with the IDM and directly include the
`permanent token` in the header. In order to use this type of token, an additional parameter `permanentToken` must be
set to `true` in the `authentication` configuration. An environment variable `IOTA_AUTH_PERMANENT_TOKEN` can be also
used for the same purpose. For instance:

```javascript
{
    type: 'oauth2',
    url: 'http://localhost:3000',
    header: 'Authorization',
    clientId: 'context-broker',
    clientSecret: '0c2492e1-3ce3-4cca-9723-e6075b89c244',
    tokenPath: '/oauth2/token',
    enabled: true,
    permanentToken: true
}
```

#### `deviceRegistry`

Stores type of Device Registry to create. Currently, two values are supported: `memory` and `mongodb`. If the former is
configured, a transient memory-based device registry will be used to register all the devices. This registry will be
emptied whenever the process is restarted. If the latter is selected, a MongoDB database will be used to store all the
device information, so it will be persistent from one execution to the other. Mongodb databases must be configured in
the `mongob` section (as described bellow). E.g.:

```javascript
{
    type: 'mongodb';
}
```

#### `mongodb`

It configures the MongoDB driver for those repositories with 'mongodb' type. If the `host` parameter is a list of
comma-separated IPs, they will be considered to be part of a Replica Set. In that case, the optional property
`replicaSet` should contain the Replica Set name. If the database requires authentication, username (`user`), password
(`password`) and authSource (`authSource`) can be set. If the database requires TLS/SSL connection but any validation of
the certificate chain is not mandatory, all you need is to set the ssl (`ssl`) option as `true` to connect the database.
If you need to add more complex option(s) such as `retryWrites=true` or `w=majority` when connection database, extraArgs
(`extraArgs`) can be used to perform it. For The MongoBD driver will retry the connection at startup time `retries`
times, waiting `retryTime` seconds between attempts, if those attributes are present (default values are 5 and 5
respectively). E.g.:

```javascript
{
  host: 'localhost',
  port: '27017',
  db: 'iotagent',
  retries: 5,
  retryTime: 5
}
```

```javascript
{
  host: 'mongodb-0,mongodb-1,mongodb-2',
  port: '27017',
  db: 'iotagent',
  replicaSet: 'rs0',
  user: 'rootuser',
  password: 'password',
  authSource: 'admin',
  ssl: true,
  extraArgs: {
    retryWrites: true,
    readPreference: 'nearest',
    w: 'majority'
  },
  retries: 5,
  retryTime: 5
}
```

#### `iotManager`

This parameter configures all the information needed to register the IoT Agent in the IoTManager. If this section is
present, the IoTA will try to register to a IoTAM in the `host`, `port` and `path` indicated, with the information
configured in the object. The IoTAgent URL that will be reported will be the `providedUrl` (described below) with the
added `agentPath`:

```javascript
{
    host: 'mockediotam.com',
    port: 9876,
    path: '/protocols',
    protocol: 'GENERIC_PROTOCOL',
    description: 'A generic protocol',
    agentPath: '/iot'
}
```

#### `types`

This parameter includes additional groups configuration as described into the
[Config group API](api.md#config-group-api) section.

#### `service`

Default service for the IoT Agent. If a device is being registered, and no service information comes with the device
data, and no service information is configured for the given type, the default IoT agent service will be used instead.
E.g.: 'smartGondor'.

#### `subservice`

default subservice for the IoT Agent. If a device is being registered, and no subservice information comes with the
device data, and no subservice information is configured for the given type, the default IoT agent subservice will be
used instead. E.g.: '/gardens'.

#### `providerUrl`

URL to send in the Context Provider registration requests. Should represent the external IP of the deployed IoT Agent
(the IP where the Context Broker will redirect the NGSI requests). E.g.: 'http://192.168.56.1:4041'.

#### `iotaVersion`

indicates the version of the IoTA that will be displayed in the about method (it should be filled automatically by each
IoTA).

#### `dieOnUnexpectedError`

if this flag is activated, the IoTAgent will not capture global exception, thus dying upon any unexpected error.

#### `timestamp`

if this flag is activated:

-   For NGSI-v2, the IoT Agent will add a `TimeInstant` metadata attribute to all the attributes updated from device
    information. This flag is overwritten by `timestamp` flag in group or device
-   With NGSI-LD, the standard `observedAt` property-of-a-property is created instead.

#### `defaultResource`

default string to use as resource for the registration of new config groups (if no resource is provided).

#### `defaultKey`

default string to use as API Key for devices that do not belong to a particular Configuration.

#### `componentName`

default string identifying the component name for this IoT Agent in the logs.

#### `pollingExpiration`

expiration time for commands waiting in the polling queue in miliseconds. If a command has been in the queue for this
amount of time without being collected by the device, the expiration daemon will reclaim it. This attribute is optional
(if it doesn't exist, commands won't expire).

#### `pollingDaemonFrequency`

time between collection of expired commands in milliseconds. This attribute is optional (if this parameter doesn't exist
the polling daemon won't be started).

#### `multiCore`

When enabled, the IoT Agents runs in multi-thread environment to take advantage of multi-core systems. It allows two
values `true` or `false`. This attribute is optional with default to false, which means that the IoTAgent runs in a
single thread. For more details about multi-core functionality, please refer to the
[Cluster](https://nodejs.org/api/cluster.html) module in Node.js and
[this section](devel/development.md#iot-agent-in-multi-thread-mode) of the library documentation.

#### `fallbackTenant`

For Linked Data Context Brokers which do not support multi-tenancy, this provides an alternative mechanism for supplying
the `NGSILD-Tenant` header. Note that NGSILD-Tenant has not yet been included in the NGSI-LD standard (it has been
proposed for the next update of the standard, but the final decision has yet been confirmed), take into account it could
change. Note that for backwards compatibility with NGSI v2, the `fiware-service` header is already used as alternative
if the `NGSILD-Tenant` header is not supplied.

#### `fallbackPath`

For Linked Data Context Brokers which do not support a service path, this provides an alternative mechanism for suppling
the `NGSILD-Path` header. Note that for backwards compatibility with NGSI v2, the `fiware-servicepath` header is already
used as alternative if the `NGSILD-Path` header is not supplied. Note that NGSILD-Path has not yet been included in the
NGSI-LD standard (it has been proposed for the next update of the standard, but the final decision has yet been
confirmed), take into account it could change

#### `explicitAttrs`

if this flag is activated, only provisioned attributes will be processed to Context Broker. This flag is overwritten by
`explicitAttrs` flag in group or device provision. Additionally `explicitAttrs` can be used to define which meassures
defined in JSON/JEXL array will be propagated to NGSI interface.

#### `defaultEntityNameConjunction`

the default conjunction string used to compose a default `entity_name` when is not provided at device provisioning time;
in that case `entity_name` is composed by `type` + `:` + `device_id`. Default value is `:`. This value is overwritten by
`defaultEntityNameConjunction` in group provision.

#### `relaxTemplateValidation`

if this flag is activated, `objectId` attributes for incoming devices are not validated, and may exceptionally include
characters (such as semi-colons) which are
[forbidden](https://fiware-orion.readthedocs.io/en/master/user/forbidden_characters/index.html) according to the NGSI
specification. When provisioning devices, it is necessary that the developer provides valid `objectId`-`name` mappings
whenever relaxed mode is used, to prevent the consumption of forbidden characters.

#### `expressLimit`

IotAgents, as all Express applications that use the body-parser middleware, have a default limit to the request body
size that the application will handle. This default limit for ioiotagnets are 1Mb. So, if your IotAgent receives a
request with a body that exceeds this limit, the application will throw a “Error: Request entity too large”.

The 1Mb default can be changed setting the `expressLimit` configuration parameter (or equivalente `IOTA_EXPRESS_LIMIT`
environment variable).

#### `storeLastMeasure`

If this flag is activated, last measure arrived to Device IoTAgent without be processed will be stored in Device under
`lastMeasure` field (composed of sub-fields `timestamp` and `measure` for the measure itself, in multi-measure format).
This flag is overwritten by `storeLastMeasure` flag in group or device. This flag is disabled by default.

For example in a device document stored in MongoDB will be extended with a subdocument named lastMeasure like this:

```json
{
    "lastMeasure": {
        "timestamp": "2025-01-09T10:35:33.079Z",
        "measure": [
            [
                {
                    "name": "level",
                    "type": "Text",
                    "value": 33
                }
            ]
        ]
    }
}
```

#### `useCBflowControl`

If this flag is activated, when iotAgent invokes Context Broker will use [flowControl option](https://github.com/telefonicaid/fiware-orion/blob/master/doc/manuals/admin/perf_tuning.md#updates-flow-control-mechanism). This flag is overwritten by
`useCBflowControl` flag in group or device. This flag is disabled by default.

### Configuration using environment variables

Some of the configuration parameters can be overriden with environment variables, to ease the use of those parameters
with container-based technologies, like Docker, Heroku, etc...

The following table shows the accepted environment variables, as well as the configuration parameter the variable
overrides.

| Environment variable                 | Configuration attribute         |
| :----------------------------------- | :------------------------------ |
| IOTA_CB_URL                          | `contextBroker.url`             |
| IOTA_CB_HOST                         | `contextBroker.host`            |
| IOTA_CB_PORT                         | `contextBroker.port`            |
| IOTA_CB_NGSI_VERSION                 | `contextBroker.ngsiVersion`     |
| IOTA_NORTH_HOST                      | `server.host`                   |
| IOTA_NORTH_PORT                      | `server.port`                   |
| IOTA_LD_SUPPORT_NULL                 | `server.ldSupport.null`         |
| IOTA_LD_SUPPORT_DATASET_ID           | `server.ldSupport.datasetId`    |
| IOTA_PROVIDER_URL                    | `providerUrl`                   |
| IOTA_AUTH_ENABLED                    | `authentication.enabled`        |
| IOTA_AUTH_TYPE                       | `authentication.type`           |
| IOTA_AUTH_HEADER                     | `authentication.header`         |
| IOTA_AUTH_URL                        | `authentication.url`            |
| IOTA_AUTH_HOST                       | `authentication.host`           |
| IOTA_AUTH_PORT                       | `authentication.port`           |
| IOTA_AUTH_USER                       | `authentication.user`           |
| IOTA_AUTH_PASSWORD                   | `authentication.password`       |
| IOTA_AUTH_CLIENT_ID                  | `authentication.clientId`       |
| IOTA_AUTH_CLIENT_SECRET              | `authentication.clientSecret`   |
| IOTA_AUTH_TOKEN_PATH                 | `authentication.tokenPath`      |
| IOTA_AUTH_PERMANENT_TOKEN            | `authentication.permanentToken` |
| IOTA_REGISTRY_TYPE                   | `deviceRegistry.type`           |
| IOTA_LOG_LEVEL                       | `logLevel`                      |
| IOTA_TIMESTAMP                       | `timestamp`                     |
| IOTA_IOTAM_URL                       | `iotManager.url`                |
| IOTA_IOTAM_HOST                      | `iotManager.host`               |
| IOTA_IOTAM_PORT                      | `iotManager.port`               |
| IOTA_IOTAM_PATH                      | `iotManager.path`               |
| IOTA_IOTAM_AGENTPATH                 | `iotManager.agentPath`          |
| IOTA_IOTAM_PROTOCOL                  | `iotManager.protocol`           |
| IOTA_IOTAM_DESCRIPTION               | `iotManager.description`        |
| IOTA_MONGO_HOST                      | `mongodb.host`                  |
| IOTA_MONGO_PORT                      | `mongodb.port`                  |
| IOTA_MONGO_DB                        | `mongodb.db`                    |
| IOTA_MONGO_REPLICASET                | `mongodb.replicaSet`            |
| IOTA_MONGO_USER                      | `mongodb.user`                  |
| IOTA_MONGO_PASSWORD                  | `mongodb.password`              |
| IOTA_MONGO_AUTH_SOURCE               | `mongodb.authSource`            |
| IOTA_MONGO_RETRIES                   | `mongodb.retries`               |
| IOTA_MONGO_RETRY_TIME                | `mongodb.retryTime`             |
| IOTA_MONGO_SSL                       | `mongodb.ssl`                   |
| IOTA_MONGO_EXTRAARGS                 | `mongodb.extraArgs`             |
| IOTA_POLLING_EXPIRATION              | `pollingExpiration`             |
| IOTA_POLLING_DAEMON_FREQ             | `pollingDaemonFrequency`        |
| IOTA_MULTI_CORE                      | `multiCore`                     |
| IOTA_JSON_LD_CONTEXT                 | `jsonLdContext`                 |
| IOTA_FALLBACK_TENANT                 | `fallbackTenant`                |
| IOTA_FALLBACK_PATH                   | `fallbackPath`                  |
| IOTA_EXPLICIT_ATTRS                  | `explicitAttrs`                 |
| IOTA_DEFAULT_ENTITY_NAME_CONJUNCTION | `defaultEntityNameConjunction`  |
| IOTA_RELAX_TEMPLATE_VALIDATION       | `relaxTemplateValidation`       |
| IOTA_EXPRESS_LIMIT                   | `expressLimit`                  |
| IOTA_STORE_LAST_MEASURE              | `storeLastMeasure`              |
| IOTA_CB_FLOW_CONTROL                 | `useCBflowControl`              |

Note:

-   If you need to pass more than one JSON-LD context, you can define the IOTA_JSON_LD_CONTEXT environment variable as a
    comma separated list of contexts (e.g. `'http://context1.json-ld,http://context2.json-ld'`)

## Logs

This section describes the logs that can be generated by the IoT Agent library. The IoT Agent library uses the following
log levels:

| Level   | Description                                                                       |
| :------ | :-------------------------------------------------------------------------------- |
| `DEBUG` | Used to log information useful for debugging.                                     |
| `INFO`  | Used to log information about the normal operation of the IoT Agent library.      |
| `ERROR` | Used to log information about errors that may affect the IoT Agent library.       |
| `FATAL` | Used to log information about fatal errors that may affect the IoT Agent library. |

Additionally, every error log has an associated error code that can be used to identify the error. The error codes are
composed by a prefix and a number. The following table shows the prefixes used in the IoT Agent library:

| Prefix             | Type of operation                                          |
| :----------------- | :--------------------------------------------------------- |
| `MONGODB`          | Errors related with the MongoDB repository                 |
| `IOTAM`            | Errors related with the IoTA Manager                       |
| `KEYSTONE`         | Errors related with trust token retrieval                  |
| `ORION`            | Errors in Context Broker access                            |
| `VALIDATION-FATAL` | Errors related with management of the Validation templates |

### Errors

| Error code             | Error name                                                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| :--------------------- | :----------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GENERAL-001`          | Couldn't find callback in listDevices call.                        | Implies that the callback function was not found in the listDevices call. This error is thrown when the callback function is not provided in the listDevices call.                                                                                                                                                                                                                                                                                                                                                                                                           |
| `MONGODB-001`          | Error trying to connect to MongoDB: %s                             | Implies there has been an error connecting with the DB. The component will automatically retry from this error, but it may be a sign of connectivity problems between the DB and the component. If the connection cannot be restablished from this error, a MONGODB-002 error will be raised.                                                                                                                                                                                                                                                                                |
| `MONGODB-002`          | Error found after [%d] attempts: %s                                | Indicates that it was impossible to establish a connection to the MongoDB cluster, even after retrying N times. This could be caused by a connectivity problem with the MongoDB machine, a problem in the MongoDB cluster, or a misconfiguration of the IoTA Manager. Check the conectivity, the state of the MongoDB cluster and the Mongo configuration data.                                                                                                                                                                                                              |
| `MONGODB-003`          | No host found for MongoDB driver.                                  | This error will thrown if MongoDB is selected as the configured repository for data but some information is missing in the configuration file. Check the configuration file and add all the required information.                                                                                                                                                                                                                                                                                                                                                            |
| `MONGODB-004`          | MongoDB connection was lost.                                       | Indicates that it was impossible to reestablish the connection with the MongoDB server after retrying N times. This could be caused by a connectivity problem with the MongoDB machine or by changes on the configuration of the MongoDB server done while the IoT Agent was running. This error is only thrown when using a single MongoDB instance or when using sharding but just a single mongos proxy. When using MongoDB instances using replica sets or multiple mongos servers, the IoT Agent will retry connecting forever alternating between the different nodes. |
| `IOTAM-001`            | Error updating information in the IOTAM. Status Code [%d]          | The IoT Agent could not contact the IoT Agent manager to update its information. This condition may indicate a lack of connectivity between machines or a problem in the IoT Agent Manager. The IoT Agent information in the IoT Agent Manager will be out-of-date until this problem is solved.                                                                                                                                                                                                                                                                             |
| `KEYSTONE-001`         | Error retrieving token from Keystone: %s                           | There was connection error connecting with Keystone to retrieve a token. This condition may indicate a lack of connectivity between both machines or a problem with Keystone.                                                                                                                                                                                                                                                                                                                                                                                                |
| `KEYSTONE-002`         | Unexpected status code: %d                                         | There was a problem retrieving a token from keystone that was not caused by connectivity errors. Check the Keystone log for errors and the security configuration in the IoTAgent. This may also be caused by a wrong trust token used by the user.                                                                                                                                                                                                                                                                                                                          |
| `KEYSTONE-003`         | Token missing in the response headers.                             | Authentication flow worked correctly, but the response headers did not include the expected header `x-subject-token`. Check the Keystone logs and configuration.                                                                                                                                                                                                                                                                                                                                                                                                             |
| `OAUTH2-001`           | Error retrieving token from OAuth2 provider: %s                    | There was connection error connecting with OAuth2 provider to retrieve a token. This condition may indicate a lack of connectivity between both machines or a problem with OAuth2 provider.                                                                                                                                                                                                                                                                                                                                                                                  |
| `OAUTH2-002`           | Unexpected status code: %d                                         | There was a problem retrieving a token from OAuth2 provider that was not caused by connectivity errors. Check the OAuth2 provider log for errors and the security configuration in the IoTAgent. This may also be caused by an invalid `refresh_token` used by the user.                                                                                                                                                                                                                                                                                                     |
| `OAUTH2-003`           | Token missing in the response body                                 | The JSON response body returned by the OAuth2 provider does not include a field `access_token`. Check the OAuth2 logs and configuration.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `ORION-001`            | Connection error creating initial entity in the Context Broker: %s | There was a connectivity error accessing Context Broker to create an initial entity (or the Context Broker was down). Check connectivity between the machines, the status of the remote Context Broker and the configuration of the IoTAgent.                                                                                                                                                                                                                                                                                                                                |
| `ORION-002`            | Connection error sending registrations to the Context Broker: %s   | There was a connectivity error accessing Context Broker to register the IoTA as a Context Provider (or the Context Broker was down). Check connectivity between the machines, the status of the remote Context Broker and the configuration of the IoT Agent.                                                                                                                                                                                                                                                                                                                |
| `VALIDATION-FATAL-001` | Validation Request templates not found                             | Validation templates were not found. Check all the validation templates are properly located in the IoTAgent Library folder and that the file permissions are correct.                                                                                                                                                                                                                                                                                                                                                                                                       |

## Alarms

The following table shows the alarms that can be raised in the IoTAgent library. All the alarms are signaled by a error
log starting with the prefix "Raising [%s]:" (where %s is the alarm name). All the alarms are released by an info log
with the prefix "Releasing [%s]". These texts appear in the `msg=` field of the generic log record format.

| Alarm name       | Severity     | Description                                              |
| :--------------- | :----------- | :------------------------------------------------------- |
| `MONGO-ALARM_XX` | **Critical** | Indicates an error in the MongoDB connectivity           |
| `ORION-ALARM`    | **Critical** | Indicates a persistent error accesing the Context Broker |
| `IOTAM-ALARM`    | **Critical** | Indicates a persistent error accessing the IoTAM         |

while the 'Severity' criterium is as follows:

-   **Critical** - The system is not working
-   **Major** - The system has a problem that degrades the service and must be addressed
-   **Warning** - It is happening something that must be notified

In order to identify the internal flow which origins a mongo alarm, there is a suffix `_XX` which identifies from `01`
to `11` each flow.
