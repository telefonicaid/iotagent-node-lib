# How to develop a new IOTAgent

## Index

* [Overview](#overview)
* [Basic IOTA](#basic)
* [IOTA With active attributes](#active)
* [IOTA With lazy attributes](#lazy)
* [IOTA With commands](#commands)
* [Configuration control](#configuration)

## <a name="overview"/> Overview
This document's goal is to show how to develop a new IOT Agent step by step. To do so, a simple invented HTTP protocol
will be used, so it can be tested with simple command line instructions as `curl` and `nc`. 

### Protocol
The invented protocol will be freely adapted from Ultralight 2.0. Whenever a device wants to send an update, it will
send a request as the following:
```
curl -X GET 'http://127.0.0.1:8080/iot/d?i=ULSensor&k=abc&d=t|15#l|19.6' -i
```
Where:
* **i**: is the device ID.
* **k**: the API Key for the device's service.
* **d**: the data payload, consisting of key/value pairs separated by a pipe ('|'), with each pair separated by hash ('#');

### Requirements

This tutorial expects a Node.js v0.10 (at least) installed and working on your machine. It also expects you to have
access to a Context Broker (without any security proxies).

## <a name="basic"/> Basic IOTA
In this first chapter, we will develop an IOT Agent with a fully working northbound API and no southbound
API. This may seem useless (and indeed it is) but will serve us weel on showing the basic steps in the creation
of a IOTA.
 
First of all, we have to create the Node project. Create a folder to hold your project and type the following 
instruction:
```
npm init
```
This will create the `package.json` file for our project. Now, add the following lines to your project file:
```
  "dependencies": {
    "iotagent-node-lib": "*"
  },

```

And install the dependencies, executing, as usual:
```
npm install
```

Now we can begin with the code of our IOTA. The very minimum code we need to start a IOTA is the following:
```
var iotAgentLib = require('iotagent-node-lib'),
    config = require('./config');

iotAgentLib.activate(config, function(error) {
  if (error) {
    console.log('There was an error activating the IOTA');
    process.exit(1);
  }
});
```

The last step is to write a configuration file, that will be used to tune the behavior of our IOTA. The contents
can be copied from the `config-basic-example.js` file, in this same folder. Create a `config.js` file with it 
in the root folder of your project. Remember to change the Context Broker IP to your local Context Broker.

The IOTA is now ready to be used. Execute it with the following command:
```
node index.js
```

The northbound interface should now be fully functional, i.e.: management of device registrations and configurations.

## <a name="active"/> IOTA With Active attributes

In the previous section we created a IOTA that exposed just the Northbound interface, but that was pretty useless
(aside from its didactic use). In this section we are going to create a simple Southbound interface. It's important
to remark that the nature of the Southbound API itself has nothing to do with the creation process of an IoT Agent.
Each device protocol will use its own mechanisms and it is up to the IoTA developer to find any libraries that would 
help him in its development. In this example, we will use Express as such library. 

In order to add the Express dependency to your project, add the following line to the `dependencies` section of the
`package.json`:
```
    "express": "*",
```
And install the dependencies as usual with `npm install`. You will have to require both `express` and `http` in
your code as well.

Now, in order to accept connections in our code, we have to start express first. With this purpose in mind, we will
create a new functino `initSouthbound()`, that will be called from the initialization code of our IOTA:
```
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

This Express code set up a HTTP server, listening in the 8080 port, that will handle incoming requests targeting 
path `/iot/d` using the middleware `manageULRequest()`. This middleware will contain all the Southbound logic, and 
the library methods we need in order to progress the information to the Context Broker. The code of this middleware
would be as follows:

```
function manageULRequest(req, res, next) {
    var values;

    iotAgentLib.getDevice(req.query.i, function(error, device) {
        if (error) {
            res.status(404).send({
                message: 'Couldn\'t find the device: ' + JSON.stringify(error)
            });
        } else {
            values = parseUl(req.query.d, device);
            iotAgentLib.update(device.name, device.type, '', values, device, function(error) {
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

For this middleware we have made use of a function `parseUl()` that parses the data payload and transforms it 
in the data map expected by the update function:
```
function parseUl(data, device) {
    function findType(name) {
        for (var i=0; i < device.active.length; i++) {
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
    
    return data.split("#").map(createAttribute);
}
```

The last thing to do is to invoke the initialization function inside the IOTA startup function. The next excerpt
show the modifications in the `activate()` function:
```
iotAgentLib.activate(config, function(error) {
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

Once the IOTA is finished the last thing to do is to test it. To do so, launch the IOTA and provision a new device
(an example for provisioning can be found in the `examples/howtoProvisioning1.json` file). Once the device is 
provisioned, send a new measure by using the example command:
```
curl -X GET 'http://127.0.0.1:8080/iot/d?i=ULSensor&k=abc&d=t|15#l|19.6' -i
```

## <a name="lazy"/> IOTA With Lazy attributes

## <a name="commands"/> IOTA With commands

## <a name="configuration"/> Configuration control
