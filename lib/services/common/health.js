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

const axios = require('axios');

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

/**
 * Init periodic checks (cached) againts CB and IotAgent-Mananger
 */
function startHealthChecks({
    contextBrokerUrl,
    iotagentManagerUrl,
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
    const mgrBase = normalizeBaseUrl(iotagentManagerUrl);

    // Set as configured / not configured
    healthState.contextBroker.configured = Boolean(cbBase);
    healthState.contextBroker.url = cbBase;
    if (!cbBase) {
        healthState.contextBroker.ok = null;
        healthState.contextBroker.lastError = 'Not configured';
        healthState.contextBroker.consecutiveFails = 0;
    }
    healthState.iotagentManager.configured = Boolean(mgrBase);
    healthState.iotagentManager.url = mgrBase;
    if (!mgrBase) {
        healthState.iotagentManager.ok = null;
        healthState.iotagentManager.lastError = 'Not configured';
        healthState.iotagentManager.consecutiveFails = 0;
    }
    // If none configured, then timer is not started
    if (!cbBase && !mgrBase) {
        if (healthTimer) {
            clearInterval(healthTimer);
        }
        healthTimer = null;
        return { enabled: false };
    }
    async function ping(name, base, urlPath) {
        const url = `${base}${urlPath}`;
        const t0 = Date.now();
        try {
            const resp = await axios.get(url, { timeout: timeoutMs, validateStatus: () => true });
            const ms = Date.now() - t0;
            const ok = considerHttpResponseUp
                ? resp.status < 500 // anything but 5xx => “UP”
                : resp.status >= 200 && resp.status < 400;

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
                healthState[name].lastError = `HTTP ${resp.status} in ${url}`;
                if (fails >= downAfterFails) {
                    healthState[name].ok = false;
                }
            }
        } catch (e) {
            const fails = (healthState[name].consecutiveFails || 0) + 1;
            healthState[name].consecutiveFails = fails;
            healthState[name].lastError = `${e.message || e} (${url})`;
            if (fails >= downAfterFails) {
                healthState[name].ok = false;
            }
        }
    }

    async function refresh() {
        await Promise.allSettled([ping('contextBroker', '/version'), ping('iotagentManager', '/iot/protocols')]);
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
