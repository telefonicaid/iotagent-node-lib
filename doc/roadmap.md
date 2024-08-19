# IoT Agent Node.js Library

This product is a FIWARE Generic Enabler. If you would like to learn about the overall Roadmap of FIWARE, please check
"Roadmap" on the [FIWARE Catalogue](https://www.fiware.org/developers/catalogue/).

### Introduction

This section elaborates on proposed new features or tasks which are expected to be added to the product in the
foreseeable future. There should be no assumption of a commitment to deliver these features on specific dates or in the
order given. The development team will be doing their best to follow the proposed dates and priorities, but please bear
in mind that plans to work on a given feature or task may be revised. All information is provided as general guidelines
only, and this section may be revised to provide newer information at any time.

Disclaimer:

-   This section has been last updated in August 2023. Please take into account its content could be obsolete.
-   Note we develop this software in Agile way, so development plan is continuously under review. Thus, this roadmap has
    to be understood as rough plan of features to be done along time which is fully valid only at the time of writing
    it. This roadmap has not be understood as a commitment on features and/or dates.
-   Some of the roadmap items may be implemented by external community developers, out of the scope of GE owners. Thus,
    the moment in which these features will be finalized cannot be assured.

### Short term

The following list of features are planned to be addressed in the short term, and incorporated in a release of the
product:

-   cgroup literal in configuration groups management API ([#752](https://github.com/telefonicaid/iotagent-node-lib/issues/752))
-   Add init and improve log traces ([#1452](https://github.com/telefonicaid/iotagent-node-lib/issues/1452))
-   Remove InMemory registry for Devices and Groups ([#1429](https://github.com/telefonicaid/iotagent-node-lib/issues/1429))

### Medium term

The following list of features are planned to be addressed in the medium term, typically within the subsequent
release(s) generated in the next 9 months after the next planned release:

-   Cache support ([#1467](https://github.com/telefonicaid/iotagent-node-lib/issues/1467))
-   MQTT per group advanced configuration (MQTT broker, topics) ([#1454](https://github.com/telefonicaid/iotagent-node-lib/issues/1454))
-   Subscription based commands ([#1455](https://github.com/telefonicaid/iotagent-node-lib/issues/1455))
-   Remove registration support ([#1456](https://github.com/telefonicaid/iotagent-node-lib/issues/1456))

### Long term

The following list of features are proposals regarding the longer-term evolution of the product even though the
development of these features has not yet been scheduled for a release in the near future. Please feel free to contact
us if you wish to get involved in the implementation or influence the roadmap:

-   Use the lightweight ingestion mechanism for connection oriented updates implemented in Context Broker (testing pending) ([#1457](https://github.com/telefonicaid/iotagent-node-lib/issues/1457))
-   Add support to other transport protocols (BacNET, Modbus, etc) ([#1458](https://github.com/telefonicaid/iotagent-node-lib/issues/1458))
-   Dynamic attribute generation (based on values array) ([#1459](https://github.com/telefonicaid/iotagent-node-lib/issues/1459))
-   Incremental introduccion of ECMAScript6 syntax (previous analysis of which sub-set of interesting aspect we want to
    take)

### Features already completed

The following list contains all features that were in the roadmap and have already been implemented.

-   Allow to add metadata to attributes from measures ([#1453](https://github.com/telefonicaid/iotagent-node-lib/issues/1453)) ([4.6.0](https://github.com/telefonicaid/iotagent-node-lib/releases/tag/4.0.0))
-   Refactor Append Mode & initial entity ([#1413](https://github.com/telefonicaid/iotagent-node-lib/issues/1413)) ([4.0.0](https://github.com/telefonicaid/iotagent-node-lib/releases/tag/4.0.0))
-   Native support for NGSI-v2 and LD ingestion ([#1451](https://github.com/telefonicaid/iotagent-node-lib/issues/1451)) ([4.0.0](https://github.com/telefonicaid/iotagent-node-lib/releases/tag/4.0.0))
-   Remove plugins structure (bidirectional plugin) ([#1413](https://github.com/telefonicaid/iotagent-node-lib/issues/1413)) ([4.0.0](https://github.com/telefonicaid/iotagent-node-lib/releases/tag/4.0.0))
-   Refactor entities-NGSI-v2.js module ([#1166](https://github.com/telefonicaid/iotagent-node-lib/issues/1166)) ([3.0.0](https://github.com/telefonicaid/iotagent-node-lib/releases/tag/3.0.0))
-   Accept JEXL Expressions for entity name in autoprovisioned devices (entityNameExp) ([#1145](https://github.com/telefonicaid/iotagent-node-lib/issues/1145)) ([2.22.0](https://github.com/telefonicaid/iotagent-node-lib/releases/tag/2.22.0))
-   Improve command functionalities (binary data + expression + mapping) ([2.22.0](https://github.com/telefonicaid/iotagent-node-lib/releases/tag/2.22.0))
-   Support for "delta" measures (i.e. "temperature _increased_ in 5 degress" instead of "temperature _is_ 25")
-   Allow to handle binary messages ([iota-ul#530](https://github.com/telefonicaid/iotagent-ul/issues/530))
-   Removal support for NGSIv1 ([#966](https://github.com/telefonicaid/iotagent-node-lib/issues/966)) ([2.18.0](https://github.com/telefonicaid/iotagent-node-lib/releases/tag/2.18.0))
-   Selectively ignore measure in the southbound interface
    ([iotagent-json#416](https://github.com/telefonicaid/iotagent-json/issues/416),
    [iotagent-ul#372](https://github.com/telefonicaid/iotagent-ul/issues/372))
    ([2.13.0](https://github.com/telefonicaid/iotagent-node-lib/releases/tag/2.13.0))
-   JEXL support in expressions ([#801](https://github.com/telefonicaid/iotagent-node-lib/issues/801), 
     [#687](https://github.com/telefonicaid/iotagent-node-lib/issues/687), 
     [#868](https://github.com/telefonicaid/iotagent-node-lib/issues/868))
    ([2.13.0](https://github.com/telefonicaid/iotagent-node-lib/releases/tag/2.13.0))
-   Add MongoDB authentication support ([#844](https://github.com/telefonicaid/iotagent-node-lib/issues/844))
    ([2.12.0](https://github.com/telefonicaid/iotagent-node-lib/releases/tag/2.12.0))
