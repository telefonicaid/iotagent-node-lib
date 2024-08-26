# Getting Started

-   [Introduction](#introduction)
-   [IoT Agent settings - `config.js`](#iot-agent-settings---configjs)
-   [Provisioning a Config Group](#provisioning-a-config-group)
-   [Provisioning an Individual Device](#provisioning-an-individual-device)
-   [Receiving measures from devices](#receiving-measures-from-devices)
    -   [Receiving a measure from a known Device](#receiving-a-measure-from-a-known-device)
    -   [Receiving a measure from an anonymous Device](#receiving-a-measure-from-an-anonymous-device)

## Introduction

In this guide we will be using the IoT Agent JSON (which is the reference IoTAgent using the IoTAgent Library) as an
example to demonstrate how to provision config groups, devices and how to receive measures from devices.

Be aware that every IoT Agent which uses the library is different, but the concepts for provisioning IoT devices remain
the same regardless of protocol.

The IoT Agent JSON is a simple IoT Agent which uses JSON payloads to send and receive data. It is a good starting point
for understanding how an IoT Agent works since it uses JSON payloads to send and receive data.

## IoT Agent settings - `config.js`

The `config.js` holds common information about the interactions between the Agent and the Context Broker. Additional
custom settings may also be required dependent upon the actual IoT Agent used. The following is an example of a typical
`config.js` file:

```javascript
config = {
    logLevel: 'DEBUG',
    contextBroker: {
        host: 'orion',
        port: '1026'
    },
    server: {
        port: 4041,
        host: '0.0.0.0'
    },
    deviceRegistry: {
        type: 'mongodb'
    },
    mongodb: {
        host: 'localhost',
        port: '27017',
        db: 'iotagent'
    },
    service: 'openiot',
    subservice: '/',
    providerUrl: 'http://iot-agent:4041',
    defaultType: 'Thing'
};
```

In this case the context broker hostname is `orion` and is listening on port `1026`, the IoT Agent can be provisioned by
sending requests to port `4041` which is also the port used to receive NGSI requests. The IoT Agent is using the
`iotagent` database from a MongoDB instance at `localhost:27017` to store needed information (provisioned groups and
devices, etc.).

The remaining settings help to define the NGSI interactions - the IoT Agent will be using the `fiware-service=openiot`
and `fiware-service-path=/`. The default `type`for each created entity is `Thing`, although this can be overridden as
shown below. Devices will be registered for a period of one month and the IoT Agent will receive registration callbacks
at the URL `http://iot-agent:4041`.

All configuration settings can also updated using Docker environment variables. You can find more information about the
available configuration parameters and environment variables in the [Administration Guide](admin.md).

## Provisioning a Config Group

Settings which are common to a group of devices can be passed to the IoT Agent using the Config Group API. Each config
group may override values previously defined in the global configuration if necessary. When using the config group API,
the `fiware-service` and `fiware-servicepath` headers will define the service and subservice to which the configuration
will be applied. Additionally, the `apikey` field is used to identify the configuration group. An example of a basic
config group is shown below:

```bash
curl -iX POST \
  'http://localhost:4041/iot/groups' \
  -H 'Content-Type: application/json' \
  -H 'fiware-service: openiot' \
  -H 'fiware-servicepath: /' \
  -d '{
 "groups": [
   {
     "apikey":      "4jggokgpepnvsb2uv4s40d59ov",
     "entity_type": "Device",
     "resource":    "/iot/json",
     "attributes": [
       { "object_id": "t", "name": "temperature", "type": "Number" }
     ]
   }
 ]
}'
```

In this case an `apiKey` for identifying devices has been created and all interactions to the path `/iot/d` which
present this `apiKey` will be created as entities of `type=Device` rather than using the configuration default of
`type=Thing`.

Additionally, the group has defined an attribute mapping for a measurement `t` to be mapped to `temperature` attribute
when receiving data from devices.

The config group would usual hold additional attribute mappings, commands and common static attributes as well.

## Provisioning an Individual Device

Settings which are specific to an individual device can be passed to the IoT Agent using the Device API. The
configuration provided in the Device API will override any settings defined in the Config Group API and the global
configuration as well. An example of a basic device configuration is shown below:

```bash
curl -iX POST \
  'http://localhost:4041/iot/devices' \
  -H 'Content-Type: application/json' \
  -H 'fiware-service: openiot' \
  -H 'fiware-servicepath: /' \
  -d '{
 "devices": [
   {
     "device_id":   "motion001",
     "entity_name": "urn:ngsi-ld:Motion:001",
     "entity_type": "Motion",
     "attributes": [
       { "object_id": "c", "name": "count", "type": "Number" }
     ],
     "static_attributes": [
       { "name":"refStore", "type": "Relationship", "value": "urn:ngsi-ld:Store:001"}
     ]
   }
 ]
}
'
```

The device `motion001` has been provisioned to persist data to the Context Broker as an entity of `type=Motion` (instead
of the default `type=Thing`). The destination entity is identified by the `entity_name` field, which is set to
`urn:ngsi-ld:Motion:001`. The device has a single attribute mapping for a measurement `c` to be mapped to `count`
attribute, additionally to one defined in the group mapping (`temperature`). The device also has a static attribute
`refStore` which is a relationship to the entity `urn:ngsi-ld:Store:001`.

This information is combined with the common config group information whenever a measurement is received at the IoT
Agent and used to create or update the relevant entity in the Context Broker.

## Receiving measures from devices

In order to see the complete process from provisioning the groups and devices to receiving measures, we will show how a
device can send a measure to the IoT Agent. In this case, we will use the IoTA JSON as an example, using the HTTP
transport protocol. To reproduce the measure sending, you can use the following `curl` commands.

The device measures are sent to the South port of the IoT Agent which is listening in the port `7896`.

### Receiving a measure from a known Device

In this case, the device has been provisioned previously. We will use the `motion001` device defined in the previous
example. To simulate the device sending a measure, the following request is sent to the South port:

```bash
curl -iX POST \
  'http://localhost:7896/iot/json?k=4jggokgpepnvsb2uv4s40d59ov&i=motion001' \
  -H 'Content-Type: application/json' \
  -d '{"t":23,"c":1}'
```

The IoT Agent South port is listening to the path defined in the config group, and the API key is recognized to match.
Because the `device_id` is also recognized, the provisioned device configuration is used and its settings are combined
with the config group.

Mapping has been found to use the `c` measurement as `count` and the `t` measurement as `temperature` attributes values.
The following context entity is created in the context broker:

```json
{
    "id": "urn:ngsi-ld:Motion:001",
    "type": "Motion",
    "temperature": { "value": 23, "type": "Number" },
    "count": { "value": 1, "type": "Number" },
    "refStore": { "value": "urn:ngsi-ld:Store:001", "type": "Relationship" }
}
```

### Receiving a measure from an anonymous Device

When receiving a measure, it is not necessary to have the device provisioned. In this case, the IoT Agent will use the
config group configuration to create the device and the entity. This process is called "autoprovision" and it is enabled
by default in provisioned groups (for further information, review the
[Autoprovision](api.md#autoprovision-configuration-autoprovision) section in the API documentation).

Take as an example the following request from an anonymous device:

```bash
curl -iX POST \
  'http://localhost:7896/iot/json?k=4jggokgpepnvsb2uv4s40d59ov&i=dev001' \
  -H 'Content-Type: application/json' \
  -d '{"t":13,"c":4}'
```

The IoT Agent South port is listen to the path defined in the config group, and the API key is recognized to match, so
the config group configuration will be used. No device has been provisioned with the `device_id=dev001`, so the IoT
Agent will only use the config group configuration.

A new entity will be created in the Context Broker with the `id` `Device:dev001` and the `type` `Device`. Only the `t`
measurement will be mapped to the `temperature` attribute, as defined in the config group. The remaining measurements
will be created as attributes with the same name. The following context entity will be created in the context broker:

```json
{
    "id": "Device:dev001",
    "type": "Device",
    "temperature": { "value": 13, "type": "Number" },
    "c": { "value": 4, "type": "Number" }
}
```
