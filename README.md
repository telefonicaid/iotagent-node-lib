# fiware-iotagent-lib

## Overview
This project aims to provide a node.js module to enable IoT Agent developers to build custom agents for their devices that can 
easily connect to NGSI Context Brokers (such as [Orion](https://github.com/telefonicaid/fiware-orion) ). To allow this
interaction, the following mapping is supposed:

* Each Device is mapped as an Entity associated to a Context Provider: the Device Id will correspond to the entity ID; the type of the entity with a custom dependent on the device's service; and the measures obtained from the device will be matched each one to a different attribute.
* Each IoT Agent is mapped as a Context Provider: the IoTA is then responsible of mantaining its availability information, and answers requests about its own devices.

These are the features an IoT Agent is supposed to expose:
* IoT Agent registration management on the Context Broker: the IoT Agent should register itself as a Context Provider in the Context Broker, being able to resolve NGSI update and query requests redirected from remote Context Brokers.
* Device registration: multiple devices will be connected to each IoT Agent, each one of those mapped to a CB entity. The IoT Agent should update its NGSI9 registration to reflect what devices are connected to the agent.
* Device information update: whenever a device haves new measures to publish, it should send the information to the IoT Agent in its own native language. This message should , in turn, be should sent as an `updateContext` request to the Context Broker, were the measures will be updated in the device entity. 
* Device command execution and value updates: as a Context Provider, the IoT Agent should receive update operations from the Context Broker subscriptions, and relay them to the corresponding device (decoding it using its ID and Type, and other possible metadata).

Almost all of these features are common for every agent, so they can be abstracted into a library or external module. The objective of this project is to provide that abstraction. As all this common tasks are abstracted, the main task of the concrete IoT Agent implementations will be to map between the native device protocol and the library API.

## Operations

## Usage


## Development documentation
### Project build
The project is managed using Grunt Task Runner.

For a list of available task, type
```bash
grunt --help
```

The following sections show the available options in detail.


### Testing
[Mocha](http://visionmedia.github.io/mocha/) Test Runner + [Chai](http://chaijs.com/) Assertion Library + [Sinon](http://sinonjs.org/) Spies, stubs.

The test environment is preconfigured to run [BDD](http://chaijs.com/api/bdd/) testing style with
`chai.expect` and `chai.should()` available globally while executing tests, as well as the [Sinon-Chai](http://chaijs.com/plugins/sinon-chai) plugin.

Module mocking during testing can be done with [proxyquire](https://github.com/thlorenz/proxyquire)

To run tests, type
```bash
grunt test
```

Tests reports can be used together with Jenkins to monitor project quality metrics by means of TAP or XUnit plugins.
To generate TAP report in `report/test/unit_tests.tap`, type
```bash
grunt test-report
```


### Coding guidelines
jshint, gjslint

Uses provided .jshintrc and .gjslintrc flag files. The latter requires Python and its use can be disabled
while creating the project skeleton with grunt-init.
To check source code style, type
```bash
grunt lint
```

Checkstyle reports can be used together with Jenkins to monitor project quality metrics by means of Checkstyle
and Violations plugins.
To generate Checkstyle and JSLint reports under `report/lint/`, type
```bash
grunt lint-report
```


### Continuous testing

Support for continuous testing by modifying a src file or a test.
For continuous testing, type
```bash
grunt watch
```


### Source Code documentation
dox-foundation

Generates HTML documentation under `site/doc/`. It can be used together with jenkins by means of DocLinks plugin.
For compiling source code documentation, type
```bash
grunt doc
```


### Code Coverage
Istanbul

Analizes the code coverage of your tests.

To generate an HTML coverage report under `site/coverage/` and to print out a summary, type
```bash
# Use git-bash on Windows
grunt coverage
```

To generate a Cobertura report in `report/coverage/cobertura-coverage.xml` that can be used together with Jenkins to
monitor project quality metrics by means of Cobertura plugin, type
```bash
# Use git-bash on Windows
grunt coverage-report
```


### Code complexity
Plato

Analizes code complexity using Plato and stores the report under `site/report/`. It can be used together with jenkins
by means of DocLinks plugin.
For complexity report, type
```bash
grunt complexity
```

### PLC

Update the contributors for the project
```bash
grunt contributors
```


### Development environment

Initialize your environment with git hooks.
```bash
grunt init-dev-env 
```

We strongly suggest you to make an automatic execution of this task for every developer simply by adding the following
lines to your `package.json`
```
{
  "scripts": {
     "postinstall": "grunt init-dev-env"
  }
}
``` 


### Site generation

There is a grunt task to generate the GitHub pages of the project, publishing also coverage, complexity and JSDocs pages.
In order to initialize the GitHub pages, use:

```bash
grunt init-pages
```

This will also create a site folder under the root of your repository. This site folder is detached from your repository's
history, and associated to the gh-pages branch, created for publishing. This initialization action should be done only
once in the project history. Once the site has been initialized, publish with the following command:

```bash
grunt site
```

This command will only work after the developer has executed init-dev-env (that's the goal that will create the detached site).

This command will also launch the coverage, doc and complexity task (see in the above sections).

