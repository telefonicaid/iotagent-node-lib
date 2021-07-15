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
