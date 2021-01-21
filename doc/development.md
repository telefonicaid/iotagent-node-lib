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

A [MongoDB](https://www.mongodb.com/) 3.2+ instance is required to run tests.
You can deploy one by using the commodity `docker-compose-dev.yml`:

```
docker-compose -f docker-compose-dev.yml up -d
```

To run docker compose you will need [docker](https://docs.docker.com/get-docker/)
and [docker-compose](https://docs.docker.com/compose/install/).

### Testing

[Mocha](https://mochajs.org/) Test Runner + [Should.js](https://shouldjs.github.io/) Assertion Library.

The test environment is preconfigured to run BDD testing style.

Module mocking during testing can be done with [proxyquire](https://github.com/thlorenz/proxyquire)

To run tests, type

```bash
docker run --name redis --publish 6379:6379 --detach redis:6
docker run --name mongodb --publish 27017:27017 --detach mongo:4.2

npm test
```

### Debug Test

To debug the code while running run tests, type

```bash
npm run test:debug
```

In the console the link to the debugger will be provided. You can connect
to it via Chrome, for example, by opening the following url: ```chrome://inspect```.

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
