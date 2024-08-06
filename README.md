# FIWARE IoT Agent Node Library

[![FIWARE IoT Agents](https://nexus.lab.fiware.org/static/badges/chapters/iot-agents.svg)](https://www.fiware.org/developers/catalogue/)
[![License: APGL](https://img.shields.io/github/license/telefonicaid/iotagent-node-lib.svg)](https://opensource.org/licenses/AGPL-3.0)
[![Support badge](https://img.shields.io/badge/tag-fiware+iot-orange.svg?logo=stackoverflow)](https://stackoverflow.com/questions/tagged/fiware+iot)
<br/>
[![Documentation badge](https://img.shields.io/readthedocs/iotagent-node-lib.svg)](http://iotagent-node-lib.readthedocs.org/en/latest/?badge=latest)
[![CI](https://github.com/telefonicaid/iotagent-node-lib/workflows/CI/badge.svg)](https://github.com/telefonicaid/iotagent-node-lib/actions?query=workflow%3ACI)
[![Coverage Status](https://coveralls.io/repos/github/telefonicaid/iotagent-node-lib/badge.svg?branch=master)](https://coveralls.io/github/telefonicaid/iotagent-node-lib?branch=master)
![Status](https://nexus.lab.fiware.org/static/badges/statuses/iot-node-lib.svg)
[![CII Best Practices](https://bestpractices.coreinfrastructure.org/projects/4671/badge)](https://bestpractices.coreinfrastructure.org/projects/4671)

An IoT Agent is a component that lets groups of IoT devices send their data to a NGSI Context Broker (such as
[Orion Context Broker](https://github.com/telefonicaid/fiware-orion)) using their own native protocols and translating
them into NGSI.

The **IoT Agent Node Lib** provides simple standardized REST API for registering, provisioning, discovering and managing
devices and groups of devices. It also ensures that each IoT Agent can configure its device communications using a
common vocabulary regardless of the payload, syntax or transport protocol used by the device itself

It also provides a common configuration framework driven by a `config.js` configuration file and a series of common ENV
variables, configuring some flags for common functionality provided by the **IoT Agent node lib** (e.g. for contecting
to a Conext Broker or for authenticating with an Identity Manager).Some of common utility functions provided by the
**IoT Agent node lib** include:

-   For the device communication (southbound), the library listens to changes in context entities and raises callbacks
    for the IoT Agent to process. It also handles the commands sent by the Context Broker to the devices.
-   For the context broker communications (northbound), the library offers an interface which persists data from the
    device in the Context Broker and accepts NGSI data from the Context Broker to be sent to the device.
-   Standardized OAuth2-based security is available to enable each IoT Agent to connect to several common Identity
    Managers (e.g. Keystone and Keyrock) so that communications can be restricted to trusted components.

This project is part of [FIWARE](https://www.fiware.org/). For more information check the FIWARE Catalogue entry for the
[IoT Agents](https://github.com/Fiware/catalogue/tree/master/iot-agents).

| :books: [Documentation](https://iotagent-node-lib.rtfd.io) | :mortar_board: [Academy](https://fiware-academy.readthedocs.io/en/latest/iot-agents/idas) | :dart: [Roadmap](https://github.com/telefonicaid/iotagent-node-lib/blob/master/doc/roadmap.md) |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |

## Content

-   [Documentation](#documentation)
    -   [User documentation](#user-documentation)
    -   [Development documentation](#development-documentation)
-   [IoT Agents available](#iot-agents-available)
-   [Install and usage](#install-and-usage)
-   [License](#license)

## Documentation

This repository contains the common user documentation across all IoT Agents. For particular documentation, you can
check the specific documentation for each IoT Agent. You can see the a list of available IoT Agents in the
[IoT Agents available](#iot-agents-available) section.

### User documentation

-   [Getting started](doc/getting-started.md)
-   [IoT Agent API](doc/api.md)
-   [Administration manual](doc/admin.md)
-   [Deprecated features](doc/deprecated.md)
-   [Roadmap](doc/roadmap.md)

### Development documentation

-   [Development manual](doc/devel/development.md)
-   [Contributing guide](doc/devel/contribution-guidelines.md)
-   [Architecture](doc/devel/architecture.md)
-   [North Port - NGSI Interactions](doc/devel/northboundinteractions.md)

## IoT Agents available

The following IoT Agents using the **IoT Agent Node Lib** are available:

-   [IoT Agent JSON](https://github.com/telefonicaid/iotagent-json) - a bridge between HTTP/MQTT messaging (with a JSON
    payload) and NGSI
-   [IoT Agent Ultralight](https://github.com/telefonicaid/iotagent-ul) - a bridge between HTTP/MQTT messaging
-   [IoT Agent LWM2M](https://github.com/telefonicaid/lightweightm2m-iotagent) - a bridge between the
    [Lightweight M2M](https://www.omaspecworks.org/what-is-oma-specworks/iot/lightweight-m2m-lwm2m/) protocol and NGSI
    (with an UltraLight2.0 payload) and NGSI
-   [IoT Agent for Sigfox](https://github.com/telefonicaid/sigfox-iotagent) - a bridge between the
    [Sigfox](https://www.sigfox.com/en) protocol and NGSI
-   [IoT Agent for LoRaWAN](https://github.com/Atos-Research-and-Innovation/IoTagent-LoRaWAN) - a bridge between the
    [LoRaWAN](https://www.thethingsnetwork.org/docs/lorawan/) protocol and NGSI
-   [IoT Agent for OPC-UA](https://github.com/Engineering-Research-and-Development/iotagent-opcua) - a bridge between
    the [OPC Unified Architecture](http://www.opcua.us/) protocol and NGSI
-   [IoT Agent for ISOXML](https://github.com/FIWARE/iotagent-isoxml) - a bridge between the ISOXML/ADAPT protocol for
    agricultural machinery and NGSI

## Install and usage

The **IoT Agent node library** is not a standalone product. If you plan to install and use any of the IoT Agents
available, you should follow the installation instructions for each IoT Agent (find the link in the
[previous section](#iot-agents-available)). You can find the common API provided by the **IoT Agent node library** under
[API](doc/api.md) documentation.

If you plan to use the IoT Agent node library in your own project or IoT Agent, you should follow the
[Developer manual](doc/devel/development.md), which includes the installation instructions and the usage of the library.

Information about how to configure the IoT agent or the library can be found at the corresponding section of the
[Administration manual](doc/admin.md).

## License

The IoT Agent Node Library is licensed under [Affero General Public License (GPL) version 3](./LICENSE).

© 2022 Telefonica Investigación y Desarrollo, S.A.U

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
