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
 * please contact with::daniel.moranjimenez@telefonica.com
 *
 */

/*This file is intended to contain the whole transformartion map defining  
JEXL avaliable transformations*/

const map = {
    jsonparse: (str) => {
        try {
            return JSON.parse(str);
        } catch (e) {
            return null;
        }
    },
    jsonstringify: (obj) => {
        try {
            return JSON.stringify(obj);
        } catch (e) {
            return null;
        }
    },
    indexOf: (val, char) => String(val).indexOf(char),
    length: (val) => String(val).length,
    trim: (val) => String(val).trim(),
    substr: (val, int1, int2) => String(val).substr(int1, int2),
    addreduce: (arr) => {
        try {
            return arr.reduce((i, v) => i + v);
        } catch (e) {
            return null;
        }
    },
    lengtharray: (arr) => arr.length,
    typeof: (val) => typeof val,
    isarray: (arr) => Array.isArray(arr),
    isnan: (val) => isNaN(val),
    parseint: (val) => {
        const parsed = parseInt(val);
        return isNaN(parsed) ? null : parsed;
    },
    parsefloat: (val) => {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : parsed;
    },
    toisodate: (val) => {
        try {
            return new Date(val).toISOString();
        } catch (e) {
            return null;
        }
    },
    timeoffset: (isostr) => {
        const date = new Date(isostr);
        return isNaN(date.getTime()) ? null : date.getTimezoneOffset();
    },
    tostring: (val) => {
        try {
            return val.toString();
        } catch (e) {
            return null;
        }
    },
    urlencode: (val) => encodeURI(val),
    urldecode: function (value) {
        try {
            return decodeURI(value);
        } catch {
            return null;
        }
    },
    replacestr: (str, from, to) => str.replace(from, to),
    replaceregexp: (str, reg, to) => {
        try {
            return str.replace(new RegExp(reg), to);
        } catch (e) {
            return null;
        }
    },
    replaceallstr: (str, from, to) => str.replaceAll(from, to),
    replaceallregexp: (str, reg, to) => {
        try {
            return str.replaceAll(new RegExp(reg, 'g'), to);
        } catch (e) {
            return null;
        }
    },
    split: (str, ch) => str.split(ch),
    joinarrtostr: (arr, ch) => arr.join(ch),
    concatarr: (arr, arr2) => arr.concat(arr2),
    mapper: (val, values, choices) => choices[values.findIndex((target) => target === val)],
    thmapper: (val, values, choices) =>
        choices[
            values.reduce((acc, curr, i) => (acc === 0 || acc ? acc : val <= curr ? (acc = i) : (acc = null)), null)
        ],
    bitwisemask: (i, mask, op, shf) =>
        (op === '&' ? parseInt(i) & mask : op === '|' ? parseInt(i) | mask : op === '^' ? parseInt(i) ^ mask : i) >>
        shf,
    slice: (arr, init, end) => arr.slice(init, end),
    addset: (arr, x) => {
        return Array.from(new Set(arr).add(x));
    },
    removeset: (arr, x) => {
        let s = new Set(arr);
        s.delete(x);
        return Array.from(s);
    },
    touppercase: (val) => String(val).toUpperCase(),
    tolowercase: (val) => String(val).toLowerCase(),
    floor: (val) => Math.floor(val),
    ceil: (val) => Math.ceil(val),
    round: (val) => Math.round(val),
    tofixed: (val, decimals) => {
        const num = Number.parseFloat(val);
        const dec = Number.parseInt(decimals);

        if (isNaN(num) || isNaN(dec)) return null;

        return num.toFixed(dec);
    },
    gettime: function (value) {
        const timestamp = new Date(value).getTime();
        return isNaN(timestamp) ? null : timestamp;
    },
    toisostring: (d) => {
        const date = new Date(d);
        return isNaN(date.getTime()) ? null : date.toISOString();
    },
    // https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString
    localestring: (d, timezone, options) => {
        try {
            return new Date(d).toLocaleString(timezone, options);
        } catch (e) {
            return null;
        }
    },
    now: () => Date.now(),
    hextostring: (val) => {
        try {
            if (typeof val !== 'string' || !/^[0-9a-fA-F]+$/.test(val) || val.length % 2 !== 0) {
                return null;
            }
            return new TextDecoder().decode(new Uint8Array(val.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))));
        } catch (e) {
            return null;
        }
    },
    valuePicker: (val, pick) =>
        Object.entries(val)
            .filter(([, v]) => v === pick)
            .map(([k]) => k),
    valuePickerMulti: (val, pick) =>
        Object.entries(val)
            .filter(([, v]) => pick.includes(v))
            .map(([k]) => k)
};

exports.map = map;
