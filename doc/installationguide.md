# Installation & Administration Guide

## Configuration

The `activate()` function that starts the IoT Agent receives as single parameter with the configuration for the IoT
Agent. The Agent Console reads the same configuration from the `config.js` file.

### Global Configuration

These are the parameters that can be configured in the global section:

-   **logLevel**: minimum log level to log. May take one of the following values: DEBUG, INFO, ERROR, FATAL. E.g.:
    'DEBUG'.
-   **contextBroker**: connection data to the Context Broker (host and port). E.g.:

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
be switched to **NGSI LD** at service group or device provisioning time using the `ngsiVersion` field in the
provisioning API. The `ngsiVersion` field switch may be added at either group or device level, with the device level
overriding the group setting.

-   **server**: configuration used to create the Context Server (port where the IoT Agent will be listening as a Context
    Provider and base root to prefix all the paths). The `port` attribute is required. If no `baseRoot` attribute is
    used, '/' is used by default. E.g.:

```javascript
{
    baseRoot: '/',
    port: 4041
}
```

-   **stats**: configure the periodic collection of statistics. Use `interval` in milliseconds to set the time between
    stats writings.

```javascript
stats: {
    interval: 100;
}
```

-   **authentication**: authentication data, for use in retrieving tokens for devices with a trust token (required in
    scenarios with security enabled in the Context Broker side). Currently, two authentication provider are supported:
    `keystone` and `oauth2`. Authentication need to be enabled by setting the field `enabled` to `true`. In `keystone`
    based authentication, the `trust` associated to the `device` or `deviceGroup` is a token representing a specific
    user and his rights on a given domain (i.e. combination of `fiware-service` and `fiware-servicepath`). The
    authentication process use the trust delegation workflow to check if the trust provided is valid, in which case
    return a `x-subject-token` that can be used to authenticate the request to the Context Broker. Required parameters
    are: the `url` of the keystone to be used (alternatively `host` and `port` but if you use this combination, the IoT
    Agent will assume that the protocol is HTTP), the `user` and `password` to which it is delegated the `trust`
    verification. E.g.:

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

-   **deviceRegistry**: type of Device Registry to create. Currently, two values are supported: `memory` and `mongodb`.
    If the former is configured, a transient memory-based device registry will be used to register all the devices. This
    registry will be emptied whenever the process is restarted. If the latter is selected, a MongoDB database will be
    used to store all the device information, so it will be persistent from one execution to the other. Mongodb
    databases must be configured in the `mongob` section (as described bellow). E.g.:

```javascript
{
    type: 'mongodb';
}
```

-   **mongodb**: configures the MongoDB driver for those repositories with 'mongodb' type. If the `host` parameter is a
    list of comma-separated IPs, they will be considered to be part of a Replica Set. In that case, the optional
    property `replicaSet` should contain the Replica Set name. If the database requires authentication, username
    (`username`), password (`password`) and authSource (`authSource`) can be set. If the database requires TLS/SSL
    connection but any validation of the certificate chain is not mandatory, all you need is to set the ssl (`ssl`)
    option as `true` to connect the database. If you need to add more complex option(s) such as `retryWrites=true` or
    `w=majority` when connection database, extraArgs (`extraArgs`) can be used to perform it. For The MongoBD driver
    will retry the connection at startup time `retries` times, waiting `retryTime` seconds between attempts, if those
    attributes are present (default values are 5 and 5 respectively). E.g.:

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

-   **memCache**: Whether to use a memory cache in front of Mongo-DB when using the `mongodb` **deviceRegistry** option
    to reduce I/O. This memory cache will hold and serve a set of recently requested groups and devices (up to a given
    maximum time-to-live) and return the cached response so long as the value is still within `TTL`. When enabled the
    default values are to hold up to 200 devices and 160 groups in memory and retain values for up to 60 seconds.

```javascript
{
    enabled: true,
    deviceMax: 200,
    deviceTTL: 60,
    groupMax: 50,
    groupTTL: 60
}
```

-   **iotManager**: configures all the information needed to register the IoT Agent in the IoTManager. If this section
    is present, the IoTA will try to register to a IoTAM in the `host`, `port` and `path` indicated, with the
    information configured in the object. The IoTAgent URL that will be reported will be the `providedUrl` (described
    below) with the added `agentPath`:

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

