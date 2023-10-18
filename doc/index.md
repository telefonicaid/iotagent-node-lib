# Welcome to the FIWARE IoT Agent Framework

[![FIWARE IoT Agents](https://nexus.lab.fiware.org/repository/raw/public/badges/chapters/iot-agents.svg)](https://www.fiware.org/developers/catalogue/)
[![](https://nexus.lab.fiware.org/repository/raw/public/badges/stackoverflow/iot-agents.svg)](https://stackoverflow.com/questions/tagged/fiware+iot)

This project aims to provide a Node.js library to enable IoT Agent developers to build custom agents for their devices
that can easily connect to NGSI Context Brokers (such as [Orion](https://github.com/telefonicaid/fiware-orion) ).

An IoT Agent is a component that lets groups of devices send their data to and be managed from a FIWARE NGSI Context
Broker using their own native protocols. IoT Agents should also be able to deal with security aspects of the FIWARE
platform (authentication and authorization of the channel) and provide other common services to the device programmer.

Github's [README.md](https://github.com/telefonicaid/iotagent-node-lib/blob/master/README.md) provides a good
documentation summary. The [API reference](api.md) and the [Development documentation](devel/development.md) cover
more advanced topics.

## Background

The main concept of the **IoT Agent node library** is to provide a common framework for provisioning IoT devices,
allowing each individual IoT Agent to access standardized mapping data for devices and to offer a series common utility
functions.

-   For southbound communications, the library listens to changes in context entities and raises callbacks for the IoT
    Agent to process.
-   For northbound communications, the library offers an interface which accepts structured input data so that all NGSI
    communications are left to the library.
-   Standardized OAuth2-based security is available to enable each IoT Agent to connect to several common Identity
    Managers (e.g. Keystone and Keyrock) so that communications can be restricted to trusted components.

Each individual IoT Agent offers is driven by a `config.js` configuration file contains explicit custom settings based
on the protocol and payload the IoT Agent is translating. It will also contain some common flags for common
functionality provided by the IoT Agent node lin (e.g. for contecting to a conext broker or for authentication). The
**IoT Agent node library** offers a standard API for provisioning devices and ensures that each IoT Agent can configure
its device communications using a common vocabulary regardless of the payload, syntax or transport protocol used by the
device itself.

### How to include the library within a Node Project

The **IoT Agent node library** is not a standalone product and should be added as a dependency to `package.json` of the
IoT Agent

```json
...
"dependencies": {
	"iotagent-node-lib": "*",
}
```

In order to use the library within your own IoT Agent, you must first you require it before use:

```javascript
const iotagentLib = require('iotagent-node-lib');
```
