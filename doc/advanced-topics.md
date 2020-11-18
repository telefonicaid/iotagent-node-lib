## Advanced Topics

### Secured access to the Context Broker

For access to instances of the Context Broker secured with a
[PEP Proxy](https://github.com/telefonicaid/fiware-orion-pep), an authentication mechanism based in Keystone Trust
tokens is provided. A Trust token is a long-term token that can be issued by any user to give another user permissions
to impersonate him with a given role in a given project. Such impersonation itself is in turn based on a short-term
access token.

For the authentication mechanisms to work, the `authentication` attribute in the configuration has to be fully
configured, and the `authentication.enabled` subattribute should have the value `true`.

When the administrator of a service is configuring a set of devices or device types in the IoT Agent to use a secured
Context Broker, he should follow this steps:

-   First, a Trust Token ID should be requested to Keystone, using the service administrator credentials, the role ID
    and the IoT Agent User ID. The Trust token can be retrieved using the following request (shown as a curl command):

```bash
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
            {"id": "'$ID_ROLE'"
            }
        ],
        "trustee_user_id": "'$ID_IOTAGENT_USER'",
        "trustor_user_id": "'$ID_ADM1'"
    }
}'
```

-   Every device or type of devices configured to use a secured Context Broker must be provided with a Trust Token ID in
    its configuration.
-   Before any request is sent to a secured Context Broker, the IoT Agent uses the Trust Token ID to generate a
    temporary access token, that is attached to the request (in the `X-Auth-token` header) (using Keystone API
    https://developer.openstack.org/api-ref/identity/v3-ext/#consuming-a-trust).

Apart from the generation of the trust, the use of secured Context Brokers should be transparent to the user of the IoT
Agent.

### Metadata support

Both `attributes` and `static_attributes` may be supplied with metadata when provisioning an IoT Agent, so that the
units of measurement can be placed into the resultant entity.

e.g.:

```json
{
     "entity_type": "Lamp",
     "resource":    "/iot/d",
     "protocol":    "PDI-IoTA-UltraLight",
..etc
     "commands": [
        {"name": "on","type": "command"},
        {"name": "off","type": "command"}
     ],
     "attributes": [
        {"object_id": "s", "name": "state", "type":"Text"},
        {"object_id": "l", "name": "luminosity", "type":"Integer",
          "metadata":{
              "unitCode":{"type": "Text", "value" :"CAL"}
          }
        }
     ],
     "static_attributes": [
          {"name": "category", "type":"Text", "value": ["actuator","sensor"]},
          {"name": "controlledProperty", "type": "Text", "value": ["light"],
            "metadata":{
              "includes":{"type": "Text", "value" :["state", "luminosity"]},
              "alias":{"type": "Text", "value" :"lamp"}
            }
          },
     ]
   }
```

### Data mapping plugins

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

#### Development

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

#### Provided plugins

The library provides some plugins out of the box, in the `dataPlugins` collection. In order to load any of them, just
use the `addQueryMiddleware` and `addUpdateMiddleware` functions with the selected plugin, as in the example:

```javascript
var iotaLib = require("iotagent-node-lib");

iotaLib.addUpdateMiddleware(iotaLib.dataPlugins.compressTimestamp.update);
iotaLib.addQueryMiddleware(iotaLib.dataPlugins.compressTimestamp.query);
```

##### Timestamp Compression plugin (compressTimestamp)

This plugins change all the timestamp attributes found in the entity, and all the timestamp metadata found in any
attribute, from the basic complete calendar timestamp of the ISO8601 (e.g.: 20071103T131805) to the extended complete
calendar timestamp (e.g.: +002007-11-03T13:18). The middleware expects to receive the basic format in updates and return
it in queries (and viceversa, receive the extended one in queries and return it in updates).

##### Attribute Alias plugin (attributeAlias)

In the Device provision, an ID can be specified for each attribute, along with its name. The ID can be used then as the
left part of a mapping from attribute names in the south bound to attribute names in the North Bound. If the ID and name
attributes are used in this way, this plugin makes the translation from one to the other automatically.

##### Event plugin (addEvents)

This plugin allows for the creation of Event attributes, i.e.: attributes whose value will be the timestamp of its
inclusion in the system, regardless of the value they carried in the Southbound API. If this plugin is active, all the
events in the IoT Agent with the configured type name will be marked as events. The event name can be configured in the
`config.eventType` attribute.

##### Timestamp Processing Plugin (timestampProcess)

This plugin processes the entity attributes looking for a TimeInstant attribute. If one is found, the plugin add a
TimeInstant attribute as metadata for every other attribute in the same request.

##### Expression Translation plugin (expressionTransformation)

This plugin allows the devices and configurations that have defined expressions to generate their values from those
expressions and the reported measure information.

For further information on how the expressions work, refer to the
[Expression Language Reference](expressionLanguage.md).

##### Multientity plugin (multiEntity)

Allows the devices provisioned in the IoTAgent to map their attributes to more than one entity, declaring the target
entity through the Configuration or Device provisioning APIs.

```json
{
    "devices": [
        {
            "protocol": "IoTA-UL",
            "entity_name": "urn:ngsi-ld:Device:contador12",
            "entity_type": "multientity",
            "attributes": [
                {
                    "object_id": "cont1",
                    "name": "vol",
                    "type": "Text",
                    "entity_name": "urn:ngsi-ld:Device:WaterMeterSoria01",
                    "entity_type": "WaterMeter"
                },
                {
                    "object_id": "cont2",
                    "name": "vol",
                    "type": "Text",
                    "entity_name": "urn:ngsi-ld:Device:WaterMeterSoria02",
                    "entity_type": "WaterMeter"
                },
                {
                    "object_id": "cont3",
                    "name": "vol",
                    "type": "Text",
                    "entity_name": "urn:ngsi-ld:Device:WaterMeterSoria03",
                    "entity_type": "WaterMeter"
                }
            ],
            "device_id": "contador12"
        }
    ]
}
```

##### Bidirectionality plugin (bidirectional)

This plugin allows the devices with composite values an expression to update the original values in the devices when the
composite expressions are updated in the Context Broker. This behavior is achieved through the use of subscriptions.

IoTAs using this plugins should also define a notification handler to handle incoming values. This handler will be
intercepted by the plugin, so the mapped values are included in the updated notification.

When a device is provisioned with bidirectional attributes, the IoTAgent subscribes to changes in that attribute. When a
change notification for that attribute arrives to the IoTA, it applies the transformation defined in the device
provisioning payload to the notification, and calls the underlying notification handler with the transformed entity.

The following `attributes` section shows an example of the plugin configuration:

```json
      "attributes": [
        {
          "name":"location",
          "type":"geo:point",
          "expression": "${latitude}, ${longitude}",
          "reverse": [
            {
              "object_id":"longitude",
              "type": "Text",
              "expression": "${trim(substr(@location, indexOf(@location, \",\") + 1, length(@location)))}"
            },
            {
              "object_id":"latitude",
              "type": "Text",
              "expression": "${trim(substr(@location, 0, indexOf(@location, \",\")))}"
            }
          ]
        }
      ],
```

For each attribute that would have bidirectionality, a new field `reverse` must be configured. This field will contain
an array of fields that will be created based on the notifications content. The expression notification can contain any
attribute of the same entity as the bidirectional attribute; declaring them in the expressions will add them to the
subscription payload.

For each attribute in the `reverse` array, an expression must be defined to calculate its value based on the
notification attributes. This value will be passed to the underlying protocol with the `object_id` name. Details about
how the value is then progressed to the device are protocol-specific.

### Old IoTAgent data migration

In order to ease the transition from the old IoTAgent implementation (formerly known as IDAS) to the new Node.js based
implementations, a data migration tool has been developed. This data migration tool has been integrated as a command in
the IoTAgent command-line tester.

In order to perform a full migration, follow this steps:

-   From the project root, start the command-line tester:

```bash
    bin/iotAgentTester.js
```

-   Configure the MongoDB host and port, and the origin Database (that holds the data to be migrated):

```bash
    configMigration localhost 27017 originDB
```

-   Launch the migration, using the special value "\*" as service and subservice

```bash
    migrate targetDB * *
```

Some warnings may appear with the "Attribute [_id] was not found for item translation" message during the migration.
They show the values existing in the original DB that had no translation for the target DB.

If you want to restrict the migration for certain services and subservices, just substitute the `*` value for the
particular service and subservice you want to use.
