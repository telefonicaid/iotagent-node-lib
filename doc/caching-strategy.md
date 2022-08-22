# Configuration Data Caching Strategies

The IoTAgent Library options to enforce several different data caching strategies to increase throughput. The actual
data caching strategy required in each use case will differ, and will always be a compromise between speed and data
latency. Several options are discussed below.

## Memory Only

if `deviceRegistry.type = memory` within the config, a transient memory-based device registry will be used to register
all the devices. This registry will be emptied whenever the process is restarted. Since all data is lost on exit there
is no concept of disaster recovery. **Memory only** should only be used for testing and in scenarios where all
provisioning can be added by a script on start-up.

## MongoDB

if `deviceRegistry.type = mongodb` within the config. a MongoDB database will be used to store all the device
information, so it will be persistent from one execution to the other. This offers a disaster recovery mechanism so that
when any IoT Agent goes down, data is not lost. Furthermore since the data is no longer held locally and is always
received from the database this allows multiple IoT Agent instances to access the same data in common.

### MongoDB without Cache

This is the default operation mode with Mongo-DB. Whenever a measure is received, provisioning data is requested from
the database. This may become a bottleneck in high availability systems.

### MongoDB with in-memory Cache

if `memCache.enabled = true` within the config this provides a transient memory-based cache in front of the mongo-DB
instance. It effectively combines the advantages of fast in-memory access with the reliability of a Mongo-DB database.

```javascript
memCache = {
    enabled: true,
    deviceMax: 200,
    deviceTTL: 60,
    groupMax: 50,
    groupTTL: 60,
};
```

The memCache data is not shared across instances and therefore should be reserved to short term data storage. Multiple
IoT Agents would potential hold inconsistent provisioning data until the cache has expired.

## Bypassing cache

In some cases consistent provisioning data is more vital than throughput. When creating or updating a provisioned device
or service group adding a `cache` attribute with the value `true` will ensure that the data can be cached, otherwise it
is never placed into a cache and therefore always consistently received from the Mongo-DB instance.
