# MongoDB Datamodel 

This file displays IoT Agent datamodel stored in the MongoDB database. 

## Collections

### Devices

The collection 'devices' sotres information about the iotagent devices

Fields:

-   **\_ID** _ObjectId_: unique object ID used by mongoDB
-   **id** _string_: id of device
-   **type** _string_: entity type used
-   **name** _string_: entity name used
-   **lazy** _array_: array of lazy attributes of device
-   **active** _array_: array of active attributes of device
-   **commands** _array_: array of commands of device
-   **apikey** _string_: apikey of device
-   **endpoint** _string_: endpoint used by push commands when http
-   **resource** _string_: iotagent resource
-   **protocol** _string_: device protocol (JSON)
-   **transport** _string_: device transport (http, mqtt, amqp)
-   **staticAttributes** _array_: array of static attributes of device
-   **subscriptions** _array_: subscriptions of device
-   **service** _string_: service which the device belongs to
-   **subservice** _string_: subservice which the rule belongs to.
-   **polling** _boolean_: if device uses polling for commands
-   **timezone** _string_: timezone of device
-   **timestamp** _boolean_ timestamp of device
-   **registrationId** _string_: registrationId of device
-   **internalId** _string_: internalId of device
-   **creationDate** _date_: creationDate of device
-   **internalAttributes** _object_: internalAttributes of device
-   **autoprovision** _boolean_: if device support autoprovision
-   **explicitAttrs** _enum_:
-   **ngsiVersion** _string_: ngsi version used by device
-   **payloadType** _string_: payloadType used by device
-   **useCBflowControl** _boolean_: if CBFlow will be used by device when updates in CB
-   **storeLastMeasure** _boolean_: if device store last measure received
-   **lastMeasure** _object_: last measure received by device
-   **oldCtxt** _object_: jexl Ctxt used at last measure

Example:

```json
{
    "_id": {
        "$oid": "680b4b338d0e60f98718a8b2"
    },
    "lazy": [],
    "commands": [
        {
            "name": "reset",
            "type": "command",
            "value": "",
            "expression": "{ set: brand + '_' + reset }",
            "object_id": "reset"
        },
        {
            "name": "cmd1",
            "type": "command",
            "value": "",
            "expression": "brand",
            "object_id": "cmd1"
        },
        {
            "name": "cmd2",
            "type": "command",
            "value": "",
            "expression": "reset",
            "object_id": "cmd2"
        }
    ],
    "staticAttributes": [],
    "creationDate": {
        "$date": {
            "$numberLong": "1745570611491"
        }
    },
    "id": "disp",
    "type": "thing",
    "name": "thing:disp",
    "service": "smartcity",
    "subservice": "/",
    "registrationId": "680b4b33956cc1ed0205840a",
    "apikey": "APIKEY",
    "protocol": "IoTA-JSON",
    "transport": "HTTP",
    "polling": false,
    "active": [],
    "oldCtxt": {
        "level": "33",
        "brand": "o1",
        "id": "disp",
        "type": "thing",
        "service": "smartcity",
        "subservice": "/",
        "entity_name": "thing:disp",
        "TimeInstant": "2025-04-25T08:43:31.496Z"
    },
    "subscriptions": []
}
```

### Groups

The collection groups' stores information about the iotagent groups of devices

Fields:

