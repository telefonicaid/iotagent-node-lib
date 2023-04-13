## Advanced Topics

-   [Timestamp Compression plugin (compressTimestamp)](#timestamp-compression-plugin-compresstimestamp)
-   [Attribute Alias plugin (attributeAlias)](#attribute-alias-plugin-attributealias)
-   [Event plugin (addEvents)](#event-plugin-addevents)
-   [Timestamp Processing Plugin (timestampProcess)](#timestamp-processing-plugin-timestampprocess)
-   [Expression Translation plugin (expressionTransformation)](#expression-translation-plugin-expressiontransformation)
-   [Multientity plugin (multiEntity)](#multientity-plugin-multientity)
-   [Bidirectionality plugin (bidirectional)](#bidirectionality-plugin-bidirectional)

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
