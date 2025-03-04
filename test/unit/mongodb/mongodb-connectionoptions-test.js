/*
 * Copyright 2014 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of fiware-iotagent-lib
 *
 * fiware-iotagent-lib is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * fiware-iotagent-lib is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with fiware-iotagent-lib.
 * If not, see http://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 *
 * Modified by: Nobuyuki Matsui - TIS Inc.
 */

/* eslint-disable no-unused-vars */

const dbConn = require('../../../lib/model/dbConn');
const config = require('../../../lib/commonConfig');
const mongoose = require('mongoose');
const sinon = require('sinon');
const should = require('should');
const iotAgentConfig = {
    logLevel: 'FATAL',
    contextBroker: {
        host: '192.168.1.1',
        port: '1026'
    },
    server: {
        port: 4041,
        host: 'localhost',
        baseRoot: '/'
    },
    deviceRegistry: {
        type: 'mongodb'
    },
    types: {},
    service: 'smartgondor',
    subservice: 'gardens',
    providerUrl: 'http://smartgondor.com',
    deviceRegistrationDuration: 'P1M'
};
let oldConfig;

describe('dbConn.configureDb', function () {
    let stub;

    beforeEach(function () {
        oldConfig = config.getConfig();
    });

    afterEach(function () {
        config.setConfig(oldConfig);
        if (stub) {
            stub.restore();
        }
    });

    describe('When set mongodb options, it should call mongoose.createCOnnection by using below params', function () {
        const tests = [
            {
                mongodb: {
                    host: 'example.com'
                },
                expected: {
                    url: 'mongodb://example.com:27017/' + dbConn.DEFAULT_DB_NAME,
                    options: {
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
                        replicaSet: 'rs0'
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
                    url: 'mongodb://user01:pass01@example.com:27017/' + dbConn.DEFAULT_DB_NAME,
                    options: {
                        auth: {
                            user: 'user01',
                            password: 'pass01'
                        }
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
                    url: 'mongodb://user01:pass01@example.com:98765/examples?authSource=admin',
                    options: {
                        replicaSet: 'rs0',
                        auth: {
                            user: 'user01',
                            password: 'pass01'
                        }
                    }
                }
            },
            {
                mongodb: {
                    host: 'example.com',
                    ssl: true
                },
                expected: {
                    url: 'mongodb://example.com:27017/' + dbConn.DEFAULT_DB_NAME,
                    options: {
                        ssl: true
                    }
                }
            },
            {
                mongodb: {
                    host: 'example.com',
                    extraArgs: {
                        retryWrites: true
                    }
                },
                expected: {
                    url: 'mongodb://example.com:27017/' + dbConn.DEFAULT_DB_NAME + '?retryWrites=true',
                    options: {
                    }
                }
            },
            {
                mongodb: {
                    host: 'example.com',
                    extraArgs: {
                        retryWrites: true,
                        readPreference: 'nearest'
                    }
                },
                expected: {
                    url:
                        'mongodb://example.com:27017/' +
                        dbConn.DEFAULT_DB_NAME +
                        '?retryWrites=true&readPreference=nearest',
                    options: {
                    }
                }
            },
            {
                mongodb: {
                    host: 'example.com',
                    extraArgs: {}
                },
                expected: {
                    url: 'mongodb://example.com:27017/' + dbConn.DEFAULT_DB_NAME,
                    options: {
                    }
                }
            },
            {
                mongodb: {
                    host: 'example.com',
                    extraArgs: []
                },
                expected: {
                    url: 'mongodb://example.com:27017/' + dbConn.DEFAULT_DB_NAME,
                    options: {
                    }
                }
            },
            {
                mongodb: {
                    host: 'example.com',
                    extraArgs: null
                },
                expected: {
                    url: 'mongodb://example.com:27017/' + dbConn.DEFAULT_DB_NAME,
                    options: {
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
                    authSource: 'admin',
                    ssl: true,
                    extraArgs: {
                        retryWrites: true,
                        readPreference: 'nearest',
                        w: 'majority'
                    },
                    unknownparam: 'unknown'
                },
                expected: {
                    url: 'mongodb://user01:pass01@example.com:98765/examples?retryWrites=true&readPreference=nearest&w=majority&authSource=admin',
                    options: {
                        replicaSet: 'rs0',
                        auth: {
                            user: 'user01',
                            password: 'pass01'
                        },
                        ssl: true
                    }
                }
            }
        ];
        tests.forEach(function (params) {
            it(
                'mongodb options = ' +
                    JSON.stringify(params.mongodb) +
                    ', ' +
                    'expected = ' +
                    JSON.stringify(params.expected),
                function (done) {
                    const cfg = Object.assign({}, iotAgentConfig, {
                        mongodb: params.mongodb
                    });
                    stub = sinon.stub(mongoose, 'connect').callsFake(function (url, options, fn) {
                        url.should.be.equal(params.expected.url);
                        options.should.be.eql(params.expected.options);
                        done();
                    });
                    config.setConfig(cfg);
                    dbConn.configureDb(function (error) {
                        if (error) {
                            should.fail();
                        }
                    });
                }
            );
        });
    });

    describe('When no mongodb options or "host" is empty, it should returns an error callback', function () {
        const tests = [
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
            it('mongodb options = ' + JSON.stringify(params.mongodb), function (done) {
                const cfg = Object.assign({}, iotAgentConfig, {
                    mongodb: params.mongodb
                });
                stub = sinon.stub(mongoose, 'connect').callsFake(function (url, options, fn) {
                    should.fail();
                });
                config.setConfig(cfg);
                dbConn.configureDb(function (error) {
                    if (!error) {
                        should.fail();
                    }
                    done();
                });
            });
        });
    });
});
