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
    jsonparse: (val) => {
        const safeOperation =
            (fn) =>
            (...args) => {
                try {
                    return fn(...args);
                } catch (e) {
                    return null;
                }
            };
        return safeOperation(JSON.parse)(val);
    },
    jsonstringify: (val) => {
        const safeOperation =
            (fn) =>
            (...args) => {
                try {
                    return fn(...args);
                } catch (e) {
                    return null;
                }
            };
        return safeOperation(JSON.stringify)(val);
    },
    indexOf: (val, char) => String(val).indexOf(char),
    length: (val) => String(val).length,
    trim: (val) => String(val).trim(),
    substr: (val, int1, int2) => String(val).substr(int1, int2),
    addreduce: (arr) => {
        const safeOperation =
            (fn) =>
            (...args) => {
                try {
                    return fn(...args);
                } catch (e) {
                    return null;
                }
            };
        return safeOperation((arr) => arr.reduce((i, v) => i + v))(arr);
    },
    lengtharray: (arr) => arr.length,
    typeof: (val) => typeof val,
    isarray: Array.isArray,
    isnan: isNaN,
    parseint: (val) => {
        const safeParseNumber = (fn) => (val) => {
            const result = fn(val);
            return isNaN(result) ? null : result;
        };
        return safeParseNumber((val) => parseInt(val, 10))(val);
    },
    parsefloat: (val) => {
        const safeParseNumber = (fn) => (val) => {
            const result = fn(val);
            return isNaN(result) ? null : result;
        };
        return safeParseNumber(parseFloat)(val);
    },
    toisodate: (val) => {
        const safeDateOperation = (fn) => (val) => {
            const date = new Date(val);
            return isNaN(date.getTime()) ? null : fn(date);
        };
        return safeDateOperation((date) => date.toISOString())(val);
    },
    timeoffset: (val) => {
        const safeDateOperation = (fn) => (val) => {
            const date = new Date(val);
            return isNaN(date.getTime()) ? null : fn(date);
        };
        return safeDateOperation((date) => date.getTimezoneOffset())(val);
    },
    tostring: (val) => {
        const safeOperation =
            (fn) =>
            (...args) => {
                try {
                    return fn(...args);
                } catch (e) {
                    return null;
                }
            };
        return safeOperation((val) => val.toString())(val);
    },
    urlencode: encodeURI,
    urldecode: (val) => {
        const safeOperation =
            (fn) =>
            (...args) => {
                try {
                    return fn(...args);
                } catch (e) {
                    return null;
                }
            };
        return safeOperation(decodeURI)(val);
    },
    replacestr: (str, from, to) => str.replace(from, to),
    replaceregexp: (str, reg, to) => {
        const safeOperation =
            (fn) =>
            (...args) => {
                try {
                    return fn(...args);
                } catch (e) {
                    return null;
                }
            };
        return safeOperation((str, reg, to) => str.replace(new RegExp(reg), to))(str, reg, to);
    },
    replaceallregexp: (str, reg, to) => {
        const safeOperation =
            (fn) =>
            (...args) => {
                try {
                    return fn(...args);
                } catch (e) {
                    return null;
                }
            };
        return safeOperation((str, reg, to) => str.replace(new RegExp(reg, 'g'), to))(str, reg, to);
    },
    split: (str, ch) => str.split(ch),
    joinarrtostr: (arr, ch) => arr.join(ch),
    concatarr: (arr, arr2) => arr.concat(arr2),
    mapper: (val, values, choices) => choices[values.findIndex((target) => target === val)],
    thmapper: (val, values, choices) =>
        choices[values.reduce((acc, curr, i) => (acc !== null ? acc : val <= curr ? i : null), null)],
    bitwisemask: (i, mask, op, shf) =>
        (op === '&' ? parseInt(i) & mask : op === '|' ? parseInt(i) | mask : op === '^' ? parseInt(i) ^ mask : i) >>
        shf,
    slice: (arr, init, end) => arr.slice(init, end),
    addset: (arr, x) => Array.from(new Set(arr).add(x)),
    removeset: (arr, x) => {
        const s = new Set(arr);
        s.delete(x);
        return Array.from(s);
    },
    touppercase: (val) => String(val).toUpperCase(),
    tolowercase: (val) => String(val).toLowerCase(),
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
    tofixed: (val, decimals) => {
        const num = Number.parseFloat(val);
        const dec = Number.parseInt(decimals);
        return isNaN(num) || isNaN(dec) ? null : num.toFixed(dec);
    },
    gettime: (val) => {
        const safeDateOperation = (fn) => (val) => {
            const date = new Date(val);
            return isNaN(date.getTime()) ? null : fn(date);
        };
        return safeDateOperation((date) => date.getTime())(val);
    },
    toisostring: (val) => {
        const safeDateOperation = (fn) => (val) => {
            const date = new Date(val);
            return isNaN(date.getTime()) ? null : fn(date);
        };
        return safeDateOperation((date) => date.toISOString())(val);
    },
    localestring: (d, timezone, options) => {
        const safeOperation =
            (fn) =>
            (...args) => {
                try {
                    return fn(...args);
                } catch (e) {
                    return null;
                }
            };
        return safeOperation((d, timezone, options) => new Date(d).toLocaleString(timezone, options))(
            d,
            timezone,
            options
        );
    },
    now: Date.now,
    hextostring: (val) => {
        const safeOperation =
            (fn) =>
            (...args) => {
                try {
                    return fn(...args);
                } catch (e) {
                    return null;
                }
            };
        return safeOperation((val) => {
            if (typeof val !== 'string' || !/^[0-9a-fA-F]+$/.test(val) || val.length % 2 !== 0) {
                return null;
            }
            return new TextDecoder().decode(new Uint8Array(val.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))));
        })(val);
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
