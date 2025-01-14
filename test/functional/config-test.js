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

/* eslint-disable no-unused-vars */

const config = {};

config.mqtt = {
    host: 'localhost',
    port: 1883
};

config.http = {
    port: 7896,
    host: 'localhost'
};

config.amqp = {
    port: 5672,
    exchange: 'amq.topic',
    queue: 'iota_queue',
    options: { durable: true }
};

config.iota = {
    logLevel: 'DEBUG',
    contextBroker: {
        host: '192.168.1.1',
        port: '1026',
        ngsiVersion: 'v2'
    },
    server: {
        port: 4041,
        host: 'localhost'
    },
    deviceRegistry: {
        type: 'memory'
    },
    service: 'smartgondor',
    subservice: '/gardens',
    providerUrl: 'http://localhost:4041',
    types: {},
    useCBflowControl: true
};

config.defaultKey = '1234';
config.defaultTransport = 'MQTT';

module.exports = config;
