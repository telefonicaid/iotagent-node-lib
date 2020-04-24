'use strict';

var dbConn = require('../../../lib/model/dbConn'),
    config = require('../../../lib/commonConfig'),
    mongoose = require('mongoose'),
    sinon = require('sinon'),
    iotAgentConfig = {
        logLevel: 'FATAL',
        contextBroker: {
            host: '192.168.1.1',
            port: '1026'
        },
        server: {
            port: 4041,
            baseRoot: '/'
        },
        stats: {
            interval: 50,
            persistence: true
        },
        types: {},
        service: 'smartGondor',
        subservice: 'gardens',
        providerUrl: 'http://smartGondor.com',
        deviceRegistrationDuration: 'P1M'
    },
    oldConfig;

describe('dbConn.configureDb', function() {
  var stub;

  beforeEach(function() {
    oldConfig = config.getConfig();
  });

  afterEach(function() {
    config.setConfig(oldConfig);
    if (stub) {
      stub.restore();
    }
  });

  describe('When set mongodb options, it should call mongoose.createCOnnection by using below params', function() {
    var tests = [
      {
        mongodb: {
          host: 'example.com'
        },
        expected: {
          url: 'mongodb://example.com:27017/' + dbConn.DEFAULT_DB_NAME,
          options: {
            useNewUrlParser: true
          }
        }
      },
      {
        mongodb: {
          host: 'example.com',
          port: '98765'
        },
        expected: {
          url: 'mongodb://example.com:98765/' + dbConn.DEFAULT_DB_NAME,
          options: {
            useNewUrlParser: true
          }
        }
      },
      {
        mongodb: {
          host: 'example.com',
          db: 'examples'
        },
        expected: {
          url: 'mongodb://example.com:27017/examples',
          options: {
            useNewUrlParser: true
          }
        }
      },
      {
        mongodb: {
          host: 'example.com',
          replicaSet: 'rs0'
        },
        expected: {
          url: 'mongodb://example.com:27017/' + dbConn.DEFAULT_DB_NAME,
          options: {
            replicaSet: 'rs0',
            useNewUrlParser: true
          }
        }
      },
      {
        mongodb: {
          host: 'example.com',
          user: 'user01'
        },
        expected: {
          url: 'mongodb://example.com:27017/' + dbConn.DEFAULT_DB_NAME,
          options: {
            useNewUrlParser: true
          }
        }
      },
      {
        mongodb: {
          host: 'example.com',
          password: 'pass01'
        },
        expected: {
          url: 'mongodb://example.com:27017/' + dbConn.DEFAULT_DB_NAME,
          options: {
            useNewUrlParser: true
          }
        }
      },
      {
        mongodb: {
          host: 'example.com',
          user: 'user01',
          password: 'pass01'
        },
        expected: {
          url: 'mongodb://example.com:27017/' + dbConn.DEFAULT_DB_NAME,
          options: {
            auth: {
              user: 'user01',
              password: 'pass01'
            },
            useNewUrlParser: true
          }
        }
      },
      {
        mongodb: {
          host: 'example.com',
          authSource: 'admin'
        },
        expected: {
          url: 'mongodb://example.com:27017/' + dbConn.DEFAULT_DB_NAME,
          options: {
            authSource: 'admin',
            useNewUrlParser: true
          }
        }
      },
      {
        mongodb: {
          host: 'example.com',
          port: '98765',
          db: 'examples',
          replicaSet: 'rs0',
          user: 'user01',
          password: 'pass01',
          authSource: 'admin'
        },
        expected: {
          url: 'mongodb://example.com:98765/examples',
          options: {
            replicaSet: 'rs0',
            auth: {
              user: 'user01',
              password: 'pass01'
            },
            authSource: 'admin',
            useNewUrlParser: true
          }
        }
      }
    ];
    tests.forEach(function (params) {
      it('mongodb options = ' + JSON.stringify(params.mongodb) + ', expected = ' + JSON.stringify(params.expected), function(done) {
        var cfg = Object.assign({}, iotAgentConfig, {
          mongodb: params.mongodb
        });
        stub = sinon.stub(mongoose, 'createConnection').callsFake(function(url, options, fn) {
          url.should.be.equal(params.expected.url);
          options.should.be.eql(params.expected.options);
          done();
        });
        config.setConfig(cfg);
        dbConn.configureDb(function(error) {
          if (error) {
            fail();
          }
        });
      });
    });
  });

  describe('When no mongodb options or "host" is empty, it should returns an error callback', function() {
    var tests = [
      {
        mongodb: undefined
      },
      {
        mongodb: {}
      },
      {
        mongodb: {
          port: '27017'
        }
      }
    ];
    tests.forEach(function (params) {
      it('mongodb options = ' + JSON.stringify(params.mongodb), function(done){
        var cfg = Object.assign({}, iotAgentConfig, {
          mongodb: params.mongodb
        });
        stub = sinon.stub(mongoose, 'createConnection').callsFake(function (url, options, fn) {
          fail();
        });
        config.setConfig(cfg);
        dbConn.configureDb(function (error) {
          if (!error) {
            fail();
          }
          done();
        });
      });
    });
  });
});