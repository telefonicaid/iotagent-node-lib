var iotAgentLib = require('iotagent-node-lib'),
    http = require('http'),
    express = require('express'),
    request = require('request'),
    config = require('./config');

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

function createResponse(id, type, attributes, body) {
    var values = body.split(','),
        responses = [];

    for (var i = 0; i < attributes.length; i++) {
        responses.push({
                name: attributes[i],
                type: "string",
                value: values[i]
        });
    }

    return {
        id: id,
        type: type,
        attributes: responses
    };
}

function queryContextHandler(id, type, attributes, callback) {
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

function createQueryFromAttributes(attributes) {
    var query = "";

    for (var i in attributes) {
        query += attributes[i].name + '|' + attributes[i].value;

        if (i != attributes.length -1) {
            query += ',';
        }
    }

    return query;
}

function updateContextHandler(id, type, attributes, callback) {
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

function provisioningHandler(device, callback) {
    console.log('\n\n* REGISTERING A NEW DEVICE:\n%s\n\n', JSON.stringify(device, null, 4));

    device.type = 'CertifiedType';

    callback(null, device);
}

function configurationHandler(configuration, callback) {
    console.log('\n\n* REGISTERING A NEW CONFIGURATION:\n%s\n\n', JSON.stringify(configuration, null, 4));
    callback(null, configuration);
}

iotAgentLib.activate(config, function(error) {
    if (error) {
        console.log('There was an error activating the IOTA');
        process.exit(1);
    } else {
        iotAgentLib.setDataUpdateHandler(updateContextHandler);
        iotAgentLib.setDataQueryHandler(queryContextHandler);
        iotAgentLib.setConfigurationHandler(configurationHandler);
        iotAgentLib.setProvisioningHandler(provisioningHandler);

        initSouthbound(function (error) {
            if (error) {
                console.log('Could not initialize South bound API due to the following error: %s', error);
            } else {
                console.log('Both APIs started successfully');
            }
        });
    }
});


