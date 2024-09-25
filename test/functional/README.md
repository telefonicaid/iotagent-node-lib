## Functional test suite

This directory contains the functional test suite for the IoTA Node Lib. This test suite is based on mocha and chai. For
mocks, we use the nock library. Additionally, it uses some specific functions to ease to implement the test. Helper
functions are located in the `testUtils.js` file.

There are 2 tests files in this directory:

-   `fuctional-tests.js`: This file contains the test defined in the "classic way". This means, coded in the JS file as
    any other mocha test. It uses the functions defined in the `testUtils.js` file to simplify the tests.
-   `functional-tests-runner.js`: This file contains the test runner that executes the tests defined as JSON in a
    separate file (`testCases.js`) in a "automatic way". This file is loaded by the test suite and the test cases are
    automatically executed.

The recommended way is to use `testCases.js` (run by `functional-tests-runner.js`). The `fuctional-tests.js` file is
provides as basically as an example in the case the "old way" needs to be used (I.E: when the test follow a different
pattern than the one supported by the test runner).

### Automatic test cases

Each test case is defined as a JSON object in the `testCases.js` file. This file is loaded by the test suite and the
test cases are automatically generated. Each test case is defined as an object with the following elements:

-   `describeName`: The name of the `DESCRIBE` test case. This will be used to generate the test case name in the mocha.
    Note this name is prefixed by a pure number (e.g `0010 - Simple group without attributes`) which specifies the group
    to which the test belong (usually meaning a feature) or by a number preced by the `#` symbol to refer to an issue
    number (e.g. `#1234 - Bug foobar`). test suite.
-   `provision`: The JSON object that will be sent to the IoTA JSON provisioning API. This will be used to create the
    group. It contains the following elements:
    -   `url`: The URL of the provisioning API (group)
    -   `method`: The HTTP method to use (POST)
    -   `json`: The JSON object that defines the group
    -   `headers`: The headers to send to the provisioning API. This should contain the `fiware-service` and
        `fiware-servicepath` headers.
    -   `skip`: optional. Allow to skip test cases (at `describe` level). It allows diferent values: `false` (default,
        meaning that the test is not skipped in any circustance), `true` (meaning the test is always skipped), `"lib"`
        (meaning the test has to be skipped when running it in IoTA Node lib repo) and `"json"` (meaning the test has to
        be skipped when running it in IOTA JSON repo). The latter alternatives are useful to skip test cases that are
        not supported by the lib (I.E: all tests related to the transport) or by the IOTA. Combinations (e.g
        `"lib,json"`) and negation (e.g. `"!lib"`) are also supported.
-   `should`: The array of test cases to execute. Each test case is defined as an object with the following elements:
    -   `transport`: The transport to use to send the measure. This can be `HTTP` or `MQTT`. It uses `HTTP` by default
        or if the `transport` element is not defined. See the "Advanced features" section for more information.
    -   `shouldName`: The name of the `IT` test case. This will be used to generate the test case name in the mocha test
        suite.
    -   `type`: The type of the test case. This can be `single`, `multimeasure` or `multientity`. See the "Advanced
        features" section for more information.
    -   `measure`: The JSON object that will be sent to the IoTA JSON measure API. This will be used to send the
        measure. It contains the following elements:
        -   `url`: The URL of the measure API (group)
        -   `method`: The HTTP method to use (POST)
        -   `qs`: The query string to send to the measure API. This should contain the `i` and `k` parameters.
        -   `json`: The JSON object that defines the measure
    -   `expectation`: The JSON object that defines the expectation. This will be used to check that the measure has
        been correctly sent to the Context Broker.
    -   `loglevel`: optional. If set to `debug`, the agent will log all the debug messages to the console. This is
        useful to check the messages sent to the Context Broker. See the "Debugging automated tests" section for more
        information.
    -   `skip`: optional. If set to `true`, the test case (`it`) will be skipped. Same as the `skip` element in the
        `provision` element.
    -   `isRegex`: optional. If set to `true`, then the expectation will be treated as a regular expression. This is
        useful to check that the measure has been correctly sent to the Context Broker when the measure contains a a
        variable parameter like a timestamp. See the "Advanced features" section for more information.

