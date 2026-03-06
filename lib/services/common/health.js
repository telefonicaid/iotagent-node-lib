/*
 * Copyright 2016 Telefonica InvestigaciÃ³n y Desarrollo, S.A.U
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
 * please contact with::daniel.moranjimenez@telefonica.com
 */

const request = require('../../request-shim');
const statsRegistry = require('../stats/statsRegistry');

let healthState = {
    contextBroker: {
        ok: null,
        configured: false,
        url: null,
        lastOk: null,
        lastError: null,
        latencyMs: null,
        consecutiveFails: 0
    },
    iotagentManager: {
        ok: null,
        configured: false,
        url: null,
        lastOk: null,
        lastError: null,
        latencyMs: null,
        consecutiveFails: 0
    },
    mongodb: {
        ok: null,
        configured: false,
        url: null,
        lastOk: null,
        lastError: null,
        latencyMs: null,
        consecutiveFails: 0
    },
    mqtt: {
        ok: null,
        configured: false,
        url: null,
        lastOk: null,
        lastError: null,
        latencyMs: null,
        consecutiveFails: 0
    }
};

let healthTimer = null;

function getHealthState() {
    return healthState;
}

function normalizeBaseUrl(baseUrl) {
    if (!baseUrl || typeof baseUrl !== 'string') {
        return null;
    }
    const trimmed = baseUrl.trim();
    if (!trimmed) {
        return null;
    }
    //  "orion:1026" is converted to  "http://orion:1026"
    if (!/^https?:\/\//i.test(trimmed)) {
        return `http://${trimmed}`;
    }
    return trimmed;
}

function buildUrl(base, path) {
    const safePath = typeof path === 'string' && path.trim() ? path.trim() : '';
    return new URL(safePath, base).toString();
}

function fillMongoUrlFromConnection(conn) {
    try {
        const client = conn.getClient(); // MongoClient native
        const desc = client.topology?.description;

        if (!desc || !desc.servers || desc.servers.size === 0) {
            return null;
        }

        // Ger first server
        const [server] = desc.servers.values();

        const host = server.address; // ie.:: "mongo:27017"
        const dbName = conn.name; // database name

        return `mongodb://${host}/${dbName}`;
    } catch (e) {
        return null;
    }
}
/**
 * Init periodic checks (cached) againts CB and IotAgent-Mananger
 */
