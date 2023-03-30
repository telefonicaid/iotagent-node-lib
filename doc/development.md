## Development documentation

-   [Contributions](#contributions)
-   [Project build](#project-build)
-   [Testing](#testing)
-   [Coding guidelines](#coding-guidelines)
-   [Continuous testing](#continuous-testing)
-   [Code Coverage](#code-coverage)
-   [Clean](#clean)

### Contributions

All contributions to this project are welcome. Developers planning to contribute should follow the
[Contribution Guidelines](Contribution.md)

### Project build

The project is managed using npm.

For a list of available task, type

```bash
npm run
```

The following sections show the available options in detail.

### Environment requirements

A [MongoDB](https://www.mongodb.com/) 3.2+ instance is required to run tests. You can deploy one by using the commodity
`docker-compose-dev.yml`:

```
docker-compose -f docker-compose-dev.yml up -d
```

To run docker compose you will need [docker](https://docs.docker.com/get-docker/) and
[docker-compose](https://docs.docker.com/compose/install/).

### Testing

[Mocha](https://mochajs.org/) Test Runner + [Should.js](https://shouldjs.github.io/) Assertion Library.

The test environment is preconfigured to run BDD testing style.

Module mocking during testing can be done with [proxyquire](https://github.com/thlorenz/proxyquire)

To run tests, type

```bash
npm test
```

There are additional targets starting with `test:` prefix to run specific test subsets isolatedly. For instance, the
`test:expressions` target runs the subset of tests related with expression language feature:

```bash
npm run test:expressions
```

### Debug Test

To debug the code while running run tests, type

```bash
npm run test:debug
```

In the console the link to the debugger will be provided. You can connect to it via Chrome, for example, by opening the
following url: `chrome://inspect`.

Additional debug clients are listed on [node.js](https://nodejs.org/en/docs/guides/debugging-getting-started/).

### Coding guidelines

ESLint

Uses the provided `.eslintrc.json` flag file. To check source code style, type

```bash
npm run lint
```

### Continuous testing

Support for continuous testing by modifying a src file or a test. For continuous testing, type

```bash
npm run test:watch
```

If you want to continuously check also source code style, use instead:

```bash
npm run watch
```

### Code Coverage

Istanbul

Analyze the code coverage of your tests.

To generate an HTML coverage report under `site/coverage/` and to print out a summary, type

```bash
# Use git-bash on Windows
npm run test:coverage
```

### Clean

Removes `node_modules` and `coverage` folders, and `package-lock.json` file so that a fresh copy of the project is
restored.

```bash
# Use git-bash on Windows
npm run clean
```

### Documentation Markdown validation

Checks the Markdown documentation for consistency

```bash
# Use git-bash on Windows
npm run lint:md
```

### Documentation Spell-checking

Uses the provided `.textlintrc` flag file. To check the Markdown documentation for spelling and grammar errors, dead
links & etc.

```bash
# Use git-bash on Windows
npm run lint:text
```

### Clean

Removes `node_modules` and `coverage` folders, and `package-lock.json` file so that a fresh copy of the project is
restored.

```bash
# Use git-bash on Windows
npm run clean
```

### Prettify Code

Runs the [prettier](https://prettier.io) code formatter to ensure consistent code style (whitespacing, parameter
placement and breakup of long lines etc.) within the codebase.

```bash
# Use git-bash on Windows
npm run prettier
```

To ensure consistent Markdown formatting run the following:

```bash
# Use git-bash on Windows
npm run prettier:text
```

# DB Models (from API document)

## Service group model

The table below shows the information held in the service group provisioning resource. The table also contains the
correspondence between the API resource fields and the same fields in the database model.

| Payload Field                  | DB Field                       | Definition                                                                                                                                                                                                                                                                |
| ------------------------------ | ------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| `service`                      | `service`                      | Service of the devices of this type                                                                                                                                                                                                                                       |
| `subservice`                   | `subservice`                   | Subservice of the devices of this type.                                                                                                                                                                                                                                   |
| `resource`                     | `resource`                     | string representing the Southbound resource that will be used to assign a type to a device (e.g.: pathname in the southbound port).                                                                                                                                       |
| `apikey`                       | `apikey`                       | API Key string.                                                                                                                                                                                                                                                           |
| `timestamp`                    | `timestamp`                    | Optional flag about whether or not to add the `TimeInstant` attribute to the device entity created, as well as a `TimeInstant` metadata to each attribute, with the current timestamp. With NGSI-LD, the Standard `observedAt` property-of-a-property is created instead. | true |
| `entity_type`                  | `entity_type`                  | name of the Entity `type` to assign to the group.                                                                                                                                                                                                                         |
| `trust`                        | `trust`                        | trust token to use for secured access to the Context Broker for this type of devices (optional; only needed for secured scenarios).                                                                                                                                       |
| `cbHost`                       | `cbHost`                       | Context Broker connection information. This options can be used to override the global ones for specific types of devices.                                                                                                                                                |
| `lazy`                         | `lazy`                         | list of common lazy attributes of the device. For each attribute, its `name` and `type` must be provided.                                                                                                                                                                 |
| `commands`                     | `commands`                     | list of common commands attributes of the device. For each attribute, its `name` and `type` must be provided, additional `metadata` is optional.                                                                                                                          |
| `attributes`                   | `attributes`                   | list of common active attributes of the device. For each attribute, its `name` and `type` must be provided, additional `metadata` is optional.                                                                                                                            |
| `static_attributes`            | `staticAttributes`             | this attributes will be added to all the entities of this group 'as is', additional `metadata` is optional.                                                                                                                                                               |
| `internal_attributes`          | `internalAttributes`           | optional section with free format, to allow specific IoT Agents to store information along with the devices in the Device Registry.                                                                                                                                       |
| `expressionLanguage`           | `expresionLanguage`            | optional boolean value, to set expression language used to compute expressions, possible values are: legacy or jexl. When not set or wrongly set, `legacy` is used as default value.                                                                                      |
| `explicitAttrs`                | `explicitAttrs`                | optional field to support selective ignore of measures so that IOTA doesn’t progress. See details in [specific section](advanced-topics.md#explicitly-defined-attributes-explicitattrs)                                                                                   |
| `entityNameExp`                | `entityNameExp`                | optional field to allow use expressions to define entity name, instead default `id` and `type`                                                                                                                                                                            |
| `ngsiVersion`                  | `ngsiVersion`                  | optional string value used in mixed mode to switch between **NGSI-v2** and **NGSI-LD** payloads. Possible values are: `v2` or `ld`. The default is `v2`. When not running in mixed mode, this field is ignored.                                                           |
| `defaultEntityNameConjunction` | `defaultEntityNameConjunction` | optional string value to set default conjunction string used to compose a default `entity_name` when is not provided at device provisioning time.                                                                                                                         |
| `autoprovision`                | `autoprovision`                | optional boolean: If `false`, autoprovisioned devices (i.e. devices that are not created with an explicit provision operation but when the first measure arrives) are not allowed in this group. Default (in the case of omitting the field) is `true`.                   |

## Device model

The table below shows the information held in the Device resource. The table also contains the correspondence between
the API resource fields and the same fields in the database model.

| Payload Field         | DB Field             | Definition                                                                                                                                                                                                                                                                | Example of value                              |
| --------------------- | -------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------- |
| `device_id`           | `id`                 | Device ID that will be used to identify the device.                                                                                                                                                                                                                       | UO834IO                                       |
| `service`             | `service`            | Name of the service the device belongs to (will be used in the fiware-service header).                                                                                                                                                                                    | smartGondor                                   |
| `service_path`        | `subservice`         | Name of the subservice the device belongs to (used in the fiware-servicepath header).                                                                                                                                                                                     | /gardens                                      |
| `entity_name`         | `name`               | Name of the entity representing the device in the Context Broker                                                                                                                                                                                                          | ParkLamplight12                               |
| `entity_type`         | `type`               | Type of the entity in the Context Broker                                                                                                                                                                                                                                  | Lamplights                                    |
| `timezone`            | `timezone`           | Time zone of the sensor if it has any                                                                                                                                                                                                                                     | America/Santiago                              |
| `timestamp`           | `timestamp`          | Optional flag about whether or not to add the `TimeInstant` attribute to the device entity created, as well as a `TimeInstant` metadata to each attribute, with the current timestamp. With NGSI-LD, the Standard `observedAt` property-of-a-property is created instead. | true                                          |
| `apikey`              | `apikey`             | Optional Apikey key string to use instead of group apikey                                                                                                                                                                                                                 | 9n4hb1vpwbjozzmw9f0flf9c2                     |
| `endpoint`            | `endpoint`           | Endpoint where the device is going to receive commands, if any.                                                                                                                                                                                                           | http://theDeviceUrl:1234/commands             |
| `protocol`            | `protocol`           | Name of the device protocol, for its use with an IoT Manager.                                                                                                                                                                                                             | IoTA-UL                                       |
| `transport`           | `transport`          | Name of the device transport protocol, for the IoT Agents with multiple transport protocols.                                                                                                                                                                              | MQTT                                          |
| `attributes`          | `active`             | List of active attributes of the device                                                                                                                                                                                                                                   | `[ { "name": "attr_name", "type": "Text" } ]` |
| `lazy`                | `lazy`               | List of lazy attributes of the device                                                                                                                                                                                                                                     | `[ { "name": "attr_name", "type": "Text" } ]` |
| `commands`            | `commands`           | List of commands of the device                                                                                                                                                                                                                                            | `[ { "name": "attr_name", "type": "Text" } ]` |
| `internal_attributes` | `internalAttributes` | List of internal attributes with free format for specific IoT Agent configuration                                                                                                                                                                                         | LWM2M mappings from object URIs to attributes |
| `static_attributes`   | `staticAttributes`   | List of static attributes to append to the entity. All the updateContext requests to the CB will have this set of attributes appended.                                                                                                                                    | `[ { "name": "attr_name", "type": "Text" } ]` |
| `expressionLanguage`  | `expresionLanguage`  | optional boolean value, to set expression language used to compute expressions, possible values are: legacy or jexl. When not set or wrongly set, legacy is used as default value.                                                                                        |
| `explicitAttrs`       | `explicitAttrs`      | optional field to support selective ignore of measures so that IOTA doesn’t progress. See details in [specific section](advanced-topics.md#explicitly-defined-attributes-explicitattrs)                                                                                   | (see details in specific section)             |
| `ngsiVersion`         | `ngsiVersion`        | optional string value used in mixed mode to switch between **NGSI-v2** and **NGSI-LD** payloads. The default is `v2`. When not running in mixed mode, this field is ignored.                                                                                              | `v2/ld`                                       |
