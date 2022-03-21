# FIWARE IoT Agent Node.js Library

[![FIWARE IoT Agents](https://nexus.lab.fiware.org/static/badges/chapters/iot-agents.svg)](https://www.fiware.org/developers/catalogue/)
[![License: APGL](https://img.shields.io/github/license/telefonicaid/iotagent-node-lib.svg)](https://opensource.org/licenses/AGPL-3.0)
[![Support badge](https://img.shields.io/badge/tag-fiware+iot-orange.svg?logo=stackoverflow)](https://stackoverflow.com/questions/tagged/fiware+iot)
<br/>
[![Documentation badge](https://img.shields.io/readthedocs/iotagent-node-lib.svg)](http://iotagent-node-lib.readthedocs.org/en/latest/?badge=latest)
[![CI](https://github.com/telefonicaid/iotagent-node-lib/workflows/CI/badge.svg)](https://github.com/telefonicaid/iotagent-node-lib/actions?query=workflow%3ACI)
[![Coverage Status](https://coveralls.io/repos/github/telefonicaid/iotagent-node-lib/badge.svg?branch=master)](https://coveralls.io/github/telefonicaid/iotagent-node-lib?branch=master)
![Status](https://nexus.lab.fiware.org/static/badges/statuses/iot-node-lib.svg)
[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/4671/badge)](https://bestpractices.coreinfrastructure.org/projects/4671)

This project aims to provide a Node.js module to enable IoT Agent developers to build custom agents for their devices
that can easily connect to NGSI Context Brokers (such as [Orion](https://github.com/telefonicaid/fiware-orion)).

An IoT Agent is a component that lets groups of devices send their data to and be managed from a FIWARE NGSI Context
Broker using their own native protocols. IoT Agents should also be able to deal with security aspects of the FIWARE
platform (authentication and authorization of the channel) and provide other common services to the device programmer.

This project is part of [FIWARE](https://www.fiware.org/). For more information check the FIWARE Catalogue entry for the
[IoT Agents](https://github.com/Fiware/catalogue/tree/master/iot-agents).

| :books: [Documentation](https://iotagent-node-lib.rtfd.io) | :mortar_board: [Academy](https://fiware-academy.readthedocs.io/en/latest/iot-agents/idas) | :dart: [Roadmap](https://github.com/telefonicaid/iotagent-node-lib/blob/master/doc/roadmap.md) |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |


## Index

-   [Background](#background)
-   [Install](#install)
-   [API](#api)
-   [Usage](#usage)
-   [Testing](#testing)
    -   [Agent Console](#agent-console)
    -   [Agent tester](#agent-tester)
-   [Licence](#licence)

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
-   A series of additional plugins are offered where necessary to allow for expression parsing, attribute aliasing and
    the processing of timestamp metadata.

Each individual IoT Agent offers is driven by a `config.js` configuration file contains explicit custom settings based
on the protocol and payload the IoT Agent is translating. It will also contain some common flags for common
functionality provided by the IoT Agent node lin (e.g. for contecting to a conext broker or for authentication). The
**IoT Agent node library** offers a standard API for provisioning devices and ensures that each IoT Agent can configure
its device communications using a common vocabulary regardless of the payload, syntax or transport protocol used by the
device itself.

## Install

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

Information about how to configure the Library can be found at the corresponding section of the
[Installation & Administration Guide](doc/installationguide.md).

## Usage

This library has no packaging or build processes. The [Getting Started](doc/getting-started.md) is a good place to
start. Usage of the library is explained in the [User & Programmers Manual](doc/usermanual.md).

-   Details of the architecture of an IoT Agent be found [here](doc/architecture.md).
-   Further Advanced topics can be found [here](doc/advanced-topics.md).
-   The following features are listed as [deprecated](doc/deprecated.md).

## API

The **IoT Agent node library** offers a simple REST API which provides common functionality to access, provision and
decommission devices. [API](doc/api.md).

## Testing

Contributions to development can be found [here](doc/development.md) - additional contributions are welcome.

### Agent Console

A command-line client to experiment with the library is packed with it. The command-line client can be started using the
following command:

```console
bin/agentConsole.js
```

The client offers an API similar to the one offered by the library: it can start and stop an IoT agent, register and
unregister devices, send measures mimicking the device and receive updates of the device data. Take into account that,
by default, the console uses the same `config.js` file than the IoT Agent.

The command-line client creates a console that offers the following options:

```text
stressInit

	Start recording a stress batch.

stressCommit <delay> <times> <threads> <initTime>

	Executes the recorded batch as many times as requested, with delay (ms) between commands.
	The "threads" parameter indicates how many agents will repeat that same sequence. The "initTime" (ms)
	parameter indicates the mean of the random initial waiting times for each agent.

exit

	Exit from the command-line.

start

	Start the IoT Agent

stop

	Stop the IoT Agent

register <id> <type>

	Register a new device in the IoT Agent. The attributes to register will be extracted from the
	type configuration

unregister <id> <type>

	Unregister the selected device

showConfig

	Show the current configuration file

config <newConfig>

	Change the configuration file to a new one

updatevalue <deviceId> <deviceType> <attributes>

	Update a device value in the Context Broker. The attributes should be triads with the following
	format: "name/type/value" sepparated by commas.

listdevices

	List all the devices that have been registered in this IoT Agent session
```

### Agent tester

#### Command-line testing

The library also offers a Context Broker and IoT Agent client that can be used to:

-   Simulate operations to the Context Broker used by the IoT Agent, triggering Context Provider forwardings for lazy
    attributes and checking the appropriate values for active ones.
-   Simulate operations to the Device Provisioning API and Configuration API of the IoT Agent.

The tester can be started with the following command, from the root folder of the project:

```console
bin/iotAgentTester.js
```

From the command-line, the `help` command can be used to show a description of the currently supported features. These
are the following:

```text
stressInit

	Start recording a stress batch.

stressCommit <delay> <times> <threads> <initTime>

	Executes the recorded batch as many times as requested, with delay (ms) between commands.
	The "threads" parameter indicates how many agents will repeat that same sequence. The "initTime" (ms)
	parameter indicates the mean of the random initial waiting times for each agent.

exit

	Exit from the command-line.

update <entity> <type> <attributes>

	Update the values of the defined set of attributes, using the following format: name#type=value(|name#type=value)*

append <entity> <type> <attributes>

	Append a new Entity with the defined set of attributes, using the following format: name:type=value(,name:type=value)*

query <entity> <type>

	Get all the information on the selected object.

queryAttr <entity> <type> <attributes>

	Get information on the selected object for the selected attributes.

discover <entity> <type>

	Get all the context providers for a entity and type.

configCb <host> <port> <service> <subservice>

	Config a new host and port for the remote Context Broker.

showConfigCb

	Show the current configuration of the client for the Context Broker.

configIot <host> <port> <service> <subservice>

	Config a new host and port for the remote IoT Agent.

showConfigIot

	Show the current configuration of the client for the IoT Agent.

provision <filename>

	Provision a new device using the Device Provisioning API. The device configuration is
	read from the file specified in the "filename" parameter.

provisionGroup <template> <data> <type>

	Provision a group of devices with the selected template, taking the information needed to
	fill the template from a CSV with two columns, DEVICE_ID and DEVICE_NAME. The third parameter, type
	will be used to replace the DEVICE_TYPE field in the template. All the devices will be provisioned
	to the same IoT Agent, once the templates have been fulfilled.

listProvisioned

	List all the provisioned devices in an IoT Agent.

removeProvisioned <deviceId>

	Remove the selected provisioned device from the IoT Agent, specified by its Device ID.

addGroup <filename>

	Add a new device group to the specified IoT Agent through the Configuration API. The
	body is taken from the file specified in the "filename" parameter.

listGroups

	List all the device groups created in the selected IoT Agent for the configured service

removeGroup <apiKey> <resource>

	Remove the device group corresponding to the current configured subservice.

authenticate <host> <port> <user> <password> <service>

	Authenticates to the given authentication server, and use the token in subsequent requests.

setProtocol <protocol>

	Sets the protocol to use in the requests (http or https). Defaults to http.

configMigration <host> <port> <originDb>

	Sets the configuration for a migration between a C++ IoTA and a Node.js one.

showConfigMigration

	Shows the current migration configuration.

addProtocols <protocols>

	Add a protocol translation table, in the following format:
		protocolOrigin1=protocolTarget1;protocolOrigin2=protocolTarget2...


migrate <targetDb> <service> <subservice>

	Migrate all the devices and services for the selected service and subservice into the
	specified Mongo database. To perform the migration for all the services or all the
	subservices, use the "*" value.
```

The agent session stores transient configuration data about the target Context Broker and the target IoT Agent. This
configuration is independent, and can be checked with the `showConfigCb` and `showConfigIot` commands, respectively.
Their values can be changed with the `configCb` and `configIot` commands respectively. The new configurations will be
deleted upon startup.

---

## Licence

The IoT Agent Node Library is licensed under [Affero General Public License (GPL) version 3](./LICENSE).

© 2019 Telefonica Investigación y Desarrollo, S.A.U

### Are there any legal issues with AGPL 3.0? Is it safe for me to use?

There is absolutely no problem in using a product licensed under AGPL 3.0. Issues with GPL (or AGPL) licenses are mostly
related with the fact that different people assign different interpretations on the meaning of the term “derivate work”
used in these licenses. Due to this, some people believe that there is a risk in just _using_ software under GPL or AGPL
licenses (even without _modifying_ it).

For the avoidance of doubt, the owners of this software licensed under an AGPL-3.0 license wish to make a clarifying
public statement as follows:

> Please note that software derived as a result of modifying the source code of this software in order to fix a bug or
> incorporate enhancements is considered a derivative work of the product. Software that merely uses or aggregates (i.e.
> links to) an otherwise unmodified version of existing software is not considered a derivative work, and therefore it
> does not need to be released as under the same license, or even released as open source.
