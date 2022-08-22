## Getting Started

Every IoT Agent which uses the library is different, but the concepts for provisioning IoT devices remain the same
regardless of protocol.

### `config.js` - IoT Agent settings

The `config.js` holds common information about the interactions between the Agent and the Context Broker. Additional
custom settings may also be required dependent upon the actual IoT Agent used.

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
        type: 'memory'
    },
    service: 'openiot',
    subservice: '/',
    providerUrl: 'http://iot-agent:4041',
    defaultType: 'Thing'
};
```

In this case the context broker is called `orion` and is listening on port `1026`, the IoT Agent can be provisioned by
sending requests to port `4041` which is also the port used to receive NGSI requests. The IoT Agent is holding the
device mappings in memory.

The remaining settings help to define the NGSI interactions - the IoT Agent will be using the `fiware-service=openiot`
and `fiware-service-path=/`. The default `type`for each created entity is `Thing`, although this can be overridden as
shown below. Devices will be registered for a period of one month and the IoT Agent will receive registration callbacks
at the URL `http://iot-agent:4041`.

All configuration settings can also updated using Docker environment variables.

### Provisioning a Service Group

Settings which are common to a group of devices can be passed to the IoT Agent using the Service API. The
`fiware-service` and `fiware-service-path` to be used to access the API are defined within the `config.js`. Each service
may override values previously defined in the configuration if necessary.

```bash
curl -iX POST \
  'http://localhost:4041/iot/services' \
  -H 'Content-Type: application/json' \
  -H 'fiware-service: openiot' \
  -H 'fiware-servicepath: /' \
  -d '{
 "services": [
   {
     "apikey":      "4jggokgpepnvsb2uv4s40d59ov",
     "cbroker":     "http://orion:1026",
     "entity_type": "Device",
     "resource":    "/iot/d",
   }
 ]
}'
```

In this case an `apiKey` for identifying devices has been created and all interactions to the path `/iot/d` which
present this `apiKey` will be created as entities of `type=Device` rather than using the configuration default of
`type=Thing`. The service group would usual hold additional attribute mappings, commands and common static attributes as
well.

### Provisioning an Individual Device

Settings which are specific to an individual device can be passed to the IoT Agent using the Device API

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
       { "object_id": "c", "name": "count", "type": "Integer" }
     ],
     "static_attributes": [
       { "name":"refStore", "type": "Relationship", "value": "urn:ngsi-ld:Store:001"}
     ]
   }
 ]
}
'
```

This information is combined with the common service group information whenever a request is received at the South port
of the IoT Agent and used to create or update the relevant entity in the Context Broker.

#### Receiving a measure from a known Device

For example, imagine we are using the Ultralight IoT Agent and the following request is sent to the South port:

```bash
curl -iX POST \
  'http://localhost:7896/iot/d?k=4jggokgpepnvsb2uv4s40d59ov&i=motion001' \
  -H 'Content-Type: text/plain' \
  -d 'c|1'
```

The IoT Agent South port is listening to the path defined in the service group, and the API key is recognized to match.
Because the `device_id` is also recognized, the provisioned device configuration is used and its settings are combined
with the service group. A mapping has been found to rename the `c` measurement to `count` - the following context entity
is created in the context broker:

```json
{
    "id": "urn:ngsi-ld:Motion:001",
    "type": "Motion",
    "count": { "value": "1", "type": "Integer" },
    "refStore": { "value": "urn:ngsi-ld:Store:001", "type": "Relationship" }
}
```

#### Receiving a measure from an anonymous Device

For example, imagine we are using the Ultralight IoT Agent and a request from an anonymous, unprovisioned device is sent
to the South port:

```bash
curl -iX POST \
  'http://localhost:7896/iot/d?k=4jggokgpepnvsb2uv4s40d59ov&i=temp001' \
  -H 'Content-Type: text/plain' \
  -d 't|1'
```

The IoT Agent South port is listen to the path defined in the service group, and the API key is recognized to match, so
the Service group configuration will be used. No mappings will be made for the Entity `id` or the attribute names and
the following entity will be created:

```json
{
    "id": "temp001",
    "type": "Device",
    "t": { "value": "1", "type": "Number" }
}
```