-   **types**: See **Type Configuration** in the [Configuration API](#configurationapi) section below.
-   **eventType**: Default type for the Events (useful only with the `addEvents` plugin).
-   **service**: default service for the IoT Agent. If a device is being registered, and no service information comes
    with the device data, and no service information is configured for the given type, the default IoT agent service
    will be used instead. E.g.: 'smartGondor'.
-   **subservice**: default subservice for the IoT Agent. If a device is being registered, and no subservice information
    comes with the device data, and no subservice information is configured for the given type, the default IoT agent
    subservice will be used instead. E.g.: '/gardens'.
-   **providerUrl**: URL to send in the Context Provider registration requests. Should represent the external IP of the
    deployed IoT Agent (the IP where the Context Broker will redirect the NGSI requests). E.g.:
    'http://192.168.56.1:4041'.
-   **iotaVersion**: indicates the version of the IoTA that will be displayed in the about method (it should be filled
    automatically by each IoTA).
-   **appendMode**: if this flag is activated, the update requests to the Context Broker will be performed always with
    APPEND type, instead of the default UPDATE. This have implications in the use of attributes with Context Providers,
    so this flag should be used with care. This flag is overwritten by `autoprovision` flag in group or device
    provision.
-   **dieOnUnexpectedError**: if this flag is activated, the IoTAgent will not capture global exception, thus dying upon
    any unexpected error.
-   **singleConfigurationMode**: enables the Single Configuration mode for backwards compatibility (see description in
    the Overview). Default to false.
-   **timestamp**: if this flag is activated:
    -   For NGSI-v2, the IoT Agent will add a `TimeInstant` metadata attribute to all the attributes updated from device
        information. This flag is overwritten by `timestamp` flag in group or device
    -   With NGSI-LD, the standard `observedAt` property-of-a-property is created instead.
-   **defaultResource**: default string to use as resource for the registration of new Configurations (if no resource is
    provided).
-   **defaultKey**: default string to use as API Key for devices that do not belong to a particular Configuration.
-   **componentName**: default string identifying the component name for this IoT Agent in the logs.
-   **pollingExpiration**: expiration time for commands waiting in the polling queue in miliseconds. If a command has
    been in the queue for this amount of time without being collected by the device, the expiration daemon will reclaim
    it. This attribute is optional (if it doesn't exist, commands won't expire).
-   **pollingDaemonFrequency**: time between collection of expired commands in milliseconds. This attribute is optional
    (if this parameter doesn't exist the polling daemon won't be started).
-   **autocast**: When enabled, the IoT Agents will try to cast attribute's values considering the JSON native type
    (only for NGSI v2).
-   **multiCore**: When enabled, the IoT Agents runs in multi-thread environment to take advantage of multi-core
    systems. It allows two values `true` or `false`. This attribute is optional with default to false, which means that
    the IoTAgent runs in a single thread. For more details about multi-core functionality, please refer to the
    [Cluster](https://nodejs.org/api/cluster.html) module in Node.js and
    [this section](howto.md#iot-agent-in-multi-thread-mode) of the library documentation.
-   **defaultExpressionLanguage**: the default expression language used to compute expressions, possible values are:
    `legacy` or `jexl`. When not set or wrongly set, `legacy` is used as default value.
-   **fallbackTenant** - For Linked Data Context Brokers which do not support multi-tenancy, this provides an
    alternative mechanism for supplying the `NGSILD-Tenant` header. Note that NGSILD-Tenant has not yet been included in
    the NGSI-LD standard (it has been proposed for the next update of the standard, but the final decision has yet been
    confirmed), take into account it could change. Note that for backwards compatibility with NGSI v2, the
    `fiware-service` header is already used as alternative if the `NGSILD-Tenant` header is not supplied.
-   **fallbackPath** - For Linked Data Context Brokers which do not support a service path, this provides an alternative
    mechanism for suppling the `NGSILD-Path` header. Note that for backwards compatibility with NGSI v2, the
    `fiware-servicepath` header is already used as alternative if the `NGSILD-Path` header is not supplied. Note that
    NGSILD-Path has not yet been included in the NGSI-LD standard (it has been proposed for the next update of the
    standard, but the final decision has yet been confirmed), take into account it could change
-   **explicitAttrs**: if this flag is activated, only provisioned attributes will be processed to Context Broker. This
    flag is overwritten by `explicitAttrs` flag in group or device provision. Additionally `explicitAttrs` can be used
    to define which meassures defined in JSON/JEXL array will be propagated to NGSI interface.
-   **defaultEntityNameConjunction**: the default conjunction string used to compose a default `entity_name` when is not
    provided at device provisioning time; in that case `entity_name` is composed by `type` + `:` + `device_id`. Default
    value is `:`. This value is overwritten by `defaultEntityNameConjunction` in group provision.
-   **relaxTemplateValidation**: if this flag is activated, `objectId` attributes for incoming devices are not
    validated, and may exceptionally include characters (such as semi-colons) which are
    [forbidden](https://fiware-orion.readthedocs.io/en/master/user/forbidden_characters/index.html) according to the
    NGSI specification. When provisioning devices, it is necessary that the developer provides valid `objectId`-`name`
    mappings whenever relaxed mode is used, to prevent the consumption of forbidden characters.

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
| IOTA_SINGLE_MODE                     | `singleConfigurationMode`       |
| IOTA_APPEND_MODE                     | `appendMode`                    |
| IOTA_POLLING_EXPIRATION              | `pollingExpiration`             |
| IOTA_POLLING_DAEMON_FREQ             | `pollingDaemonFrequency`        |
| IOTA_AUTOCAST                        | `autocast`                      |
| IOTA_MULTI_CORE                      | `multiCore`                     |
| IOTA_JSON_LD_CONTEXT                 | `jsonLdContext`                 |
| IOTA_FALLBACK_TENANT                 | `fallbackTenant`                |
| IOTA_FALLBACK_PATH                   | `fallbackPath`                  |
| IOTA_DEFAULT_EXPRESSION_LANGUAGE     | `defaultExpressionLanguage`     |
| IOTA_EXPLICIT_ATTRS                  | `explicitAttrs`                 |
| IOTA_DEFAULT_ENTITY_NAME_CONJUNCTION | `defaultEntityNameConjunction`  |
| IOTA_RELAX_TEMPLATE_VALIDATION       | `relaxTemplateValidation`       |

Note:

-   If you need to pass more than one JSON-LD context, you can define the IOTA_JSON_LD_CONTEXT environment variable as a
    comma separated list of contexts (e.g. `'http://context1.json-ld,http://context2.json-ld'`)