#### Example

```javascript
{
    describeName: 'Basic group provision with attributes',
    provision: {
        url: 'http://localhost:' + config.iota.server.port + '/iot/groups',
        method: 'POST',
        json: {
            groups: [
                {
                    resource: '/iot/json',
                    apikey: '123456',
                    entity_type: 'TheLightType2',
                    cbHost: 'http://192.168.1.1:1026',
                    commands: [],
                    lazy: [],
                    attributes: [
                        {
                            object_id: 's',
                            name: 'status',
                            type: 'Boolean'
                        },
                        {
                            object_id: 't',
                            name: 'temperature',
                            type: 'Number'
                        }
                    ],
                    static_attributes: []
                }
            ]
        },
        headers: {
            'fiware-service': 'smartgondor',
            'fiware-servicepath': '/gardens'
        }
    },
    should:[
        {
            shouldName: 'should send its value to the Context Broker',
            config:{
                    type: 'single'
                },
            measure: {
                url: 'http://localhost:' + config.http.port + '/iot/json',
                method: 'POST',
                qs: {
                    i: 'MQTT_2',
                    k: '123456'
                },
                json: {
                    s: false,
                    t: 10
                }
            },
            expectation: {
                id: 'TheLightType2:MQTT_2',
                type: 'TheLightType2',
                temperature: {
                    value: 10,
                    type: 'Number'
                },
                status: {
                    value: false,
                    type: 'Boolean'
                }
            }
        },
        {
            transport: 'MQTT',
            shouldName: 'should send its value to the Context Broker when using MQTT',
            config:{
                    type: 'single'
                },
            measure: {
                url: 'http://localhost:' + config.http.port + '/iot/json',
                method: 'POST',
                qs: {
                    i: 'MQTT_2',
                    k: '123456'
                },
                json: {
                    s: false,
                    t: 10
                }
            },
            expectation: {
                id: 'TheLightType2:MQTT_2',
                type: 'TheLightType2',
                temperature: {
                    value: 10,
                    type: 'Number'
                },
                status: {
                    value: false,
                    type: 'Boolean'
                }
            }
        }
    ]
}
```

### Advanced features

#### Multientity

This test suite support the multientity feature. To test this feature, you need to set add to the test case the
parameter `type: 'multientity'`. This will automatically take care of the multientity feature. This means that the suite
will configure the mock to listen to `/v2/op/update` instead of `/v2/entities?options=upsert`.

In particular, it will configure the mock to listen the correct URL. You should define the expectation for the test case
as a batch operation (see the following example).

```javascript
{
    "entities": [
        {
            "id": "TheLightType2:MQTT_2",
            "type": "TheLightType2",
            "status": {
                "value": false,
                "type": "Boolean"
            }
        },
        {
            "id": "TheLightType2:MQTT_3",
            "type": "TheLightType2",
            "temperature": {
                "value": 10,
                "type": "Number"
            }
        }
    ],
    "actionType": "append"
}
```

#### Multimeasures

It is also supported to test cases in which is sent more than one measure. To do so, you need to set add to the test
case the parameter `should.type` to the value `'multimeasure'`.

You must define the measure as multimeasure. This is done by defining the `measure` JSON element as an array of objects.
I.E:

```javascript
measure: {
    url: 'http://localhost:' + config.http.port + '/iot/json',
    method: 'POST',
    qs: {
        i: 'MQTT_2',
        k: '123456'
    },
    json: [
        {
            s: false,
            t: 21
        },
        {
            s: true,
            t: 22
        },
        {
            s: false,
            t: 23
        }
    ]
}
```

And you should define the test case `expectation` as an object, following a Context Broker batch operation. I.E:

