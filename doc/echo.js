var http = require('http'),
    express = require('express');

function dummyResponse(req, res) {
    console.log('Processing response to [%s] [%s] [%j]', req.method, req.path, req.query); 
    res.status(200).send('89');
}

function initEcho(callback) {
    echoServer = { 
        server: null,
        app: express(),
        router: express.Router()
    };  

    echoServer.app.set('port', 9999);
    echoServer.app.set('host', '0.0.0.0');

    echoServer.router.get('/iot/d', dummyResponse);
    echoServer.server = http.createServer(echoServer.app);
    echoServer.app.use('/', echoServer.router);
    echoServer.server.listen(echoServer.app.get('port'), echoServer.app.get('host'), callback);
}

initEcho(function (error) {
        if (error) {
            console.log('Could not initialize echo server: %s', error);
        } else {
            console.log('Echo server started successfully');
        }   
    }); 

