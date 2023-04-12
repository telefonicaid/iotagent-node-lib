## Advanced Topics

-   [Data mapping plugins](#data-mapping-plugins)
    -   [Development](#development)
    -   [Provided plugins](#provided-plugins)
        -   [Timestamp Compression plugin (compressTimestamp)](#timestamp-compression-plugin-compresstimestamp)
        -   [Attribute Alias plugin (attributeAlias)](#attribute-alias-plugin-attributealias)
        -   [Event plugin (addEvents)](#event-plugin-addevents)
        -   [Timestamp Processing Plugin (timestampProcess)](#timestamp-processing-plugin-timestampprocess)
        -   [Expression Translation plugin (expressionTransformation)](#expression-translation-plugin-expressiontransformation)
        -   [Multientity plugin (multiEntity)](#multientity-plugin-multientity)
        -   [Bidirectionality plugin (bidirectional)](#bidirectionality-plugin-bidirectional)
    -   [Autoprovision configuration (autoprovision)](#autoprovision-configuration-autoprovision)
    -   [Explicitly defined attributes (explicitAttrs)](#explicitly-defined-attributes-explicitattrs)

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
var iotaLib = require('iotagent-node-lib');

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

This plugin processes the entity attributes looking for a `TimeInstant` attribute. If one is found, for NGSI v2, the
plugin adds a `TimeInstant` attribute as metadata for every other attribute in the same request. With NGSI-LD, the
Standard `observedAt` property-of-a-property is used instead.

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
provisioning payload to the notification, and calls the underlying notification handler with the transformed entity
including the `value` along with any `metadata`, and in the case of an NGSI-LD bidirectional attribute a `datasetId` if
provided.

The following `attributes` section shows an example of the plugin configuration (using `IOTA_AUTOCAST=false` to avoid
translation from geo:point to geo:json)

```json
      "attributes": [
        {
          "name":"location",
          "type":"geo:point",
          "expression": "${@latitude}, ${@longitude}",
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

##### NGSI-LD `datasetId` support

Limited support for parsing the NGSI-LD `datasetId` attribute is included within the library. A series of sequential
commands for a single attribute can be sent as an NGSI-LD notification as follows:

```json
{
    "id": "urn:ngsi-ld:Notification:5fd0fa684eb81930c97005f3",
    "type": "Notification",
    "subscriptionId": "urn:ngsi-ld:Subscription:5fd0f69b4eb81930c97005db",
    "notifiedAt": "2020-12-09T16:25:12.193Z",
    "data": [
        {
            "lampColor": [
                {
                    "type": "Property",
                    "value": { "color": "green", "duration": "55 secs" },
                    "datasetId": "urn:ngsi-ld:Sequence:do-this"
                },
                {
                    "type": "Property",
                    "value": { "color": "red", "duration": "10 secs" },
                    "datasetId": "urn:ngsi-ld:Sequence:then-do-this"
                }
            ]
        }
    ]
}
```

This results in the following sequential array of attribute updates to be sent to the `NotificationHandler` of the IoT
Agent itself:

```json
[
    {
        "name": "lampColor",
        "type": "Property",
        "datasetId": "urn:ngsi-ld:Sequence:do-this",
        "metadata": {},
        "value": { "color": "green", "duration": "55 secs" }
    },
    {
        "name": "lampColor",
        "type": "Property",
        "datasetId": "urn:ngsi-ld:Sequence:then-do-this",
        "metadata": {},
        "value": { "color": "red", "duration": "10 secs" }
    }
]
```

A `datasetId` is also maintained for each new attribute defined in the `reverse` field.
