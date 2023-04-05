## Advanced Topics

-   [Autoprovision configuration (autoprovision)](#autoprovision-configuration-autoprovision)
-   [Explicitly defined attributes (explicitAttrs)](#explicitly-defined-attributes-explicitattrs)
-   [Configuring operation to persist the data in Context Broker (appendMode)](#configuring-operation-to-persist-the-data-in-context-broker-appendmode)
-   [Differences between `autoprovision`, `explicitAttrs` and `appendMode`](#differences-between-autoprovision-explicitattrs-and-appendmode)
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

### Autoprovision configuration (autoprovision)

By default, when a measure arrives to the IoTAgent, if the `device_id` does not match with an existing one, then, the
IoTA creates a new device and a new entity according to the group config. Defining the field `autoprovision` to `false`
when provisioning the device group, the IoTA to reject the measure at the southbound, allowing only to persist the data
to devices that are already provisioned. It makes no sense to use this field in device provisioning since it is intended
to avoid provisioning devices (and for it to be effective, it would have to be provisional).

### Explicitly defined attributes (explicitAttrs)

If a given measure element (object_id) is not defined in the mappings of the device or group provision, the measure is
stored in the Context Broker by adding a new attribute to the entity with the same name of the undefined measure
element. By adding the field `explicitAttrs` with `true` value to device or group provision, the IoTAgent rejects the
measure elements that are not defined in the mappings of device or group provision, persisting only the one defined in
the mappings of the provision. If `explicitAttrs` is provided both at device and group level, the device level takes
precedence. Additionally `explicitAttrs` can be used to define which meassures (identified by their attribute names, not
by their object_id) defined in JSON/JEXL array will be propagated to NGSI interface.

The different possibilities are summarized below:

Case 1 (default):

```
"explicitAttrs": false
```

every measure will be propagated to NGSI interface.

Case 2:

```
"explicitAttrs": true
```

just measures defined in active, static (plus conditionally TimeInstant) will be propagated to NGSI interface.

Case 3:

```
"explicitAttrs": "['attr1','atrr2']"
```

just NGSI attributes defined in the array (identified by their attribute names, not by their object_id, plus
conditionally TimeInstant) will be propagated to NGSI interface (note that in this case the value of `explicitAttrs` is
not a JSON but a JEXL Array that looks likes a JSON).

Case 4:

```
"explicitAttrs": "['attr1','atrr2',{object_id:'active_id'}]"
```

just NGSI attributes defined in the array (identified by their attribute names and/or by their object_id) will be
propagated to NGSI interface (note that in this case the value of `explicitAttrs` is not a JSON but a JEXL Array/Object
that looks likes a JSON). This is necessary when same attribute names are used within multiple entities.

Case 5:

```
"explicitAtttr": "<JEXL expression resulting in bool or array>"
```

depending on the JEXL expression evaluation:

-   If it evaluates to `true` every measure will be propagated to NGSI interface (as in case 1)
-   If it evaluates to `false` just measures defined in active, static (plus conditionally TimeInstant) will be
    propagated to NGSI interface (as in case 2)
-   If it evaluates to an array just measures defined in the array (identified by their attribute names, not by their
    object_id) will be will be propagated to NGSI interface (as in case 3)

### Configuring operation to persist the data in Context Broker (appendMode)

This is a flag that can be enabled by activating the parameter `appendMode` in the configuration file or by using the
`IOTA_APPEND_MODE` environment variable (more info
[here](https://github.com/telefonicaid/iotagent-node-lib/blob/master/doc/installationguide.md)). If this flag is
activated, the update requests to the Context Broker will be performed always with APPEND type, instead of the default
UPDATE. This have implications in the use of attributes with Context Providers, so this flag should be used with care.

### Differences between `autoprovision`, `explicitAttrs` and `appendMode`

Since those configuration parameters are quite similar, this section is intended to clarify the relation between them.

If `autoprovision` is set to `true` (default case), the agent will perform an initial request creating a new entity into
the Context Broker with **only** the static and active attributes provisioned in the config group, and also a new Device
in the agent, every time a measure arrives with a new `device_id`. Otherwise, this measure is ignored. This is something
related to the **southbound**.

What `explicitAttrs` does is to filter from the southbound the parameters that are not explicitly defined in the device
provision or config group. That also would avoid propagating the measures to the Context Broker.

The default way the agent updates the information into the Context Broker is by using an update request. If
`appendMode=true`, the IoTA will use an append request instead of an update one. This means it will store the attributes
even if they are not present in the entity. This seems the same functionality that the one provided by `autoprovision`,
but it is a different concept since the scope of this config is to setup how the IoT interacts with the context broker,
this is something related to the **northbound**.

Note that, even creating a group with `autoprovision=true` and `explicitAttrs=true`, if you do not provision previously
the entity in the Context Broker (having all attributes to be updated), it would fail if `appendMode=false`. For further
information check the issue [#1301](https://github.com/telefonicaid/iotagent-node-lib/issues/1301).

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
