/*
 * Copyright 2023 Telefonica Investigación y Desarrollo, S.A.U
 *
 * This file is part of iotagent-json
 *
 * iotagent-json is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * iotagent-json is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with iotagent-json.
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 *
 * Modified by: Miguel Angel Pedraza
 */

/* eslint-disable no-unused-vars*/
/* eslint-disable no-unused-expressions*/

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
    // 0000 - BASIC TESTS
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
                        type: 'Text'
                    },
                    b: {
                        value: 10,
                        type: 'Text'
                    },
                    c: {
                        type: 'Text',
                        value: 'text'
                    },
                    d: {
                        type: 'Text',
                        value: 10.5
                    },
                    e: {
                        type: 'Text',
                        value: [1, 2]
                    },
                    f: {
                        type: 'Text',
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
                        type: 'Text'
                    },
                    b: {
                        value: 10,
                        type: 'Text'
                    },
                    c: {
                        type: 'Text',
                        value: 'text'
                    },
                    d: {
                        type: 'Text',
                        value: 10.5
                    },
                    e: {
                        type: 'Text',
                        value: [1, 2]
                    },
                    f: {
                        type: 'Text',
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
                        type: 'Text'
                    },
                    v: {
                        value: 10,
                        type: 'Text'
                    },
                    w: {
                        type: 'Text',
                        value: 'text'
                    },
                    y: {
                        type: 'Text',
                        value: 10.5
                    },
                    x: {
                        type: 'Text',
                        value: [1, 2]
                    },
                    z: {
                        type: 'Text',
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
                        type: 'Text'
                    },
                    v: {
                        value: 10,
                        type: 'Text'
                    },
                    w: {
                        type: 'Text',
                        value: 'text'
                    },
                    y: {
                        type: 'Text',
                        value: 10.5
                    },
                    x: {
                        type: 'Text',
                        value: [1, 2]
                    },
                    z: {
                        type: 'Text',
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
        describeName: '0021 - Simple group with active attributes with metadata',
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
                                metadata: {
                                    accuracy: {
                                        value: 0.8,
                                        type: 'Float'
                                    }
                                }
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
                    'A - WHEN sending defined object_ids (measures) through http IT should send measures to Context Broker preserving value types, name mappings and metadatas',
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
                        value: false,
                        type: 'Boolean',
                        metadata: {
                            accuracy: {
                                value: 0.8,
                                type: 'Float'
                            }
                        }
                    }
                }
            }
        ]
    },
    {
        describeName: '0021b - Simple group with active attributes with special names in object_id',
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
                                metadata: {
                                    accuracy: {
                                        value: 0.8,
                                        type: 'Float'
                                    }
                                }
                            },
                            {
                                object_id: '.1.0.0.1',
                                name: 'psBatteryVoltage',
                                type: 'Number'
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
                    'A - WHEN sending defined object_ids with special format names (measures) through http IT should send measures to Context Broker preserving value types, name mappings and metadatas',
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
                        '.1.0.0.1': 23.5
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: false,
                        type: 'Boolean',
                        metadata: {
                            accuracy: {
                                value: 0.8,
                                type: 'Float'
                            }
                        }
                    },
                    psBatteryVoltage: {
                        type: 'Number',
                        value: 23.5
                    }
                }
            }
        ]
    },
    {
        describeName: '0022 - Simple group with active attributes and multimeasures',
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
                                type: 'Number'
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
                type: 'multimeasure',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: [
                        {
                            a: 0
                        },
                        {
                            a: 1
                        },
                        {
                            a: 2
                        },
                        {
                            a: 3
                        },
                        {
                            a: 4
                        },
                        {
                            a: 5
                        },
                        {
                            a: 6
                        }
                    ]
                },
                expectation: {
                    actionType: 'append',
                    entities: [
                        {
                            attr_a: {
                                type: 'Number',
                                value: 0
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        },
                        {
                            attr_a: {
                                type: 'Number',
                                value: 1
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        },
                        {
                            attr_a: {
                                type: 'Number',
                                value: 2
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        },
                        {
                            attr_a: {
                                type: 'Number',
                                value: 3
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        },
                        {
                            attr_a: {
                                type: 'Number',
                                value: 4
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        },
                        {
                            attr_a: {
                                type: 'Number',
                                value: 5
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        },
                        {
                            attr_a: {
                                type: 'Number',
                                value: 6
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        }
                    ]
                }
            },
            {
                shouldName:
                    'A - WHEN sending defined object_ids (measures) through http IT should send measures with TimeInstant to Context Broker preserving value types and name mappings and order',
                type: 'multimeasure',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: [
                        {
                            a: 0,
                            TimeInstant: '2024-04-10T10:00:00Z'
                        },
                        {
                            a: 1,
                            TimeInstant: '2024-04-10T10:05:00Z'
                        },
                        {
                            a: 2,
                            TimeInstant: '2024-04-10T10:10:00Z'
                        },
                        {
                            a: 3,
                            TimeInstant: '2024-04-10T10:15:00Z'
                        },
                        {
                            a: 4,
                            TimeInstant: '2024-04-10T10:20:00Z'
                        },
                        {
                            a: 5,
                            TimeInstant: '2024-04-10T10:25:00Z'
                        },
                        {
                            a: 6,
                            TimeInstant: '2024-04-10T10:30:00Z'
                        }
                    ]
                },
                expectation: {
                    actionType: 'append',
                    entities: [
                        {
                            attr_a: {
                                type: 'Number',
                                value: 0
                            },
                            TimeInstant: {
                                type: 'DateTime',
                                value: '2024-04-10T10:00:00Z'
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        },
                        {
                            attr_a: {
                                type: 'Number',
                                value: 1
                            },
                            TimeInstant: {
                                type: 'DateTime',
                                value: '2024-04-10T10:05:00Z'
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        },
                        {
                            attr_a: {
                                type: 'Number',
                                value: 2
                            },
                            TimeInstant: {
                                type: 'DateTime',
                                value: '2024-04-10T10:10:00Z'
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        },
                        {
                            attr_a: {
                                type: 'Number',
                                value: 3
                            },
                            TimeInstant: {
                                type: 'DateTime',
                                value: '2024-04-10T10:15:00Z'
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        },
                        {
                            attr_a: {
                                type: 'Number',
                                value: 4
                            },
                            TimeInstant: {
                                type: 'DateTime',
                                value: '2024-04-10T10:20:00Z'
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        },
                        {
                            attr_a: {
                                type: 'Number',
                                value: 5
                            },
                            TimeInstant: {
                                type: 'DateTime',
                                value: '2024-04-10T10:25:00Z'
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        },
                        {
                            attr_a: {
                                type: 'Number',
                                value: 6
                            },
                            TimeInstant: {
                                type: 'DateTime',
                                value: '2024-04-10T10:30:00Z'
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        }
                    ]
                }
            },
            {
                shouldName:
                    'A - WHEN sending defined object_ids (measures) through http IT should send measures with TimeInstant to Context Broker preserving value types and name mappings and sorted by TimeInstant',
                type: 'multimeasure',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: [
                        {
                            a: 0,
                            TimeInstant: '2024-04-10T10:15:00Z'
                        },
                        {
                            a: 1,
                            TimeInstant: '2024-04-10T10:05:00Z'
                        },
                        {
                            a: 2,
                            TimeInstant: '2024-04-10T10:20:00Z'
                        },
                        {
                            a: 3,
                            TimeInstant: '2024-04-10T10:00:00Z'
                        },
                        {
                            a: 4,
                            TimeInstant: '2024-04-10T10:10:00Z'
                        },
                        {
                            a: 5,
                            TimeInstant: '2024-04-10T10:30:00Z'
                        },
                        {
                            a: 6,
                            TimeInstant: '2024-04-10T10:25:00Z'
                        }
                    ]
                },
                expectation: {
                    actionType: 'append',
                    entities: [
                        {
                            attr_a: {
                                type: 'Number',
                                value: 3
                            },
                            TimeInstant: {
                                type: 'DateTime',
                                value: '2024-04-10T10:00:00Z'
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        },
                        {
                            attr_a: {
                                type: 'Number',
                                value: 1
                            },
                            TimeInstant: {
                                type: 'DateTime',
                                value: '2024-04-10T10:05:00Z'
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        },
                        {
                            attr_a: {
                                type: 'Number',
                                value: 4
                            },
                            TimeInstant: {
                                type: 'DateTime',
                                value: '2024-04-10T10:10:00Z'
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        },
                        {
                            attr_a: {
                                type: 'Number',
                                value: 0
                            },
                            TimeInstant: {
                                type: 'DateTime',
                                value: '2024-04-10T10:15:00Z'
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        },
                        {
                            attr_a: {
                                type: 'Number',
                                value: 2
                            },
                            TimeInstant: {
                                type: 'DateTime',
                                value: '2024-04-10T10:20:00Z'
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        },
                        {
                            attr_a: {
                                type: 'Number',
                                value: 6
                            },
                            TimeInstant: {
                                type: 'DateTime',
                                value: '2024-04-10T10:25:00Z'
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        },
                        {
                            attr_a: {
                                type: 'Number',
                                value: 5
                            },
                            TimeInstant: {
                                type: 'DateTime',
                                value: '2024-04-10T10:30:00Z'
                            },
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type
                        }
                    ]
                }
            }
        ]
    },
    // 0100 - JEXL TESTS
    {
        describeName: '0100 - Simple group with active attribute + JEXL expression boolean (!)',
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
                        type: 'Text'
                    }
                }
            }
        ]
    },
    {
        describeName: '0110 - Simple group with active attribute + JEXL expression numeric (+3)',
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
                        type: 'Text'
                    }
                }
            }
        ]
    },
    {
        describeName: '0120 - Simple group with active attribute + JEXL expression numeric (*3)',
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
                        type: 'Text'
                    }
                }
            }
        ]
    },
    {
        describeName: '0130 - Simple group with active attribute + JEXL expression text (a|substr(0,2))',
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
                        type: 'Text'
                    }
                }
            }
        ]
    },
    {
        describeName:
            '0140 - Simple group with active attribute + chained JEXL expression text (a | trim | replacestr("hello","hi"))',
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
        describeName: '0150 - Simple group with active attribute + JEXL expression text reusing previous values)',
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
        describeName: '0160 - Simple group with active attribute + JEXL expression referencing static attributes',
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
        describeName: '0170 - Simple group with active attribute + JEXL expression referencing context attributes',
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
        describeName:
            '0175 - Simple group with active attribute + JEXL expression referencing metadata context attributes',
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
                        static_attributes: [
                            {
                                name: 'st_attr1',
                                type: 'Number',
                                value: 1.5,
                                metadata: {
                                    coef1: {
                                        value: 0.8,
                                        type: 'Float'
                                    }
                                }
                            },
                            {
                                name: 'st_attr',
                                type: 'Number',
                                value: 1.5,
                                metadata: {
                                    coef: {
                                        value: 0.8,
                                        type: 'Float'
                                    }
                                }
                            },
                            {
                                name: 'st_attr2',
                                type: 'Number',
                                value: 1.5,
                                metadata: {
                                    coef2: {
                                        value: 0.8,
                                        type: 'Float'
                                    }
                                }
                            }
                        ],
                        attributes: [
                            {
                                object_id: 'a',
                                name: 'attr_a',
                                type: 'Number',
                                expression: 'a*st_attr*metadata.st_attr.coef'
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
                    'A - WHEN sending a value (number) through http IT should apply the expression using the context attributes value and send to Context Broker the value "39.60" ',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 33
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 39.6,
                        type: 'Number'
                    }
                }
            }
        ]
    },
    {
        describeName: '0180 - Simple group with active attributes + JEXL multiples expressions at same time',
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
    {
        describeName:
            '0190 - Simple group with JEXL expression using static attribute - addressing structured values (JSON)',
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
    },
    {
        describeName: '0191 - Simple group with JEXL expression in metadata',
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
                                expression: 'a?threshold[90|tostring].max:true',
                                metadata: {
                                    unit: {
                                        type: 'Text',
                                        expression: '"hola" + "adios"'
                                    }
                                }
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
                    'A - WHEN sending a measure  through http IT should send to Context Broker expanded metadata value  ',
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
                        type: 'Boolean',
                        metadata: {
                            unit: {
                                type: 'Text',
                                value: 'holaadios'
                            }
                        }
                    }
                }
            }
        ]
    },
    // 0200 - COMMANDS TESTS
    {
        describeName: '0200 - Simple group with commands',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        commands: [
                            {
                                name: 'cmd1',
                                type: 'command'
                            }
                        ],
                        endpoint: 'http://myendpoint.com',
                        transport: 'http',
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
                shouldName:
                    'A - WHEN sending not provisioned object_ids (measures) through http IT should store commands into Context Broker',
                type: 'single',
                skip: '!lib', // there is not CB registration mock
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        b: 10
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    b: {
                        value: 10,
                        type: 'Text'
                    }
                }
            }
        ]
    },
    // 0300 - STATIC ATTRIBUTES TESTS
    {
        describeName:
            '0300 - Simple group with active attributes + Static attributes + JEXL expression using static attribute value',
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
                                expression: 'a*static_a'
                            }
                        ],
                        static_attributes: [
                            {
                                name: 'static_a',
                                type: 'Number',
                                value: 3
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
                    'A - WHEN sending not provisioned object_ids (measures) through http IT should store static attributes into Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        b: 10
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    b: {
                        value: 10,
                        type: 'Text'
                    },
                    static_a: {
                        value: 3,
                        type: 'Number'
                    }
                }
            },
            {
                shouldName:
                    'B - WHEN sending provisioned object_ids (measures) through http IT should store static attributes into Context Broker + calculate expression based on static',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 10
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 30,
                        type: 'Number'
                    },
                    static_a: {
                        value: 3,
                        type: 'Number'
                    }
                }
            }
        ]
    },
    {
        describeName: '0310 - Simple group with active attributes + JSON value Static attributes ',
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
                        static_attributes: [
                            {
                                name: 'static_a',
                                type: 'Number',
                                value: {
                                    v1: 1,
                                    v2: {
                                        v3: 3,
                                        v4: 4
                                    }
                                }
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
                    'A - WHEN sending measures through http IT should store complex static attributes into Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 10
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    a: {
                        value: 10,
                        type: 'Text'
                    },
                    static_a: {
                        value: {
                            v1: 1,
                            v2: {
                                v3: 3,
                                v4: 4
                            }
                        },
                        type: 'Number'
                    }
                }
            }
        ]
    },
    {
        describeName: '0320 - Simple group with active attributes + metadata in Static attributes ',
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
                        static_attributes: [
                            {
                                name: 'static_a',
                                type: 'Number',
                                value: 4,
                                metadata: {
                                    accuracy: {
                                        value: 0.8,
                                        type: 'Float'
                                    }
                                }
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
                    'A - WHEN sending measures through http IT should store metatada static attributes into Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 10
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    a: {
                        value: 10,
                        type: 'Text'
                    },
                    static_a: {
                        value: 4,
                        type: 'Number',
                        metadata: {
                            accuracy: {
                                value: 0.8,
                                type: 'Float'
                            }
                        }
                    }
                }
            }
        ]
    },
    // 0400 - TIMESTAMP TESTS
    {
        describeName: '0400 - Simple group with active attribute + timestamp:false',
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
        describeName: '0410 - Simple group with active attribute + timestamp:true',
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
        describeName: '0420 - Simple group with active attribute + timestamp not defined',
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
                    'A - WHEN sending a measure not named TimeInstant through http IT should not add the timestamp to the attributes or metadata sent to Context Broker',
                type: 'single',
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
        describeName: '0430 - Simple group with active attribute + timestamp mapping defined',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        timestamp: true,
                        entity_type: globalEnv.entity_type,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'mydatetime',
                                name: 'TimeInstant',
                                type: 'DateTime'
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
                    'A - WHEN sending a measure through http IT should map the measure to timestamp attribute and use it for timestmap and other metadata attributes sent to Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        mydatetime: '2022-02-02T02:22:22.222Z',
                        a: 23
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    a: {
                        value: 23,
                        type: 'Text',
                        metadata: {
                            TimeInstant: {
                                value: '2022-02-02T02:22:22.222Z',
                                type: 'DateTime'
                            }
                        }
                    },
                    TimeInstant: {
                        value: '2022-02-02T02:22:22.222Z',
                        type: 'DateTime'
                    }
                }
            },
            {
                shouldName:
                    'A - WHEN sending a measure without timestamp through http IT should use system timestamp for mapped attribute and use it for timestmap and other metadata attributes sent to Context Broker',
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
                        a: 23
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    a: {
                        value: 23,
                        type: 'Text',
                        metadata: {
                            TimeInstant: {
                                value: _.isDateString,
                                type: 'DateTime'
                            }
                        }
                    },
                    TimeInstant: {
                        value: _.isDateString,
                        type: 'DateTime'
                    }
                }
            },
            {
                shouldName:
                    'A - WHEN sending a measure with timestamp through http IT should map the measure to timestamp attribute and use it for timestmap and other metadata attributes sent to Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        mydatetime: '2022-02-02T02:22:22.222Z',
                        TimeInstant: '2033-03-03T03:33:33.333Z',
                        a: 23
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    a: {
                        value: 23,
                        type: 'Text',
                        metadata: {
                            TimeInstant: {
                                value: '2022-02-02T02:22:22.222Z',
                                type: 'DateTime'
                            }
                        }
                    },
                    TimeInstant: {
                        value: '2022-02-02T02:22:22.222Z',
                        type: 'DateTime'
                    }
                }
            }
        ]
    },
    {
        describeName: '0431 - Simple group with active attribute + timestamp mapping defined + explicitAttrs',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        timestamp: true,
                        explicitAttrs: true,
                        entity_type: globalEnv.entity_type,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'mydatetime',
                                name: 'TimeInstant',
                                type: 'DateTime'
                            },
                            {
                                object_id: 'a',
                                name: 'a',
                                type: 'Text'
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
                    'A - WHEN sending a measure through http IT should map the measure to timestamp attribute and use it for timestmap and other metadata attributes sent to Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        mydatetime: '2022-02-02T02:22:22.222Z',
                        a: 23
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    a: {
                        value: 23,
                        type: 'Text',
                        metadata: {
                            TimeInstant: {
                                value: '2022-02-02T02:22:22.222Z',
                                type: 'DateTime'
                            }
                        }
                    },
                    TimeInstant: {
                        value: '2022-02-02T02:22:22.222Z',
                        type: 'DateTime'
                    }
                }
            },
            {
                shouldName:
                    'A - WHEN sending a measure without timestamp through http IT should use system timestamp for mapped attribute and use it for timestmap and other metadata attributes sent to Context Broker',
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
                        a: 23
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    a: {
                        value: 23,
                        type: 'Text',
                        metadata: {
                            TimeInstant: {
                                value: _.isDateString,
                                type: 'DateTime'
                            }
                        }
                    },
                    TimeInstant: {
                        value: _.isDateString,
                        type: 'DateTime'
                    }
                }
            },
            {
                shouldName:
                    'A - WHEN sending a measure with timestamp through http IT should map the measure to timestamp attribute and use it for timestmap and other metadata attributes sent to Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        mydatetime: '2022-02-02T02:22:22.222Z',
                        TimeInstant: '2033-03-03T03:33:33.333Z',
                        a: 23
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    a: {
                        value: 23,
                        type: 'Text',
                        metadata: {
                            TimeInstant: {
                                value: '2022-02-02T02:22:22.222Z',
                                type: 'DateTime'
                            }
                        }
                    },
                    TimeInstant: {
                        value: '2022-02-02T02:22:22.222Z',
                        type: 'DateTime'
                    }
                }
            }
        ]
    },
    {
        describeName: '0432 - Simple group with active attribute + bad timestamp mapping defined',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        timestamp: true,
                        entity_type: globalEnv.entity_type,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'mydatetime',
                                name: 'TimeInstant',
                                type: 'DateTime',
                                expression: '"2033-03-03T" + "03:33:33.333Z"'
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
                    'A - WHEN sending a measure through http IT should map the measure to fixed timestamp attribute and use it for timestmap sent to Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        mydatetime: '2022-02-02T02:22:22.222Z',
                        a: 23
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    a: {
                        value: 23,
                        type: 'Text',
                        metadata: {
                            TimeInstant: {
                                value: '2033-03-03T03:33:33.333Z',
                                type: 'DateTime'
                            }
                        }
                    },
                    TimeInstant: {
                        value: '2033-03-03T03:33:33.333Z',
                        type: 'DateTime'
                    }
                }
            }
        ]
    },
    {
        describeName: '0433 - Simple group with active attribute + several timestamp mappings defined in multientity',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        timestamp: true,
                        entity_type: globalEnv.entity_type,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'a',
                                name: 'a',
                                type: 'Text'
                            },
                            {
                                object_id: 'mydatetime1',
                                name: 'TimeInstant',
                                type: 'DateTime',
                                entity_name: 'TestType:TestDevice1',
                                entity_type: 'TestType'
                            },
                            {
                                object_id: 'mydatetime2',
                                name: 'TimeInstant',
                                type: 'DateTime',
                                entity_name: 'TestType:TestDevice2',
                                entity_type: 'TestType'
                            },
                            {
                                object_id: 'a1',
                                name: 'a1',
                                type: 'Text',
                                expression: 'a',
                                entity_name: 'TestType:TestDevice1',
                                entity_type: 'TestType'
                            },
                            {
                                object_id: 'a2',
                                name: 'a2',
                                type: 'Text',
                                expression: 'a',
                                entity_name: 'TestType:TestDevice2',
                                entity_type: 'TestType'
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
                    'A - WHEN sending a measure through http IT should map the measure to timestamp attributes and use it for timestmap and other metadata attributes sent to Context Broker',
                type: 'multientity',
                isRegex: true,
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 23,
                        mydatetime1: '2011-01-01T01:11:11.111Z',
                        mydatetime2: '2022-02-02T02:22:22.222Z'
                    }
                },
                expectation: {
                    actionType: 'append',
                    entities: [
                        {
                            id: 'TestType:TestDevice1',
                            type: globalEnv.entity_type,
                            a1: {
                                value: 23,
                                type: 'Text',
                                metadata: {
                                    TimeInstant: {
                                        value: '2011-01-01T01:11:11.111Z',
                                        type: 'DateTime'
                                    }
                                }
                            },
                            TimeInstant: {
                                value: '2011-01-01T01:11:11.111Z',
                                type: 'DateTime'
                            }
                        },
                        {
                            id: 'TestType:TestDevice2',
                            type: globalEnv.entity_type,
                            a2: {
                                value: 23,
                                type: 'Text',
                                metadata: {
                                    TimeInstant: {
                                        value: '2022-02-02T02:22:22.222Z',
                                        type: 'DateTime'
                                    }
                                }
                            },
                            TimeInstant: {
                                value: '2022-02-02T02:22:22.222Z',
                                type: 'DateTime'
                            }
                        },
                        {
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type,
                            a: {
                                value: 23,
                                type: 'Text',
                                metadata: {
                                    TimeInstant: {
                                        value: _.isDateString,
                                        type: 'DateTime'
                                    }
                                }
                            },
                            TimeInstant: {
                                value: _.isDateString,
                                type: 'DateTime'
                            }
                        }
                    ]
                }
            },
            {
                shouldName:
                    'A - WHEN sending a measure through http IT should map the measure to timestamp attributes for just mapped entity and sent to Context Broker',
                type: 'multientity',
                isRegex: true,
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        mydatetime1: '2011-01-01T01:11:11.111Z'
                    }
                },
                expectation: {
                    actionType: 'append',
                    entities: [
                        {
                            id: 'TestType:TestDevice1',
                            type: globalEnv.entity_type,
                            TimeInstant: {
                                value: '2011-01-01T01:11:11.111Z',
                                type: 'DateTime'
                            }
                        }
                    ]
                }
            }
        ]
    },

    // 0500 - EXPLICIT ATTRIBUTES TESTS
    {
        describeName: '0500 - Group with explicit attrs:false (boolean) + active atributes',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        explicitAttrs: false,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'a',
                                name: 'attr_a',
                                type: 'Number'
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
                    'A - WHEN sending both provisioned and not object_ids (measures) through http IT should store all attributes into Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 3,
                        b: 10
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    b: {
                        value: 10,
                        type: 'Text'
                    },
                    attr_a: {
                        value: 3,
                        type: 'Number'
                    }
                }
            }
        ]
    },
    {
        describeName: '0510 - Group without explicit (not defined) + active atributes',
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
                                type: 'Number'
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
                    'A - WHEN sending both provisioned and not object_ids (measures) through http IT should store all attributes into Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 3,
                        b: 10
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    b: {
                        value: 10,
                        type: 'Text'
                    },
                    attr_a: {
                        value: 3,
                        type: 'Number'
                    }
                }
            }
        ]
    },
    {
        describeName: '0520 - Group with explicit attrs:true (boolean) + active atributes',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        explicitAttrs: true,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'a',
                                name: 'attr_a',
                                type: 'Number'
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
                    'A - WHEN sending both provisioned and not object_ids (measures) through http IT should store all attributes into Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 3,
                        b: 10
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
            }
        ]
    },
    {
        describeName: '0530 - Group with explicit attrs:[array] + active attributes + static attributes',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        explicitAttrs: "['attr_a','static_a']",
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                name: 'attr_a',
                                object_id: 'a',
                                type: 'Number'
                            },
                            {
                                name: 'attr_b',
                                object_id: 'b',
                                type: 'Number'
                            }
                        ],
                        static_attributes: [
                            {
                                name: 'static_a',
                                type: 'Number',
                                value: 3
                            },
                            {
                                name: 'static_b',
                                type: 'Number',
                                value: 4
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
                    'A - WHEN sending both provisioned and not object_ids (measures) through http IT should store only defined in explicitAttrs array into Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 3,
                        b: 10,
                        c: 11
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 3,
                        type: 'Number'
                    },
                    static_a: {
                        value: 3,
                        type: 'Number'
                    }
                }
            }
        ]
    },
    {
        describeName: '0531 - Group with explicit attrs:[ ] (empty array) + active attributes + static attributes',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        explicitAttrs: '[ ]',
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                name: 'attr_a',
                                object_id: 'a',
                                type: 'Number'
                            },
                            {
                                name: 'attr_b',
                                object_id: 'b',
                                type: 'Number'
                            }
                        ],
                        static_attributes: [
                            {
                                name: 'static_a',
                                type: 'Number',
                                value: 3
                            },
                            {
                                name: 'static_b',
                                type: 'Number',
                                value: 4
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
                    'A - WHEN sending both provisioned and not object_ids (measures) through http IT should NOT store anything into the Context Broker (No request to CB)',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 3,
                        b: 10,
                        c: 11
                    }
                },
                expectation: [] // No payload expected
            }
        ]
    },
    {
        describeName:
            '0532 - Group with explicit attrs:[ ] (empty array) + active attributes + static attributes + timestamp:true',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        explicitAttrs: '[ ]',
                        timestamp: true,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                name: 'attr_a',
                                object_id: 'a',
                                type: 'Number'
                            },
                            {
                                name: 'attr_b',
                                object_id: 'b',
                                type: 'Number'
                            }
                        ],
                        static_attributes: [
                            {
                                name: 'static_a',
                                type: 'Number',
                                value: 3
                            },
                            {
                                name: 'static_b',
                                type: 'Number',
                                value: 4
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
                    'A - WHEN sending both provisioned and not object_ids (measures) through http IT should NOT store anything into the Context Broker (No request to CB)',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 3,
                        b: 10,
                        c: 11
                    }
                },
                expectation: [] // No payload expected
            },
            {
                shouldName:
                    'B - WHEN sending data and a measure called TimeInstant through http IT should NOT store anything into the Context Broker (No request to CB)',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 3,
                        b: 10,
                        c: 11,
                        TimeInstant: '2015-12-14T08:06:01.468Z'
                    }
                },
                expectation: [] // No payload expected
            }
        ]
    },
    {
        describeName:
            '0533 - Group with explicit attrs:[ ] (empty array) + active attributes + TimeInstant attribute + static attributes + timestamp:true',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        explicitAttrs: '[ ]',
                        timestamp: true,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                name: 'attr_a',
                                object_id: 'a',
                                type: 'Number'
                            },
                            {
                                name: 'attr_b',
                                object_id: 'b',
                                type: 'Number'
                            },
                            {
                                name: 'DateIssued',
                                object_id: 'TimeInstant',
                                type: 'DateTime'
                            },
                            {
                                name: 'TimeInstant',
                                object_id: 't',
                                type: 'DateTime'
                            }
                        ],
                        static_attributes: [
                            {
                                name: 'static_a',
                                type: 'Number',
                                value: 3
                            },
                            {
                                name: 'static_b',
                                type: 'Number',
                                value: 4
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
                    'A - WHEN sending data and a measure called "t" (defined as TimeInstant attribte) through http IT should NOT store anything into the Context Broker (No request to CB)',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 3,
                        b: 10,
                        c: 11,
                        t: '2015-12-14T08:06:01.468Z'
                    }
                },
                expectation: []
            },
            {
                shouldName:
                    'B - WHEN sending data and a measure called TimeInstant through http IT should NOT store anything into the Context Broker (No request to CB)',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 3,
                        b: 10,
                        c: 11,
                        TimeInstant: '2015-12-14T08:06:01.468Z'
                    }
                },
                expectation: [] // No payload expected
            }
        ]
    },
    {
        describeName:
            '0534 - Group with explicit attrs:[ ] (empty array) + active attributes + TimeInstant attribute + static attributes + timestamp:false',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        explicitAttrs: '[ ]',
                        timestamp: false,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                name: 'attr_a',
                                object_id: 'a',
                                type: 'Number'
                            },
                            {
                                name: 'attr_b',
                                object_id: 'b',
                                type: 'Number'
                            },
                            {
                                name: 'DateIssued',
                                object_id: 'TimeInstant',
                                type: 'DateTime'
                            },
                            {
                                name: 'TimeInstant',
                                object_id: 't',
                                type: 'DateTime'
                            }
                        ],
                        static_attributes: [
                            {
                                name: 'static_a',
                                type: 'Number',
                                value: 3
                            },
                            {
                                name: 'static_b',
                                type: 'Number',
                                value: 4
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
                    'A - WHEN sending data and a measure called "t" (defined as TimeInstant attribte) through http IT should NOT store anything into the Context Broker (No request to CB)',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 3,
                        b: 10,
                        c: 11,
                        t: '2015-12-14T08:06:01.468Z'
                    }
                },
                expectation: []
            },
            {
                shouldName:
                    'B - WHEN sending data and a measure called TimeInstant through http IT should NOT store anything into the Context Broker (No request to CB)',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 3,
                        b: 10,
                        c: 11,
                        TimeInstant: '2015-12-14T08:06:01.468Z'
                    }
                },
                expectation: [] // No payload expected
            }
        ]
    },
    {
        describeName:
            '0540 - Group with explicit attrs: JEXL expression based on measure resulting boolean + active attributes + static attributes',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        explicitAttrs: 'c?true:false',
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                name: 'attr_a',
                                object_id: 'a',
                                type: 'Number'
                            },
                            {
                                name: 'attr_b',
                                object_id: 'b',
                                type: 'Number'
                            }
                        ],
                        static_attributes: [
                            {
                                name: 'static_a',
                                type: 'Number',
                                value: 3
                            },
                            {
                                name: 'static_b',
                                type: 'Number',
                                value: 4
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
                    'A - WHEN sending both provisioned and not object_ids (measures) through http and being the explicitAttrs JEXL result true IT should store only explicit attrs into Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 3,
                        b: 10,
                        c: 11,
                        d: 12
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 3,
                        type: 'Number'
                    },
                    attr_b: {
                        value: 10,
                        type: 'Number'
                    },
                    static_a: {
                        value: 3,
                        type: 'Number'
                    },
                    static_b: {
                        value: 4,
                        type: 'Number'
                    }
                }
            },
            {
                shouldName:
                    'A - WHEN sending both provisioned and not object_ids (measures) through http and being the explicitAttrs JEXL result false IT should store all attrs into Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 3,
                        b: 10,
                        d: 12
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 3,
                        type: 'Number'
                    },
                    attr_b: {
                        value: 10,
                        type: 'Number'
                    },
                    d: {
                        value: 12,
                        type: 'Text'
                    },
                    static_a: {
                        value: 3,
                        type: 'Number'
                    },
                    static_b: {
                        value: 4,
                        type: 'Number'
                    }
                }
            }
        ]
    },
    {
        describeName:
            '0550 - Group with explicit attrs: JEXL expression based on measure resulting an array + active attributes + static attributes',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        explicitAttrs:
                            "(a&&b)?['attr_a','attr_b']:a?['attr_a','static_b']:b?[{object_id:'b'},'c']:['static_a','static_b','d','c']",
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                name: 'attr_a',
                                object_id: 'a',
                                type: 'Number'
                            },
                            {
                                name: 'attr_b',
                                object_id: 'b',
                                type: 'Number'
                            },
                            {
                                object_id: 'c',
                                type: 'Number'
                            }
                        ],
                        static_attributes: [
                            {
                                name: 'static_a',
                                type: 'Number',
                                value: 3
                            },
                            {
                                name: 'static_b',
                                type: 'Number',
                                value: 4
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
                shouldName: 'A - WHEN sending (a&&b) IT should store only [attr_a,attr_b] attrs into Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 1,
                        b: 2,
                        c: 3,
                        d: 4
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 1,
                        type: 'Number'
                    },
                    attr_b: {
                        value: 2,
                        type: 'Number'
                    }
                }
            },
            {
                shouldName: 'B - WHEN sending only a IT should store only [attr_a,static_b] attrs into Context Broker',
                type: 'single',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 1,
                        c: 3,
                        d: 4
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 1,
                        type: 'Number'
                    },
                    static_b: {
                        value: 4,
                        type: 'Number'
                    }
                }
            },
            {
                shouldName: 'C - WHEN sending only b IT should store only [{object_id:b}] attrs into Context Broker',
                type: 'single',
                skip: '!lib', // FIXME: https://github.com/telefonicaid/iotagent-json/issues/782
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        b: 2,
                        c: 3,
                        d: 4
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_b: {
                        value: 2,
                        type: 'Number'
                    }
                }
            },
            {
                shouldName:
                    'D - WHEN no sending any defined case IT should store [static_a,static_b] attrs into Context Broker',
                type: 'single',
                skip: '!lib', // FIXME: https://github.com/telefonicaid/iotagent-json/issues/782
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        c: 3,
                        d: 4
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    static_a: {
                        value: 3,
                        type: 'Number'
                    },
                    static_b: {
                        value: 4,
                        type: 'Number'
                    }
                }
            }
        ]
    },
    // 0600 - MULTIENTITY TESTS
    {
        describeName: '0600 - Group multientity attrs',
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
                                object_id: 's',
                                name: 'status',
                                type: 'Boolean'
                            },
                            {
                                object_id: 't',
                                name: 'temperature',
                                type: 'Number',
                                entity_name: 'TestType:TestDevice2',
                                entity_type: 'TestType'
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
                    'A - WHEN sending provisioned object_ids (measures) through http IT should store both entities into Context Broker',
                type: 'multientity',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        s: false,
                        t: 10
                    }
                },
                expectation: {
                    entities: [
                        {
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type,
                            status: {
                                value: false,
                                type: 'Boolean'
                            }
                        },
                        {
                            id: 'TestType:TestDevice2',
                            type: 'TestType',
                            temperature: {
                                value: 10,
                                type: 'Number'
                            }
                        }
                    ],
                    actionType: 'append'
                }
            }
        ]
    },
    {
        describeName: '0610 - Group multientity attrs + value JEXL expression',
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
                                object_id: 's',
                                name: 'status',
                                type: 'Boolean'
                            },
                            {
                                object_id: 't',
                                name: 'temperature',
                                type: 'Number',
                                entity_name: 'TestType:TestDevice2',
                                entity_type: 'TestType',
                                expression: 'type+":"+(t*2*static_a)'
                            }
                        ],
                        static_attributes: [
                            {
                                name: 'static_a',
                                type: 'Number',
                                value: 3
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
                    'A - WHEN sending provisioned object_ids (measures) through http IT should store both entities into Context Broker',
                type: 'multientity',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        s: false,
                        t: 10
                    }
                },
                expectation: {
                    entities: [
                        {
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type,
                            status: {
                                value: false,
                                type: 'Boolean'
                            },
                            static_a: {
                                value: 3,
                                type: 'Number'
                            }
                        },
                        {
                            id: 'TestType:TestDevice2',
                            type: 'TestType',
                            temperature: {
                                value: 'TestType:60',
                                type: 'Number'
                            }
                        }
                    ],
                    actionType: 'append'
                }
            }
        ]
    },
    {
        describeName: '0620 - Group multientity attrs + multientity ID JEXL expression',
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
                                object_id: 's',
                                name: 'status',
                                type: 'Boolean'
                            },
                            {
                                object_id: 't',
                                name: 'temperature',
                                type: 'Number',
                                entity_name: 'type+":"+(t*2*static_a)',
                                entity_type: 'TestType'
                            }
                        ],
                        static_attributes: [
                            {
                                name: 'static_a',
                                type: 'Number',
                                value: 3
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
                    'A - WHEN sending provisioned object_ids (measures) through http IT should store both entities into Context Broker',
                type: 'multientity',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        s: false,
                        t: 10
                    }
                },
                expectation: {
                    entities: [
                        {
                            id: globalEnv.entity_name,
                            type: globalEnv.entity_type,
                            status: {
                                value: false,
                                type: 'Boolean'
                            },
                            static_a: {
                                value: 3,
                                type: 'Number'
                            }
                        },
                        {
                            id: 'TestType:60',
                            type: 'TestType',
                            temperature: {
                                value: 10,
                                type: 'Number'
                            }
                        }
                    ],
                    actionType: 'append'
                }
            }
        ]
    },
    // 0700 - ENTITY NAME EXPRESSION TESTS
    {
        describeName: '0700 - Group JEXL entityNameExpression',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        entityNameExp: 'type+":"+(t*2*static_a)',
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
                        static_attributes: [
                            {
                                name: 'static_a',
                                type: 'Number',
                                value: 3
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
                    'A - WHEN sending provisioned object_ids (measures) through http IT should store the entity with the expression generated ID into the Context Broker',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        s: false,
                        t: 10
                    }
                },
                expectation: {
                    id: 'TestType:60',
                    type: globalEnv.entity_type,
                    status: {
                        value: false,
                        type: 'Boolean'
                    },
                    temperature: {
                        value: 10,
                        type: 'Number'
                    },
                    static_a: {
                        value: 3,
                        type: 'Number'
                    }
                }
            }
        ]
    },
    // 0700 - FULL GROUP TESTS
    // FIXME: APIKEY recognition is not working for lib, and it needs to be tested if works as it is in agents.
    // 0800 - SKIP VALUE
    {
        describeName: '0700 - skipValue test',
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
                                skipValue: null
                            },
                            {
                                object_id: 'b',
                                name: 'attr_b',
                                type: 'Number',
                                skipValue: 'skip',
                                expression: '(b+static_a)>0?(b+static_a):"skip"'
                            }
                        ],
                        static_attributes: [
                            {
                                name: 'static_a',
                                type: 'Number',
                                value: 3
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
                    'A - WHEN not matching skip conditions IT should store the entity with all the values (attr_a, attr_b, static_a) into the Context Broker',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 3,
                        b: 10
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 3,
                        type: 'Number'
                    },
                    attr_b: {
                        value: 13,
                        type: 'Number'
                    },
                    static_a: {
                        value: 3,
                        type: 'Number'
                    }
                }
            },
            {
                shouldName:
                    'B - WHEN matching skip conditions for attr_b IT should store the entity with some of the values (attr_a, static_a) into the Context Broker',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        a: 3,
                        b: -10
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    attr_a: {
                        value: 3,
                        type: 'Number'
                    },
                    static_a: {
                        value: 3,
                        type: 'Number'
                    }
                }
            },
            {
                shouldName:
                    'C - WHEN matching skip conditions for attr_a and attr_b (expression result) IT should store the entity with only some of the values (static_a) into the Context Broker',
                measure: {
                    url: 'http://localhost:' + config.http.port + '/iot/json',
                    method: 'POST',
                    qs: {
                        i: globalEnv.deviceId,
                        k: globalEnv.apikey
                    },
                    json: {
                        b: -10
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    static_a: {
                        value: 3,
                        type: 'Number'
                    }
                }
            }
        ]
    },
    // 0900 - JEXL FUNCTION TESTS
    {
        describeName: '0900 - JEXL function - valuePicker and valuePickerMulti',
        provision: {
            url: 'http://localhost:' + config.iota.server.port + '/iot/services',
            method: 'POST',
            json: {
                services: [
                    {
                        resource: '/iot/json',
                        apikey: globalEnv.apikey,
                        entity_type: globalEnv.entity_type,
                        explicitAttrs: true,
                        commands: [],
                        lazy: [],
                        attributes: [
                            {
                                object_id: 'single',
                                name: 'single',
                                type: 'Number',
                                expression: '{alarm1:alarm1,alarm2:alarm2,alarm3:alarm3}|valuePicker(true)'
                            },
                            {
                                object_id: 'multi',
                                name: 'multi',
                                type: 'Number',
                                expression: "a|valuePickerMulti([true,1,'on','nok'])"
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
                        a: { n1: true, n2: 1, n3: 'on', n4: 'nok', n5: 'ok', n6: true, n7: false, n8: 0 },
                        alarm1: true,
                        alarm2: false,
                        alarm3: true
                    }
                },
                expectation: {
                    id: globalEnv.entity_name,
                    type: globalEnv.entity_type,
                    single: {
                        value: ['alarm1', 'alarm3'],
                        type: 'Number'
                    },
                    multi: {
                        value: ['n1', 'n2', 'n3', 'n4', 'n6'],
                        type: 'Number'
                    }
                }
            }
        ]
    }
];

exports.testCases = testCases;
