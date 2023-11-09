const config = require('./config-test.js');
var chai = require('chai');
var chaiMatchPattern = require('chai-match-pattern');
chai.use(chaiMatchPattern);
var _ = chaiMatchPattern.getLodashModule();
chai.config.truncateThreshold = 0;

const globalEnv = {
    service: 'smartgondor',
    servicePath: '/gardens',
    apikey: '123456',
    entity_type: 'TestType',
    entity_name: 'TestType:TestDevice',
    deviceId: 'TestDevice'
};

const testCases = [
    // BASIC TESTS
    {
        describeName: '0010 - Simple group without attributes',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        commands: [],
                        lazy: [],
                        attributes: [],
                        static_attributes: []
                    }
                ]
            },
            headers: {
                'fiware-service': globalEnv.service,
                'fiware-servicepath': globalEnv.servicePath
            }
        },
        should: [
            {
                // loglevel: 'debug',
                shouldName:
                    'A - WHEN sending measures through http IT should send measures to Context Broker preserving value types',
                config: {
                    type: 'single'
                },
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: false,
                        b: 10,
                        c: 'text',
                        d: 10.5,
                        e: [1, 2],
                        f: { a: 1, b: 2 }
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    a: {
                        value: false,
                        type: 'string'
                    },
                    b: {
                        value: 10,
                        type: 'string'
                    },
                    c: {
                        type: 'string',
                        value: 'text'
                    },
                    d: {
                        type: 'string',
                        value: 10.5
                    },
                    e: {
                        type: 'string',
                        value: [1, 2]
                    },
                    f: {
                        type: 'string',
                        value: {
                            a: 1,
                            b: 2
                        }
                    }
                }
            },
            {
                transport: 'MQTT',
                shouldName:
                    'B - WHEN sending measures through mqtt IT should send measures to Context Broker preserving value types',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: false,
                        b: 10,
                        c: 'text',
                        d: 10.5,
                        e: [1, 2],
                        f: { a: 1, b: 2 }
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    a: {
                        value: false,
                        type: 'string'
                    },
                    b: {
                        value: 10,
                        type: 'string'
                    },
                    c: {
                        type: 'string',
                        value: 'text'
                    },
                    d: {
                        type: 'string',
                        value: 10.5
                    },
                    e: {
                        type: 'string',
                        value: [1, 2]
                    },
                    f: {
                        type: 'string',
                        value: {
                            a: 1,
                            b: 2
                        }
                    }
                }
            }
        ]
    },
    {
        describeName: '0020 - Simple group with active attributes',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'a',
                                name: 'attr_a',
                                type: 'Boolean'
                            },
                            {
                                object_id: 'b',
                                name: 'attr_b',
                                type: 'Integer'
                            },
                            {
                                object_id: 'c',
                                name: 'attr_c',
                                type: 'Text'
                            },
                            {
                                object_id: 'd',
                                name: 'attr_d',
                                type: 'Float'
                            },
                            {
                                object_id: 'e',
                                name: 'attr_e',
                                type: 'Array'
                            },
                            {
                                object_id: 'f',
                                name: 'attr_f',
                                type: 'Object'
                            }
                        ],
                        static_attributes: []
                    }
                ]
            },
            headers: {
                'fiware-service': globalEnv.service,
                'fiware-servicepath': globalEnv.servicePath
            }
        },
        should: [
            {
                shouldName:
                    'A - WHEN sending defined object_ids (measures) through http IT should send measures to Context Broker preserving value types and name mappings',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: false,
                        b: 10,
                        c: 'text',
                        d: 10.5,
                        e: [1, 2],
                        f: { a: 1, b: 2 }
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: false,
                        type: 'Boolean'
                    },
                    attr_b: {
                        value: 10,
                        type: 'Integer'
                    },
                    attr_c: {
                        type: 'Text',
                        value: 'text'
                    },
                    attr_d: {
                        type: 'Float',
                        value: 10.5
                    },
                    attr_e: {
                        type: 'Array',
                        value: [1, 2]
                    },
                    attr_f: {
                        type: 'Object',
                        value: {
                            a: 1,
                            b: 2
                        }
                    }
                }
            },
            {
                shouldName:
                    'B - WHEN sending defined object_ids (measures) through mqtt IT should send measures to Context Broker preserving value types and name mappings',
                transport: 'MQTT',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: false,
                        b: 10,
                        c: 'text',
                        d: 10.5,
                        e: [1, 2],
                        f: { a: 1, b: 2 }
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: false,
                        type: 'Boolean'
                    },
                    attr_b: {
                        value: 10,
                        type: 'Integer'
                    },
                    attr_c: {
                        type: 'Text',
                        value: 'text'
                    },
                    attr_d: {
                        type: 'Float',
                        value: 10.5
                    },
                    attr_e: {
                        type: 'Array',
                        value: [1, 2]
                    },
                    attr_f: {
                        type: 'Object',
                        value: {
                            a: 1,
                            b: 2
                        }
                    }
                }
            },
            {
                shouldName:
                    'C - WHEN sending undefined object_ids (measures) through http IT should send measures to Context Broker preserving value types',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        u: false,
                        v: 10,
                        w: 'text',
                        y: 10.5,
                        x: [1, 2],
                        z: { a: 1, b: 2 }
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    u: {
                        value: false,
                        type: 'string'
                    },
                    v: {
                        value: 10,
                        type: 'string'
                    },
                    w: {
                        type: 'string',
                        value: 'text'
                    },
                    y: {
                        type: 'string',
                        value: 10.5
                    },
                    x: {
                        type: 'string',
                        value: [1, 2]
                    },
                    z: {
                        type: 'string',
                        value: {
                            a: 1,
                            b: 2
                        }
                    }
                }
            },
            {
                shouldName:
                    'D - WHEN sending undefined object_ids (measures) through mqtt IT should send measures to Context Broker preserving value types',
                transport: 'MQTT',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        u: false,
                        v: 10,
                        w: 'text',
                        y: 10.5,
                        x: [1, 2],
                        z: { a: 1, b: 2 }
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    u: {
                        value: false,
                        type: 'string'
                    },
                    v: {
                        value: 10,
                        type: 'string'
                    },
                    w: {
                        type: 'string',
                        value: 'text'
                    },
                    y: {
                        type: 'string',
                        value: 10.5
                    },
                    x: {
                        type: 'string',
                        value: [1, 2]
                    },
                    z: {
                        type: 'string',
                        value: {
                            a: 1,
                            b: 2
                        }
                    }
                }
            }
        ]
    },
    // JEXL TESTS
    {
        describeName: '0030 - Simple group with active attribute + JEXL expression boolean (!)',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'a',
                                name: 'attr_a',
                                type: 'Boolean',
                                expression: '!a'
                            }
                        ],
                        static_attributes: []
                    }
                ]
            },
            headers: {
                'fiware-service': globalEnv.service,
                'fiware-servicepath': globalEnv.servicePath
            }
        },
        should: [
            {
                shouldName:
                    'A - WHEN sending a boolean value (false) through http IT should send to Context Broker the value true ',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: false
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: true,
                        type: 'Boolean'
                    }
                }
            },
            {
                shouldName:
                    'B - WHEN sending a numeric value (3) through http IT should send to Context Broker the value false ',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 3
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: false,
                        type: 'Boolean'
                    }
                }
            },
            {
                shouldName:
                    'C - WHEN sending a text value (abcd) through http IT should send to Context Broker the value false ',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 'abcd'
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: false,
                        type: 'Boolean'
                    }
                }
            },
            {
                shouldName:
                    'D - WHEN not sending the object ID (undefined) required by the expression through http IT should send to Context Broker the value true ',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        b: 1
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: true,
                        type: 'Boolean'
                    },
                    b: {
                        value: 1,
                        type: 'string'
                    }
                }
            }
        ]
    },
    {
        describeName: '0040 - Simple group with active attribute + JEXL expression numeric (+3)',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'a',
                                name: 'attr_a',
                                type: 'Number',
                                expression: 'a+3'
                            }
                        ],
                        static_attributes: []
                    }
                ]
            },
            headers: {
                'fiware-service': globalEnv.service,
                'fiware-servicepath': globalEnv.servicePath
            }
        },
        should: [
            {
                shouldName:
                    'A - WHEN sending a boolean value (true) through http IT should send to Context Broker the value 4 ',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: true
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 4,
                        type: 'Number'
                    }
                }
            },
            {
                shouldName:
                    'B - WHEN sending a boolean value (false) through http IT should send to Context Broker the value 3 ',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: false
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 3,
                        type: 'Number'
                    }
                }
            },
            {
                shouldName:
                    'C - WHEN sending a numeric value (-7) through http IT should send to Context Broker the value -4 ',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: -7
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: -4,
                        type: 'Number'
                    }
                }
            },
            {
                shouldName:
                    'D - WHEN sending a text value (abcd) through http IT should send to Context Broker the value abcd3',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 'abcd'
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 'abcd3',
                        type: 'Number'
                    }
                }
            },
            {
                shouldName:
                    'E - WHEN not sending the object ID (undefined) required by the expression through http IT should not send that attribute to Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        b: 1
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    b: {
                        value: 1,
                        type: 'string'
                    }
                }
            }
        ]
    },
    {
        describeName: '0050 - Simple group with active attribute + JEXL expression numeric (*3)',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'a',
                                name: 'attr_a',
                                type: 'Number',
                                expression: 'a*3'
                            }
                        ],
                        static_attributes: []
                    }
                ]
            },
            headers: {
                'fiware-service': globalEnv.service,
                'fiware-servicepath': globalEnv.servicePath
            }
        },
        should: [
            {
                shouldName:
                    'A - WHEN sending a boolean value (true) through http IT should send to Context Broker the value 3 ',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: true
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 3,
                        type: 'Number'
                    }
                }
            },
            {
                shouldName:
                    'B - WHEN sending a boolean value (false) through http IT should send to Context Broker the value 0',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: false
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 0,
                        type: 'Number'
                    }
                }
            },
            {
                shouldName:
                    'C - WHEN sending a numeric value (-7) through http IT should send to Context Broker the value -21 ',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: -7
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: -21,
                        type: 'Number'
                    }
                }
            },
            {
                shouldName:
                    'D - WHEN sending a text value (abcd) through http IT should not send to anything to Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 'abcd'
                    }
                },
                expectation: []
            },
            {
                shouldName:
                    'E - WHEN not sending the object ID (undefined) required by the expression through http IT should not send that attribute to Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        b: 1
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    b: {
                        value: 1,
                        type: 'string'
                    }
                }
            }
        ]
    },
    {
        describeName: '0060 - Simple group with active attribute + JEXL expression text (a|substr(0,2))',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'a',
                                name: 'attr_a',
                                type: 'Number',
                                expression: 'a|substr(0,3)'
                            }
                        ],
                        static_attributes: []
                    }
                ]
            },
            headers: {
                'fiware-service': globalEnv.service,
                'fiware-servicepath': globalEnv.servicePath
            }
        },
        should: [
            {
                shouldName:
                    'A - WHEN sending a boolean value (true) through http IT should send to Context Broker the value "tru" ',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: true
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 'tru',
                        type: 'Number'
                    }
                }
            },
            {
                shouldName:
                    'B - WHEN sending a boolean value (false) through http IT should send to Context Broker the value "fal"',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: false
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 'fal',
                        type: 'Number'
                    }
                }
            },
            {
                shouldName:
                    'C - WHEN sending a numeric value (-7) through http IT should send to Context Broker the value "-7" ',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: -7
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: '-7',
                        type: 'Number'
                    }
                }
            },
            {
                shouldName:
                    'D - WHEN sending a text value (abcd) through http IT should not send to anything to Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 'abcd'
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 'abc',
                        type: 'Number'
                    }
                }
            },
            {
                shouldName:
                    'E - WHEN not sending the object ID (undefined) required by the expression through http IT should not send that attribute to Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        b: 1
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 'und',
                        type: 'Number'
                    },
                    b: {
                        value: 1,
                        type: 'string'
                    }
                }
            }
        ]
    },
    {
        describeName: '0070 - Simple group with active attribute + chained JEXL expression text (a|substr(0,2))',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'a',
                                name: 'a',
                                type: 'Text',
                                expression: 'a | trim | replacestr("hello","hi")'
                            }
                        ],
                        static_attributes: []
                    }
                ]
            },
            headers: {
                'fiware-service': globalEnv.service,
                'fiware-servicepath': globalEnv.servicePath
            }
        },
        should: [
            {
                shouldName:
                    'A - WHEN sending a expected value ("Say hello and smile") through http IT should send to Context Broker the value "Say hi and smile" ',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 'Say hello and smile'
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    a: {
                        value: 'Say hi and smile',
                        type: 'Text'
                    }
                }
            }
        ]
    },
    {
        describeName: '0080 - Simple group with active attribute + JEXL expression text reusing previous values)',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'a',
                                name: 'attr_a',
                                type: 'Number',
                                expression: 'a*10'
                            },
                            {
                                object_id: 'b',
                                name: 'attr_b',
                                type: 'Number',
                                expression: 'attr_a*10'
                            }
                        ],
                        static_attributes: []
                    }
                ]
            },
            headers: {
                'fiware-service': globalEnv.service,
                'fiware-servicepath': globalEnv.servicePath
            }
        },
        should: [
            {
                shouldName:
                    'A - WHEN sending a value (a:3) through http IT should apply nested expressions and send to Context Broker the value "attr_b=300" ',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 3
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 30,
                        type: 'Number'
                    },
                    attr_b: {
                        value: 300,
                        type: 'Number'
                    }
                }
            }
        ]
    },
    {
        describeName: '0090 - Simple group with active attribute + JEXL expression referencing static attributes',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'a',
                                name: 'attr_a',
                                type: 'Number',
                                expression: 'a*coef'
                            }
                        ],
                        static_attributes: [
                            {
                                name: 'coef',
                                type: 'Number',
                                value: 1.5
                            }
                        ]
                    }
                ]
            },
            headers: {
                'fiware-service': globalEnv.service,
                'fiware-servicepath': globalEnv.servicePath
            }
        },
        should: [
            {
                shouldName:
                    'A - WHEN sending a value (a:6) through http IT should apply the expression using the static attribute value and send to Context Broker the value "attr_a:9" ',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 6
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 9,
                        type: 'Number'
                    },
                    coef: {
                        value: 1.5,
                        type: 'Number'
                    }
                }
            }
        ]
    },
    {
        describeName: '0100 - Simple group with active attribute + JEXL expression referencing context attributes',
        skip: 'lib', // Explanation in #1523
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'a',
                                name: 'attr_a',
                                type: 'Text',
                                expression: 'a+":"+service+subservice+id+type'
                            }
                        ]
                    }
                ]
            },
            headers: {
                'fiware-service': globalEnv.service,
                'fiware-servicepath': globalEnv.servicePath
            }
        },
        should: [
            {
                shouldName:
                    'A - WHEN sending a value (text) through http IT should apply the expression using the context attributes value and send to Context Broker the value "text:smartgondor/gardensTestDeviceTestType" ',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 'text'
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value:
                            'text:' +
                            globalEnv.service +
                            globalEnv.servicePath +
                            globalEnv.deviceId +
                            globalEnv.entity_type,
                        type: 'Text'
                    }
                }
            }
        ]
    },
    {
        describeName: '0110 - Simple group with active attributes + JEXL multiples expressions at same time',
        skip: 'lib', // Explanation in #1523
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'a',
                                name: 'attr_a',
                                type: 'Boolean',
                                expression: '!a'
                            },
                            {
                                object_id: 'b',
                                name: 'attr_b',
                                type: 'Integer',
                                expression: 'b+1'
                            },
                            {
                                object_id: 'c',
                                name: 'attr_c',
                                type: 'Text',
                                expression: 'c+":"+service+subservice+id+type'
                            },
                            {
                                object_id: 'd',
                                name: 'attr_d',
                                type: 'Float',
                                expression: 'd/2+attr_b'
                            },
                            {
                                object_id: 'e',
                                name: 'attr_e',
                                type: 'Array',
                                expression: 'e|concatarr([3,4])'
                            },
                            {
                                object_id: 'f',
                                name: 'attr_f',
                                type: 'Object',
                                expression: '{coordinates: [f.a,f.b], type: "Point"}'
                            }
                        ],
                        static_attributes: []
                    }
                ]
            },
            headers: {
                'fiware-service': globalEnv.service,
                'fiware-servicepath': globalEnv.servicePath
            }
        },
        should: [
            {
                shouldName:
                    'A - WHEN sending multiples object_ids (measures) through http IT should send measures to Context Broker applying all expressions at same time',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: false,
                        b: 10,
                        c: 'text',
                        d: 10.5,
                        e: [1, 2],
                        f: { a: 1, b: 2 }
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: true,
                        type: 'Boolean'
                    },
                    attr_b: {
                        value: 11,
                        type: 'Integer'
                    },
                    attr_c: {
                        type: 'Text',
                        value:
                            'text:' +
                            globalEnv.service +
                            globalEnv.servicePath +
                            globalEnv.deviceId +
                            globalEnv.entity_type
                    },
                    attr_d: {
                        type: 'Float',
                        value: 16.25
                    },
                    attr_e: {
                        type: 'Array',
                        value: [1, 2, 3, 4]
                    },
                    attr_f: {
                        type: 'Object',
                        value: { coordinates: [1, 2], type: 'Point' }
                    }
                }
            }
        ]
    },
    // TIMESTAMP TESTS
    {
        describeName: '0150 - Simple group with active attribute + timestamp:false',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        timestamp: false,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'a',
                                name: 'attr_a',
                                type: 'Number'
                            }
                        ]
                    }
                ]
            },
            headers: {
                'fiware-service': globalEnv.service,
                'fiware-servicepath': globalEnv.servicePath
            }
        },
        should: [
            {
                shouldName:
                    'A - WHEN sending a measure not named TimeInstant through http IT should not add the timestamp to the attributes sent to Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 23
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 23,
                        type: 'Number'
                    }
                }
            },
            {
                shouldName:
                    'B - WHEN sending a measure named TimeInstant through http IT should not add the timestamp to the other attributes sent to Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        TimeInstant: '2015-12-14T08:06:01.468Z',
                        a: 23
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 23,
                        type: 'Number'
                    },
                    TimeInstant: {
                        value: '2015-12-14T08:06:01.468Z',
                        type: 'DateTime'
                    }
                }
            }
        ]
    },
    {
        describeName: '0160 - Simple group with active attribute + timestamp:true',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        timestamp: true,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'a',
                                name: 'attr_a',
                                type: 'Number'
                            }
                        ]
                    }
                ]
            },
            headers: {
                'fiware-service': globalEnv.service,
                'fiware-servicepath': globalEnv.servicePath
            }
        },
        should: [
            {
                shouldName:
                    'A - WHEN sending a measure not named TimeInstant through http IT should add the timestamp to the attributes sent to Context Broker',
                type: 'single',
                isRegex: true,
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 21
                    }
                },
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
            },
            {
                shouldName:
                    'B - WHEN sending a measure named TimeInstant through http IT should not add the timestamp to the other attributes sent to Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        TimeInstant: '2015-12-14T08:06:01.468Z',
                        a: 23
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 23,
                        type: 'Number',
                        metadata: {
                            TimeInstant: {
                                type: 'DateTime',
                                value: '2015-12-14T08:06:01.468Z'
                            }
                        }
                    },
                    TimeInstant: {
                        value: '2015-12-14T08:06:01.468Z',
                        type: 'DateTime'
                    }
                }
            }
        ]
    },
    {
        describeName:
            '00X0 - Simple group with JEXL expression using static attribute - addressing structured values (JSON)',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'a',
                                name: 'attr_a',
                                type: 'Boolean',
                                expression: 'a?threshold[90|tostring].max:true'
                            }
                        ],
                        static_attributes: [
                            {
                                name: 'threshold',
                                type: 'Object',
                                value: {
                                    '90': { max: 10, min: 1 },
                                    '92': { max: 12, min: 2 },
                                    '93': { max: 13, min: 3 }
                                }
                            }
                        ],
                        explicitAttrs: "['attr_a']"
                    }
                ]
            },
            headers: {
                'fiware-service': globalEnv.service,
                'fiware-servicepath': globalEnv.servicePath
            }
        },
        should: [
            {
                shouldName:
                    'A - WHEN sending a numeric value () through http IT should send to Context Broker the value true ',
                type: 'single',
                isRegex: true,
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: false
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: true,
                        type: 'Boolean'
                    }
                }
            }
        ]
    }
];

exports.testCases = testCases;