```js
expectation: {
    actionType: 'append',
    entities: [
        {
            id: 'TheLightType2:MQTT_2',
            type: 'TheLightType2',
            temperature: {
                type: 'Number',
                value: 21
            },
            status: {
                type: 'Boolean',
                value: false
            }
        },
        {
            id: 'TheLightType2:MQTT_2',
            type: 'TheLightType2',
            temperature: {
                type: 'Number',
                value: 22
            },
            status: {
                type: 'Boolean',
                value: true
            }
        },
        {
            id: 'TheLightType2:MQTT_2',
            type: 'TheLightType2',
            temperature: {
                type: 'Number',
                value: 23
            },
            status: {
                type: 'Boolean',
                value: false
            }
        }
    ]
}
```

Then, a batch request would be sent to the Context Broker containing the different measures. More information about how
the IoT Agent send multimeasures to the Context Broker [here](/doc/api.md#multimeasure-support).

#### Transport

The test suite supports using the internal node lib function `iotAgentLib.update`, `HTTP` or `MQTT` for measure sending.
In order to select the specific way to send the measure you should add a `transport` element to each should case having
the value set to `MQTT`. By doing so, the suite will automatically configure the mock to connect to the MQTT broker and
send the measure to the correct topic based on the `i` and `k` parameters. It will ignore the `url` and `method`
parameters present in the measure JSON element. I.E:

```javascript
should: [
    {
        transport: 'MQTT',
        shouldName: 'should send its value to the Context Broker when using MQTT',
        type: 'single',
        measure: {
            url: 'http://localhost:' + config.http.port + '/iot/json',
            method: 'POST',
            qs: {
                i: 'MQTT_2',
                k: '123456'
            },
            json: {
                s: false,
                t: 10
            }
        },
        expectation: {
            id: 'TheLightType2:MQTT_2',
            type: 'TheLightType2',
            temperature: {
                value: 10,
                type: 'Number'
            },
            status: {
                value: false,
                type: 'Boolean'
            }
        }
    }
];
```

#### No payload reception

The test suite also supports the case in which the Context Broker does not receive any payload. This is done by defining
the expectation as an empty object. I.E:

```javascript
    ...
    expectation: []
    ...
```

Note that this means the CB _must not_ receive any payload. In other words, if the CB would receive any payload, the
test will fail.

### Debugging automated tests

It is possible to debug the automated tests by using the loglevel parameter set to `debug` for each should case. This
parameter configures the IoTA log level. By setting it to `debug`, the agent will log all the debug messages to the
console. This is useful to check the messages sent to the Context Broker.

It is also useful to debug the test by adding a breakpoint in the `testUtils.js` (read the comments in the file to know
where to add the breakpoint). This will allow you to debug just that particular test case stopping the execution in the
breakpoint.

Example of a test case with the loglevel set to `debug`:

```javascript
should:[
    {
        shouldName: 'should send its value to the Context Broker when using MQTT',
        loglevel: 'debug',
        transport: 'MQTT',
        config:{
                    type: 'single'
                },
        measure: {...},
        expectation: {...}
    }
]
```

### Using expressions in the expectation

It is possible to use expressions in the expectation. This is useful to check that the measure has been correctly sent
to the Context Broker when the measure contains a variable parameter like a timestamp. To do so, you need to set the
`isRegex` parameter to `true` in the test case. This will tell the test suite that the expectation can contain some
expressions. The expression support is based on [Chai match pattern plugin](https://github.com/mjhm/chai-match-pattern).
This plugin relies on [loadash match pattern](https://github.com/mjhm/lodash-match-pattern) to support the expressions.
For further information about the expression support, check the documentation of the previous links.

Even if setting the `isRegex` parameter to `true` make the test pass if the expectation does not contain any expression,
it is recommended to do not set this parameter to `true` if the expectation does not contain any expression because the
test result will be less clear if fails (it will show the error message of the expression library instead of the
expected value).

Here, you can find an example of a test case using expressions:

```javascript
    expectation: {
        id: globalEnv.entity_name,
        type: globalEnv.entity_type,
        attr_a: {
            value: 21,
            type: 'Number',
            metadata: {
                TimeInstant: {
                    type: 'DateTime',
                    value: _.isDateString
                }
            }
        },
        TimeInstant: {
            type: 'DateTime',
            value: _.isDateString
        }
    }
```

The previous example will check that the `TimeInstant` value and `attr_a.metadata.TimeInstant.value` are valid date.
