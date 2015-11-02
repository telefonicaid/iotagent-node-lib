# How to develop a new IOTAgent

## Index

* [Overview](#overview)
* [Basic IOTA](#basic)
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
curl -X GET 'http://127.0.0.1:8080/iot/d?i=dev_agus&k=abc&d=t|15' -i
```
Where:
* **i**: is the device ID.
* **k**: the API Key for the device's service.
* **d**: the data payload, consisting of a key and a value separated by a pipe.

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

## <a name="lazy"/> IOTA With lazy attributes


## <a name="commands"/> IOTA With commands

## <a name="configuration"/> Configuration control
