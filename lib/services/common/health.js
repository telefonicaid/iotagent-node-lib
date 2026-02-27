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

/**
 * Init periodic checks (cached) againts CB and IotAgent-Mananger
 */
function startHealthChecks({
    contextBrokerUrl,
    iotagentManagerUrl,
    deviceRegistryType = 'memory',
    intervalMs = 10000,
    timeoutMs = 1500,
    downAfterFails = 3,
    // Allow change endpoint to use
    managerPath = '/iot/protocols',
    cbPath = '/version',
    // if UP but response was 404
    considerHttpResponseUp = false
}) {
    const cbBase = normalizeBaseUrl(contextBrokerUrl);
    const iotaMngrBase = normalizeBaseUrl(iotagentManagerUrl);
    const mongoEnabled = deviceRegistryType && deviceRegistryType !== 'memory';

    // Set as configured / not configured
    healthState.contextBroker.configured = Boolean(cbBase);
    healthState.contextBroker.url = cbBase;
    if (!cbBase) {
        healthState.contextBroker.ok = null;
        healthState.contextBroker.lastError = 'Not configured';
        healthState.contextBroker.consecutiveFails = 0;
    }
    healthState.iotagentManager.configured = Boolean(iotaMngrBase);
    healthState.iotagentManager.url = iotaMngrBase;
    if (!iotaMngrBase) {
        healthState.iotagentManager.ok = null;
        healthState.iotagentManager.lastError = 'Not configured';
        healthState.iotagentManager.consecutiveFails = 0;
    }
    healthState.mongodb.configured = Boolean(mongoEnabled);
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

    // If none configured, then timer is not started
    if (!cbBase && !iotaMngrBase && !mongoEnabled) {
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
                (err, response, body) => {
                    if (err) return reject(err);
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
        } catch (e) {
            const ms = Date.now() - t0;
            const fails = (healthState[name].consecutiveFails || 0) + 1;
            healthState[name].consecutiveFails = fails;
            healthState[name].latencyMs = ms;
            healthState[name].lastError = `${e.message || e} (${url})`;
            if (fails >= downAfterFails) {
                healthState[name].ok = false;
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

        if (!conn || rs !== 1 || !conn.db) {
            const fails = (healthState.mongodb.consecutiveFails || 0) + 1;
            healthState.mongodb.consecutiveFails = fails;
            healthState.mongodb.latencyMs = Date.now() - t0;
            healthState.mongodb.lastError = `Mongo not ready via Device.model (readyState=${rs})`;
            if (fails >= downAfterFails) {
                healthState.mongodb.ok = false;
            }
            return;
        }
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            await conn.db.admin().command({ ping: 1 }, { signal: controller.signal });
            clearTimeout(timer);
            const ms = Date.now() - t0;
            healthState.mongodb.ok = true;
            healthState.mongodb.lastOk = new Date().toISOString();
            healthState.mongodb.lastError = null;
            healthState.mongodb.latencyMs = ms;
            healthState.mongodb.consecutiveFails = 0;
        } catch (e) {
            clearTimeout(timer);
            const ms = Date.now() - t0;
            const fails = (healthState.mongodb.consecutiveFails || 0) + 1;
            healthState.mongodb.consecutiveFails = fails;
            healthState.mongodb.latencyMs = ms;
            healthState.mongodb.lastError = e?.message || String(e);
            if (fails >= downAfterFails) {
                healthState.mongodb.ok = false;
            }
        }
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