-   **\_ID** _ObjectId_: unique object ID used by mongoDB
-   **url** _string_: url used by group of devices
-   **resource** _string_: iotagent resource
-   **apikey** _string_: apikey used by group of devices
-   **endpoint** _string_: endpoint used by push commands when http
-   **transport** _string_: group transport (http, mqtt, amqp)
-   **type** _string_: entity type used
-   **service** _string_: service which the group of device belongs to
-   **subservice** _string_: subservice which the group of devices belongs to
-   **description** _string_: description of group of devices
-   **trust** _string_: keystone trust id used when devices of this group request to CB
-   **cbHost** _string_: CB endpoint used by devices of this group
-   **timezone** _string_: timezone used by group of devices
-   **timestamp** _boolean_: timestamp of group
-   **commands** _array_: array of commands of device group
-   **staticAttributes** _array_: array of static attributes of device group
-   **lazy** _array_: array of lazy attributes of device group
-   **attributes** _array_: array of active attributes of device group
-   **internalAttributes** _array_: array of internal attributes used by devices of group
-   **autoprovision** _boolean_: if devices of group supports autoprovision
-   **explicitAttrs** _enum_: explicit attributes configuration used by devices of group
-   **defaultEntityNameConjunction** _string_:
-   **ngsiVersion** _string_: ngsi version used by devices of group
-   **entityNameExp** _string_: entity name expression used by devics of group
-   **payloadType** _string_: payloadType used by devices of group
-   **useCBflowControl** _boolean_: payloadType used by device group
-   **storeLastMeasure** _boolean_: if devices of group store last measure received

Example:

```json
{
    "_id": {
        "$oid": "67a1e6447ae8b4ba4478f019"
    },
    "commands": [
        {
            "name": "reset",
            "type": "command",
            "value": "",
            "expression": "{ set: brand + '_' + reset }"
        },
        {
            "name": "cmd1",
            "type": "command",
            "value": "",
            "expression": "brand"
        },
        {
            "name": "cmd2",
            "type": "command",
            "value": "",
            "expression": "reset"
        }
    ],
    "staticAttributes": [
        {
            "name": "brand",
            "type": "Text",
            "value": "o1",
            "metadata": {}
        }
    ],
    "attributes": [],
    "resource": "/iot/json",
    "apikey": "APIKEY",
    "type": "thing",
    "service": "smartcity",
    "subservice": "/",
    "description": "miJSON",
    "timestamp": true,
    "internalAttributes": [],
    "lazy": [],
    "transport": "HTTP",
    "endpoint": "'https://eoykcmmm.m.pipedream.net' + '/' + service + '/' + subservice + '/' + id + '/' + type"
}
```

### Commands

The collection 'commands' stores information about the commands

Fields:

-   **\_ID** _ObjectId_: unique object ID used by mongoDB
-   **deviceId** _string_: device ID of the device
-   **type** _string_: type of the command
-   **name** _string_: name of the command
-   **value** _object_: value of the command
-   **service** _string_: service which the device command belongs to
-   **subservice** _string_: subservice which the device command belongs to
-   **execTs** _date_: related with new commands functionality (stored but not yet in use)
-   **status** _string_: related with new commands functionality (stored but not yet in use)
-   **info** _string_: related with new commands functionality (stored but not yet in use)
-   **onDelivered** _Object_: related with new commands functionality (stored but not yet in use)
-   **onOk**: _Object_: related with new commands functionality (stored but not yet in use)
-   **onError** _Object_: related with new commands functionality (stored but not yet in use)
-   **onInfo** _Object_: related with new commands functionality (stored but not yet in use)
-   **cmdExecution** _Boolean__: related with new commands functionality (stored but not yet in use)
-   **dateExpiration**: { type: Date }: related with new commands functionality (stored but not yet in use)
-   **creationDate** _date_: creation date of command

Example:

```json
{
    "_id": {
        "$oid": "680b4b538d0e60f98718a8eb"
    },
    "creationDate": {
        "$date": {
            "$numberLong": "1745570643252"
        }
    },
    "name": "cmd1",
    "type": "command",
    "value": "on",
    "deviceId": "disp3",
    "service": "smartcity",
    "subservice": "/"
}
```

## Indexes

### Devices

An index guarantees that every device is identified by the tuple (service, subservice, apikey, id)

The index is created/ensured when iotagent starts, but it can be created from a mongoDB shell with

```javascript
db.devices.ensureIndex({ service: 1, subservice: 1, apikey: 1, id: 1 }, { unique: true });
```

### Groups

An index guarantees that every group is identified by the tuple (apikey, resource)

The index is created/ensured when iotagent starts, but it can be created from a mongoDB shell with

```javascript
db.groups.ensureIndex({ apikey: 1, resource: 1 }, { unique: true });
```

### Commands

None index is defined
