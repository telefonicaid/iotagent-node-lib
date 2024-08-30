# Deprecated functionality

Deprecated features are features that iotagent-node-lib stills support but that are not maintained or evolved any
longer. In particular:

-   Bugs or issues related with deprecated features and not affecting any other feature are not addressed (they are
    closed in github.com as soon as they are spotted).
-   Documentation on deprecated features is removed from the repository documentation. Documentation is still available
    in the documentation set associated to older versions (in the repository release branches).
-   Deprecated functionality is eventually removed from iotagent-node-lib. Thus you are strongly encouraged to change
    your implementations using iotagent-node-lib in order not rely on deprecated functionality.

A list of deprecated features and the version in which they were deprecated follows:

-   Support to NGSI v1 (finally removed in 2.18.0)
-   Support to Node.js v4 in iotagent-node-lib 2.8.1 (finally removed in 2.9.0)
-   Support to Node.js v6 in iotagent-node-lib 2.9.0 (finally removed in 2.10.0)
-   Support to Node.js v8 in iotagent-node-lib 2.12.0 (finally removed in 2.13.0)
-   Support to Node.js v10 in iotagent-node-lib 2.15.0 (finally removed in 2.16.0)
-   Support to Node.js v12 in iotagent-node-lib 2.24.0 (finally removed in 2.25.0)
-   Support to NGSI-LD v1.3 in iotagent-node-lib 2.25.0 (finally removed in 2.26.0)
-   Support groups (provision) statically defined by configuration
-   Support to in-memory registry (i.e.`deviceRegistry.type=memory`)
-   eventType configuration (finally removed in 3.0.0)
-   Support to legacy expressions (finally removed in 3.2.0)
-   Bidirectinal pluging (finally removed in 3.4.0)
-   appendMode configuration (`IOTA_APPEND_MODE` env var) (finally removed in 3.4.0)
-   `config.stats` section, and push-mode statistics.
-   Services API routes (`/iot/services`) in favor of the `/iot/groups`. Both are still supported, but the former is
    deprecated.

The use of Node.js v14 is highly recommended.

## Using old iotagent-node-lib versions

Although you are encouraged to use always the newest iotagent-node-lib version, take into account the following
information in the case you want to use old versions:

-   Code corresponding to old releases is available at the
    [iotagent-node-lib GitHub repository](https://github.com/telefonicaid/iotagent-node-lib). Each release number (e.g.
    2.7.0 ) has associated the following: _ A tag, e.g. `2.7.0`. It points to the base version. _ A release branch,
    `release/2.7.0`. The HEAD of this branch usually matches the aforementioned tag. However, if some hotfixes were
    developed on the base version, this branch contains such hotfixes.
-   Documentation corresponding to old versions can be found at
    [readthedocs.io](https://iotagent-node-lib.readthedocs.io). Use the panel in the right bottom corner to navigate to
    the right version.

The following table provides information about the last iotagent-node-lib version supporting currently removed features:

| **Removed feature**                                   | **Last iotagent-node-lib version supporting feature** | **That version release date** |
| ----------------------------------------------------- | ----------------------------------------------------- | ----------------------------- |
| NGSI v1 API                                           | 2.17.0                                                | August 30th, 2021             |
| Support to Node.js v4                                 | 2.8.1                                                 | December 19th, 2018           |
| Support to Node.js v6                                 | 2.9.0                                                 | May 22nd, 2019                |
| Support to Node.js v8                                 | 2.12.0                                                | April 7th, 2020               |
| Support to Node.js v10                                | 2.15.0                                                | February 18th, 2021           |
| Support to Node.js v12                                | 2.24.0                                                | September 2nd, 2022           |
| Support to NGSI-LD 1.3                                | 2.25.0                                                | January 24th, 2023            |
| eventType configuration                               | 2.26.0                                                | March 15th, 2023              |
| Support to Legacy Expressions                         | 3.1.0                                                 | April 25th, 2023              |
| bidirectional plugin                                  | 3.3.0                                                 | August 24th, 2023             |
| appendMode configuration (`IOTA_APPEND_MODE` env var) | 3.3.0                                                 | August 24th, 2023             |
| push-mode stats                                       | 4.5.0                                                 | June 11th, 2024               |