function startHealthChecks({
    contextBrokerUrl,
    iotagentManagerUrl,
    deviceRegistryType = 'memory',
    configMqtt,
    intervalMs,
    timeoutMs,
    downAfterFails,
    considerHttpResponseUp,
    // Allow change endpoint to use
    managerPath = '/iot/protocols',
    cbPath = '/version'
    // if UP but response was 404
}) {
    const cbBase = normalizeBaseUrl(contextBrokerUrl);
    const iotaMngrBase = normalizeBaseUrl(iotagentManagerUrl);
    const mongoEnabled = deviceRegistryType && deviceRegistryType !== 'memory';

    // Set as configured / not configured
    healthState.contextBroker.configured = Boolean(cbBase);
    healthState.contextBroker.url = cbBase;
    statsRegistry.set('contextBrokerConfigured', healthState.contextBroker.configured, function () {});
    statsRegistry.set('contextBrokerUrl', healthState.contextBroker.url, function () {});
    if (!cbBase) {
        healthState.contextBroker.ok = null;
        healthState.contextBroker.lastError = 'Not configured';
        healthState.contextBroker.consecutiveFails = 0;
    }
    healthState.iotagentManager.configured = Boolean(iotaMngrBase);
    healthState.iotagentManager.url = iotaMngrBase;
    statsRegistry.set('iotagentManagerConfigured', healthState.iotagentManager.configured, function () {});
    statsRegistry.set('iotagentManagerUrl', healthState.iotagentManager.url, function () {});
    if (!iotaMngrBase) {
        healthState.iotagentManager.ok = null;
        healthState.iotagentManager.lastError = 'Not configured';
        healthState.iotagentManager.consecutiveFails = 0;
    }
    healthState.mongodb.configured = Boolean(mongoEnabled);
    statsRegistry.set('mongodbConfigured', healthState.mongodb.configured, function () {});
    if (!mongoEnabled) {
        healthState.mongodb.ok = null;
        healthState.mongodb.lastOk = null;
        healthState.mongodb.lastError = 'Not configured (deviceRegistry.type=memory)';
        healthState.mongodb.latencyMs = null;
        healthState.mongodb.consecutiveFails = 0;
    }
    let Device;
    if (mongoEnabled) {
        try {
            Device = require('../../model/Device');
        } catch (e) {
            // Not available
            Device = null;
        }
    }
    let mqtt;
    const mqttEnabled = configMqtt && configMqtt.disabled !== true && configMqtt.host && configMqtt.port;
    healthState.mqtt.configured = Boolean(mqttEnabled);
    statsRegistry.set('mqttConfigured', healthState.mqtt.configured, function () {});
    if (!mqttEnabled) {
        healthState.mqtt.ok = null;
        healthState.mqtt.url = null;
        healthState.mqtt.lastOk = null;
        healthState.mqtt.lastError = 'Not configured or disabled';
        healthState.mqtt.latencyMs = null;
        healthState.mqtt.consecutiveFails = 0;
    }
    if (mqttEnabled && !healthState.mqtt.url) {
        mqtt = require('mqtt');
        healthState.mqtt.url = `mqtt://${configMqtt.host}:${configMqtt.port}`;
        statsRegistry.set('mqttUrl', healthState.mqtt.url, function () {});
    }

    // If none configured, then timer is not started
    if (!cbBase && !iotaMngrBase && !mongoEnabled && !mqttEnabled) {
        if (healthTimer) {
            clearInterval(healthTimer);
        }
        healthTimer = null;
        return { enabled: false };
    }

    function doRequest(url) {
        return new Promise((resolve, reject) => {
            request(
                {
                    method: 'GET',
                    url,
                    throwHttpErrors: false,
                    retry: 0,
                    responseType: 'text',
                    timeout: { request: timeoutMs }
                },
                /* eslint-disable-next-line consistent-return */
                (err, response, body) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve({ response, body });
                }
            );
        });
    }
    async function ping(name, base, urlPath) {
        let url;
        try {
            url = buildUrl(base, urlPath);
        } catch (e) {
            // wrong base
            healthState[name].ok = false;
            healthState[name].lastError = `Invalid base URL: ${e.message || e}`;
            healthState[name].consecutiveFails += 1;
            statsRegistry.set(name + 'OK', false, function () {});
            statsRegistry.set(name + 'LastError', healthState[name].lastError, function () {});
            statsRegistry.add(name + 'consecutiveFails', 1, function () {});
            return;
        }
        const t0 = Date.now();
        try {
            const { response } = await doRequest(url);
            const ms = Date.now() - t0;
            const statusCode = response?.statusCode;
            const ok = considerHttpResponseUp
                ? typeof statusCode === 'number'
                    ? statusCode < 500
                    : false
                : typeof statusCode === 'number'
                ? statusCode >= 200 && statusCode < 400
                : false;
            if (ok) {
                healthState[name].ok = true;
                healthState[name].lastOk = new Date().toISOString();
                healthState[name].lastError = null;
                healthState[name].latencyMs = ms;
                healthState[name].consecutiveFails = 0;
            } else {
                const fails = (healthState[name].consecutiveFails || 0) + 1;
                healthState[name].consecutiveFails = fails;
                healthState[name].latencyMs = ms;
                healthState[name].lastError = `HTTP ${statusCode} in ${url}`;
                if (fails >= downAfterFails) {
                    healthState[name].ok = false;
                }
            }
            statsRegistry.set(name + 'OK', healthState[name].ok, function () {});
            statsRegistry.set(name + 'LastOk', healthState[name].lastOk, function () {});
            statsRegistry.set(name + 'LastError', healthState[name].lastError, function () {});
            statsRegistry.set(name + 'LatencyMs', healthState[name].latencyMs, function () {});
            statsRegistry.set(name + 'ConsecutiveFails', healthState[name].consecutiveFails, function () {});
        } catch (e) {
            const ms = Date.now() - t0;
            const fails = (healthState[name].consecutiveFails || 0) + 1;
            healthState[name].consecutiveFails = fails;
            healthState[name].latencyMs = ms;
            healthState[name].lastError = `${e.message || e} (${url})`;
            statsRegistry.set(name + 'ConsecutiveFails', fails, function () {});
            statsRegistry.set(name + 'LatencyMs', ms, function () {});
            statsRegistry.set(name + 'LastError', healthState[name].lastError, function () {});
            if (fails >= downAfterFails) {
                healthState[name].ok = false;
                statsRegistry.set(name + 'OK', false, function () {});
            }
        }
    }
    async function pingMongo() {
        const t0 = Date.now();
        if (!mongoEnabled) {
            return;
        }
        const conn = Device?.model?.db; // mongoose Connection
        const rs = conn?.readyState;
        if (conn && !healthState.mongodb.url) {
            healthState.mongodb.url = fillMongoUrlFromConnection(conn);
            statsRegistry.set('mongodbUrl', healthState.mongodb.url, function () {});
        }
        if (!conn || rs !== 1 || !conn.db) {
            const ms = Date.now() - t0;
            const fails = (healthState.mongodb.consecutiveFails || 0) + 1;
            healthState.mongodb.consecutiveFails = fails;
            healthState.mongodb.latencyMs = ms;
            healthState.mongodb.lastError = `Mongo not ready via Device.model (readyState=${rs})`;
            statsRegistry.set('mongodbConsecutiveFails', fails, function () {});
            statsRegistry.set('mongodbLatencyMs', ms, function () {});
            statsRegistry.set('mongodbLastError', healthState.mongodb.lastError, function () {});
            if (fails >= downAfterFails) {
                healthState.mongodb.ok = false;
                statsRegistry.set('mongodbOK', false, function () {});
            }
            return;
        }
        let timer;
        try {
            const controller = new AbortController();
            timer = setTimeout(() => controller.abort(), timeoutMs);
            await conn.db.admin().command({ ping: 1 }, { signal: controller.signal });
            const ms = Date.now() - t0;
            healthState.mongodb.ok = true;
            healthState.mongodb.lastOk = new Date().toISOString();
            healthState.mongodb.lastError = null;
            healthState.mongodb.latencyMs = ms;
            healthState.mongodb.consecutiveFails = 0;
            statsRegistry.set('mongodbOK', true, function () {});
            statsRegistry.set('mongodbLastOK', healthState.mongodb.lastOk, function () {});
            statsRegistry.set('mongodbLastError', null, function () {});
            statsRegistry.set('mongodbLatencyMs', ms, function () {});
            statsRegistry.set('mongodbConsecutiveFails', 0, function () {});
        } catch (e) {
            const ms = Date.now() - t0;
            const fails = (healthState.mongodb.consecutiveFails || 0) + 1;
            healthState.mongodb.consecutiveFails = fails;
            healthState.mongodb.latencyMs = ms;
            healthState.mongodb.lastError = e?.message || String(e);
            statsRegistry.set('mongodbConsecutiveFails', fails, function () {});
            statsRegistry.set('mongodbLatencyMs', ms, function () {});
            statsRegistry.set('mongodbLastError', healthState.mongodb.lastError, function () {});
            if (fails >= downAfterFails) {
                healthState.mongodb.ok = false;
                statsRegistry.set('mongodbOK', false, function () {});
            }
        } finally {
            if (timer) {
                clearTimeout(timer);
            }
        }
    }
    function pingMqtt(configMqtt, timeoutMs, downAfterFails) {
        /* eslint-disable-next-line consistent-return */
        return new Promise((resolve) => {
            const t0 = Date.now();
            if (!healthState.mqtt.configured) {
                return resolve();
            }
            const url = `mqtt://${configMqtt.host}:${configMqtt.port}`;
            const client = mqtt.connect(url, {
                clientId: `healthcheck_${Math.random().toString(16).slice(2)}`,
                username: configMqtt.username,
                password: configMqtt.password,
                keepalive: Number(configMqtt.keepalive) || 60,
                reconnectPeriod: 0, // do not retry
                connectTimeout: timeoutMs,
                clean: true
            });
            let finished = false;
            const done = (ok, errMsg) => {
                if (finished) {
                    return;
                }
                finished = true;
                const ms = Date.now() - t0;
                if (ok) {
                    healthState.mqtt.ok = true;
                    healthState.mqtt.lastOk = new Date().toISOString();
                    healthState.mqtt.lastError = null;
                    healthState.mqtt.latencyMs = ms;
                    healthState.mqtt.consecutiveFails = 0;
                } else {
                    const fails = (healthState.mqtt.consecutiveFails || 0) + 1;
                    healthState.mqtt.consecutiveFails = fails;
                    healthState.mqtt.latencyMs = ms;
                    healthState.mqtt.lastError = errMsg || `MQTT connect failed to ${url}`;
                    if (fails >= downAfterFails) {
                        healthState.mqtt.ok = false;
                    }
                }
                statsRegistry.set('mqttOK', healthState.mqtt.ok, function () {});
                statsRegistry.set('mqttLastOk', healthState.mqtt.lastOk, function () {});
                statsRegistry.set('mqttLastError', healthState.mqtt.lastError, function () {});
                statsRegistry.set('mqttLatencyMs', healthState.mqtt.latencyMs, function () {});
                statsRegistry.set('mqttConsecutiveFails', healthState.mqtt.consecutiveFails, function () {});
                client.end(true);
                resolve();
            };
            client.once('connect', () => done(true));
            client.once('error', (err) => done(false, err.message));
            client.once('close', () => {
                if (!finished) {
                    done(false, 'Connection closed before connect');
                }
            });
            // Fallback timeout
            setTimeout(() => {
                if (!finished) {
                    done(false, `MQTT timeout after ${timeoutMs}ms`);
                }
            }, timeoutMs + 50);
        });
    }
    async function refresh() {
        const tasks = [];
        if (cbBase) {
            tasks.push(ping('contextBroker', cbBase, cbPath));
        }
        if (iotaMngrBase) {
            tasks.push(ping('iotagentManager', iotaMngrBase, managerPath));
        }
        if (mongoEnabled) {
            tasks.push(pingMongo(timeoutMs, downAfterFails));
        }
        if (mqttEnabled) {
            tasks.push(pingMqtt(configMqtt, timeoutMs, downAfterFails));
        }
        await Promise.allSettled(tasks);
    }
    // first execution
    refresh();

    // and then
    if (healthTimer) {
        clearInterval(healthTimer);
    }
    healthTimer = setInterval(refresh, intervalMs);
    healthTimer.unref?.(); // allow shutdown

    return { enabled: true };
}

module.exports = {
    getHealthState,
    startHealthChecks
};
