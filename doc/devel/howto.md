# How to develop a new IOTAgent

-   [Overview](#overview)
    -   [Protocol](#protocol)
    -   [Requirements](#requirements)
-   [Basic IOTA](#basic-iot-agent)
-   [IOTA With Active attributes](#iot-agent-with-active-attributes)
-   [IOTA With Lazy attributes](#iota-with-lazy-attributes)
    -   [Previous considerations](#previous-considerations)
    -   [Implementation](#implementation)
-   [IoT Agent in multi-thread mode](#iot-agent-in-multi-thread-mode)
-   [Configuration management](#configuration-management)
    -   [Provisioning handlers](#provisioning-handlers)

## Overview

This document's goal is to show how to develop a new IoT Agent step by step. To do so, a simple invented HTTP protocol
will be used, so it can be tested with simple command-line instructions as `curl` and `nc`.

### Protocol

The invented protocol will be freely adapted from
[Ultralight 2.0](https://github.com/telefonicaid/fiware-IoTAgent-Cplusplus/blob/develop/doc/modules.md#ultra-light-agent).
Whenever a device wants to send an update, it will send a request as the following:

```bash
curl -X GET 'http://127.0.0.1:8080/iot/d?i=ULSensor&k=abc&d=t|15,l|19.6' -i
```

Where:

-   **i**: is the device ID.
-   **k**: the API Key for the device's service.
-   **d**: the data payload, consisting of key-value pairs separated by a pipe (`|`), with each pair separated by comma
    (`,`);

### Requirements

This tutorial expects a Node.js v8 (at least) installed and working on your machine. It also expects you to have access
to a Context Broker (without any security proxies).

## Basic IoT Agent

In this first chapter, we will just develop an IoT Agent with a fully connected North Port. This will send and receive
NGSI traffic and can be administered using the IoT Agent's Device Provisioning API. The South Port will remain
unconnected and no native protocol traffic will be sent to the devices. This may seem useless (and indeed it is) but it
will serve us well on showing the basic steps in the creation of an IoT Agent.

First of all, we have to create the Node project. Create a folder to hold your project and type the following
instruction:

```bash
npm init
```

This will create the `package.json` file for our project. Now, add the following lines to your project file:

```json
  "dependencies": {
    "iotagent-node-lib": "*"
  },

```

And install the dependencies, executing, as usual:

```bash
npm install
```

The first step is to write a configuration file, that will be used to tune the behavior of our IOTA. The contents can be
copied from the following example:

```javascript
var config = {
    logLevel: 'DEBUG',
    contextBroker: {
        host: 'localhost',
        port: '1026'
    },
    server: {
        port: 4041
    },
    deviceRegistry: {
        type: 'memory'
    },
    types: {},
    service: 'howtoService',
    subservice: '/howto',
    providerUrl: 'http://localhost:4041',
    defaultType: 'Thing'
};

module.exports = config;
```

Create a `config.js` file with it in the root folder of your project. Remember to change the Context Broker IP to your
local Context Broker.

Now we can begin with the code of our IoT Agent. The very minimum code we need to start an IoT Agent is the following:

```javascript
var iotAgentLib = require('iotagent-node-lib'),
    config = require('./config');

iotAgentLib.activate(config, function (error) {
    if (error) {
        console.log('There was an error activating the IOTA');
        process.exit(1);
    }
});
```

The IoT Agent is now ready to be used. Execute it with the following command:

```bash
node index.js
```

The North Port interface should now be fully functional, i.e.: management of device registrations and configurations.

## IoT Agent With Active attributes

In the previous section we created an IoT Agent that exposed just the North Port interface, but that was pretty useless
(aside from its didactic use). In this section we are going to create a simple South Port interface. It's important to
remark that the nature of the traffic South of the IoT Agent itself has nothing to do with the creation process of an
IoT Agent. Each device protocol will use its own mechanisms and it is up to the IoT Agent developer to find any
libraries that would help him in its development. In this example, we will use Express as such library.

In order to add the Express dependency to your project, add the following line to the `dependencies` section of the
`package.json`:

```json
    "express": "*",
```

The require section would end up like this (the standard `http` module is also needed):

```javascript
var iotAgentLib = require('iotagent-node-lib'),
    http = require('http'),
    express = require('express'),
    config = require('./config');
```

And install the dependencies as usual with `npm install`. You will have to require both `express` and `http` in your
code as well.

Now, in order to accept connections in our code, we have to start express first. With this purpose in mind, we will
create a new function `initSouthbound()`, that will be called from the initialization code of our IoT Agent:

```javascript
function initSouthbound(callback) {
    southboundServer = {
        server: null,
        app: express(),
        router: express.Router()
    };

    southboundServer.app.set('port', 8080);
    southboundServer.app.set('host', '0.0.0.0');

    southboundServer.router.get('/iot/d', manageULRequest);
    southboundServer.server = http.createServer(southboundServer.app);
    southboundServer.app.use('/', southboundServer.router);
    southboundServer.server.listen(southboundServer.app.get('port'), southboundServer.app.get('host'), callback);
}
```

This Express code sets up a HTTP server, listening in the 8080 port, that will handle incoming requests targeting path
`/iot/d` using the middleware `manageULRequest()`. This middleware will contain all the logic south of the IoT Agent,
and the library methods we need in order to progress the information to the Context Broker. The code of this middleware
would be as follows:

```javascript
function manageULRequest(req, res, next) {
    var values;

    iotAgentLib.retrieveDevice(req.query.i, req.query.k, function (error, device) {
        if (error) {
            res.status(404).send({
                message: "Couldn't find the device: " + JSON.stringify(error)
            });
        } else {
            values = parseUl(req.query.d, device);
            iotAgentLib.update(device.name, device.type, '', values, device, function (error) {
                if (error) {
                    res.status(500).send({
                        message: 'Error updating the device'
                    });
                } else {
                    res.status(200).send({
                        message: 'Device successfully updated'
                    });
                }
            });
        }
    });
}
```

For this middleware we have made use of a function `parseUl()` that parses the data payload and transforms it in the
data object expected by the update function (i.e.: an attribute array with NGSI syntax):

```javascript
function parseUl(data, device) {
    function findType(name) {
        for (var i = 0; i < device.active.length; i++) {
            if (device.active[i].name === name) {
                return device.active[i].type;
            }
        }

        return null;
    }

    function createAttribute(element) {
        var pair = element.split('|'),
            attribute = {
                name: pair[0],
                value: pair[1],
                type: findType(pair[0])
            };

        return attribute;
    }

    return data.split(',').map(createAttribute);
}
```

Here as an example of the output of the function return for the UL payload `t|15,l|19.6`:

```json
[
    {
        "name": "t",
        "type": "celsius",
        "value": "15"
    },
    {
        "name": "l",
        "type": "meters",
        "value": "19.6"
    }
]
```

The last thing to do is to invoke the initialization function inside the IoT Agent startup function. The next excerpt
show the modifications in the `activate()` function:

```javascript
iotAgentLib.activate(config, function (error) {
    if (error) {
        console.log('There was an error activating the IOTA');
        process.exit(1);
    } else {
        initSouthbound(function (error) {
            if (error) {
                console.log('Could not initialize South bound API due to the following error: %s', error);
            } else {
                console.log('Both APIs started successfully');
            }
        });
    }
});
```

Some logs were added in this piece of code to help debugging.

Once the IOTA is finished the last thing to do is to test it. To do so, launch the IoT Agent and provision a new device
(an example for provisioning can be found in the `examples/howtoProvisioning1.json` file). Once the device is
provisioned, send a new measure by using the example command:

```bash
curl -X GET 'http://127.0.0.1:8080/iot/d?i=ULSensor&k=abc&d=t|15,l|19.6' -i
```

Now you should be able to see the measures in the Context Broker entity of the device.

## IOTA With Lazy attributes

### Previous considerations

The IoT Agents also give the possibility for the device to be asked about the value of one of its measures, instead of
reporting it. In order to do so, the device must be capable of receiving messages of some kind. In this case, we are
going to simulate an HTTP server with `nc` in order to see the values sent by the IOTA. We also have to decide a syntax
for the protocol request for asking the device about a measure. For clarity, we will use the same HTTP GET request we
used to report a measure, but indicating the attribute to ask instead of the data payload. Something like:

```bash
curl -X GET 'http://127.0.0.1:9999/iot/d?i=ULSensor&k=abc&q=t,l' -i
```

In a real implementation, the server will need to know the URL and port where the devices are listening, in order to
send the request to the appropriate device. For this example, we will assume that the device is listening in port 9999
in localhost. For more complex cases, the mechanism to bind devices to addresses would be IoT-Agent-specific (e.g.: the
OMA Lightweight M2M IoT Agent captures the address of the device in the device registration, and stores the
device-specific information in a MongoDB document).

Being lazy attributes of a read/write nature, another syntax has to be declared for updating. This syntax will mimic the
one used for updating the server:

```
curl -X GET 'http://127.0.0.1:9999/iot/d?i=ULSensor&k=abc&d=t|15,l|19.6' -i
```

Both types of calls to the device will be distinguished by the presence or absence of the `d` and `q` attributes.

A HTTP request library will be needed in order to make those calls. To this extent, `mikeal/request` library will be
used. In order to do so, add the following require statement to the initialization code:

```javascript
request = require('request');
```

and add the `request` dependency to the `package.json` file:

```json
  "dependencies": [
  [...]

    "request": "*",

  ]
```

The require section should now look like this:

```javascript
var iotAgentLib = require('iotagent-node-lib'),
    http = require('http'),
    express = require('express'),
    request = require('request'),
    config = require('./config');
```

### Implementation

#### QueryContext implementation

The main step to complete in order to implement the Lazy attributes mechanism in the IoT Agent is to provide handlers
for the context provisioning requests. At this point, we should provide two handlers: the `/v2/op/update` and the
`/v2/op/query` handlers. To do so, we must first define the handlers themselves:

```javascript
function queryContextHandler(id, type, service, subservice, attributes, callback) {
    var options = {
        url: 'http://127.0.0.1:9999/iot/d',
        method: 'GET',
        qs: {
            q: attributes.join()
        }
    };

    request(options, function (error, response, body) {
        if (error) {
            callback(error);
        } else {
            callback(null, createResponse(id, type, attributes, body));
        }
    });
}
```

The queryContext handler is called whenever a `/v2/op/query` request arrives at the North port of the IoT Agent. It is
invoked once for each entity requested, passing the entity ID and Type as the parameters, as well as a list of the
attributes that are requested. In our case, the handler uses this parameters to compose a request to the device. Once
the results of the device are returned, the values are returned to the caller, in the NGSI attribute format.

In order to format the response from the device in a readable way, we created a `createResponse()` function that maps
the values to its correspondent attributes. This function assumes the type of all the attributes is "string" (this will
not be the case in a real scenario, where the IoT Agent should retrieve the associated device to guess the type of its
attributes). Here is the code for the `createResponse()` function:

```javascript
function createResponse(id, type, attributes, body) {
    var values = body.split(','),
        responses = [];

    for (var i = 0; i < attributes.length; i++) {
        responses.push({
            name: attributes[i],
            type: 'string',
            value: values[i]
        });
    }

    return {
        id: id,
        type: type,
        attributes: responses
    };
}
```

#### UpdateContext implementation

```javascript
function updateContextHandler(id, type, service, subservice, attributes, callback) {
    var options = {
        url: 'http://127.0.0.1:9999/iot/d',
        method: 'GET',
        qs: {
            d: createQueryFromAttributes(attributes)
        }
    };

    request(options, function (error, response, body) {
        if (error) {
            callback(error);
        } else {
            callback(null, {
                id: id,
                type: type,
                attributes: attributes
            });
        }
    });
}
```

The updateContext handler deals with the modification requests that arrive at the North Port of the IoT Agent via
`/v2/op/update`. It is invoked once for each entity requested (note that a single request can contain multiple entity
updates), with the same parameters used in the queryContext handler. The only difference is the value of the attributes
array, now containing a list of attribute objects, each containing name, type and value. The handler must also make use
of the callback to return a list of updated attributes.

For this handler we have used a helper function called `createQueryFromAttributes()`, that transforms the NGSI
representation of the attributes to the UL type expected by the device:

```javascript
function createQueryFromAttributes(attributes) {
    var query = '';

    for (var i in attributes) {
        query += attributes[i].name + '|' + attributes[i].value;

        if (i != attributes.length - 1) {
            query += ',';
        }
    }

    return query;
}
```

#### Handler registration

Once both handlers have been defined, they have to be registered in the IoT Agent, adding the following code to the
setup function:

```javascript
iotAgentLib.setDataUpdateHandler(updateContextHandler);
iotAgentLib.setDataQueryHandler(queryContextHandler);
```

Where necessary, additional handlers to deal with command actuations and merge-patch operations may also be added when
necessary.

```javascript
iotAgentLib.setCommandHandler(commandHandler);
iotAgentLib.setMergePatchHandler(mergePatchHandler);
```

#### IOTA Testing

In order to test it, we need to create an HTTP server simulating the device. The quickest way to do that may be using
netcat. In order to start it just run the following command from the command-line (Linux and Mac only):

```bash
nc -l 9999
```

This will open a simple TCP server listening on port `9999`, where the requests from the IoT Agent will be printed. In
order for the complete workflow to work (and to receive the response in the application side), the HTTP response has to
be written in the `nc` console (although for testing purposes this is not needed).

While netcat is great to test simple connectivity, you will need something just a bit more complex to get the complete
scenario working (at least without the need to be incredibly fast sending your response). In order to do so, a simple
echo server was created, that answers 42 to any query to its `/iot/d` path. You can use it to test your attributes one
by one (or you can modify it to accept more requests and give more complex responses). Copy the
[Echo Server script](echo.js) to the same folder of your IoTAgent (as it uses the same dependencies). In order to run
the echo server, just execute the following command:

```bash
node echo.js
```

Once the mock server has been started (either `nc` or the `echo` server), proceed with the following steps to test your
implementation:

1. Provision a device with two lazy attributes. The following request can be used as an example:

```text
POST /iot/devices HTTP/1.1
Host: localhost:4041
Content-Type: application/json
fiware-service: howtoserv
fiware-servicepath: /test
Cache-Control: no-cache
Postman-Token: 993ac66b-72da-9e96-ab46-779677a5896a

{
    "devices": [
      {
        "device_id": "ULSensor",
        "entity_name": "Sensor01",
        "entity_type": "BasicULSensor",
        "lazy": [
            {
                "name": "t",
                "type": "celsius"
            },
            {
                "name": "l",
                "type": "meters"
            }
        ],
        "attributes": [
        ]
      }
    ]
}
```

2. Execute a `/v2/op/query` or `/v2/op/update` against one of the entity attributes (use a NGSI client of curl command).

```text
POST /v2/op/query HTTP/1.1
Host: localhost:1026
Content-Type: application/json
Accept: application/json
Fiware-Service: howtoserv
Fiware-ServicePath: /test
Cache-Control: no-cache

{
  entities: [
    {
      id: 'Light:light1'
    }
  ],
  attrs: ['dimming']
}
```

3. Check the received request in the nc console is the expected one.

4. (In case you use netcat). Answer the request with an appropriate HTTP response and check the result of the
   `/v2/op/query` or `/v2/op/update` request is the expected one. An example of HTTP response, for a query to the `t`
   and `l` attributes would be:

```text
HTTP/1.0 200 OK
Content-Type: text/plain
Content-Length: 3

5,6
```

This same response can be used both for updates and queries for testing purposes (even though in the former the body
won't be read).

## IoT Agent in multi-thread mode

It is possible that an IoT Agent can be executed in multi-thread approach, which will increase the number of
request/seconds that can be manage by the server. It's important to remark that the nature of this functionality in
included in the IoT Agent Node Lib but it is not mandatory that you activate this functionality. In this example, we
will see how to use this functionality to deploy an IoT Agent in multi-thread environment.

**WARNING:** it has been observed in Orion-IOTA integration tests some fails in bidirectional plugin usage scenarios in
multi-thread mode. The fail has not been confirmed yet (it could be a glitch of the testing environment). However, take
this into account if you use multi-thread in combination with bidirectional plugin.

In order to activate the functionality, you have two options, configure the `config.js` file to add the following line:

```javascript
/**
 * flag indicating whether the node server will be executed in multi-core option (true) or it will be a
 * single-thread one (false).
 */
config.multiCore = true;
```

or you can define the proper IOTA_MULTI_CORE environment variable. By default, the first choice is the environment
variable and afterward the value of the multiCore in the `config.js` file. The require section would end up like this
(the standard `http` module is also needed):

```javascript
var iotAgent = require('../lib/iotagent-implementation'),
    iotAgentLib = require('iotagent-node-lib'),
    config = require('./config');
```

It is important to mention the purpose of the `iotAgent` variable. It is the proper implementation of the IoT Agent
based on the IoT Agent Node Lib. We will need this variable just to make a callback to the corresponding `start()`
process from the library. The variable `config` is used to get details of the configuration file and send that
information to the Node Lib. The Node Lib will take the decision of single-thread or multi-thread execution base on the
value of `config.multiCore` attribute.

Finally, we can call the corresponding [iotagentLib.startServer()](usermanual.md#iotagentlibstartserver) like the
following code with a callback function to show details about any error during the execution or just print the message
about starting the IoTAgent:

```javascript
iotAgentLib.startServer(config, iotAgent, function (error) {
    if (error) {
        console.log(context, 'Error starting IoT Agent: [%s] Exiting process', error);
    } else {
        console.log(context, 'IoT Agent started');
    }
});
```

> Note: `startServer()` initializes the server but it does not activate the library. The function in the Node Lib will
> call the `iotAgent.start()` in order to complete the activation of the library. Therefore, it is expected that the IoT
> Agent implement the `iotAgent.start()` function with the proper invocation to the `iotAgentLib.activate()`.

## Configuration management

For some IoT Agents, it will be useful to know what devices or configurations were registered in the Agent, or to do
some actions whenever a new device is registered. All this configuration and provisioning actions can be performed using
two mechanisms: the provisioning handlers and the provisioning API.

### Provisioning handlers

The handlers provide a way for the IoT Agent to act whenever a new device, or configuration is provisioned. This can be
used for registering the device in external services, for storing important information about the device, or to listen
in new ports in the case of new configuration. For the simple example we are developing, we will just print the
information we are receiving whenever a new device or configuration is provisioned.

We need to complete two further steps to have a working set of provisioning handlers. First of all, defining the
handlers themselves. Here we can see the definition of the configuration handler:

```javascript
function configurationHandler(configuration, callback) {
    console.log('\n\n* REGISTERING A NEW CONFIGURATION:\n%s\n\n', JSON.stringify(configuration, null, 4));
    callback(null, configuration);
}
```

As we can see, the handlers receive the device or configuration that is being provisioned, as well as a callback. The
handler MUST call the callback once in order for the IOTA to work properly. If an error is passed as a parameter to the
callback, the provisioning will be aborted. If no error is passed, the provisioning process will continue. This
mechanism can be used to implement security mechanisms or to filter the provisioning of devices to the IoT Agent.

Note also that the same `device` or `configuration` object is passed along to the callback. This lets the IoT Agent
change some of the values provisioned by the user, to add or restrict information in the provisioning. To test this
feature, let's use the provisioning handler to change the value of the type of the provisioning device to
`CertifiedType` (reflecting some validation process performed on the provisioning):

```javascript
function provisioningHandler(device, callback) {
    console.log('\n\n* REGISTERING A NEW DEVICE:\n%s\n\n', JSON.stringify(device, null, 4));
    device.type = 'CertifiedType';
    callback(null, device);
}
```

Once the handlers are defined, the new set of handlers has to be registered into the IoT Agent:

```javascript
iotAgentLib.setConfigurationHandler(configurationHandler);
iotAgentLib.setProvisioningHandler(provisioningHandler);
```

Now we can test our implementation by sending provisioning requests to the North Port of the IoT Agent. If we provision
a new device into the platform, and then we ask for the list of provisioned devices, we shall see the type of the
provisioned device has changed to `CertifiedType`.
