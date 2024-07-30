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
    jsonparse: (str) => JSON.parse(str),
    jsonstringify: (obj) => JSON.stringify(obj),
    indexOf: (val, char) => String(val).indexOf(char),
    length: (val) => String(val).length,
    trim: (val) => String(val).trim(),
    substr: (val, int1, int2) => String(val).substr(int1, int2),
    addreduce: (arr) => arr.reduce((i, v) => i + v),
    lengtharray: (arr) => arr.length,
    typeof: (val) => typeof val,
    isarray: (arr) => Array.isArray(arr),
    isnan: (val) => isNaN(val),
    parseint: (val) => parseInt(val),
    parsefloat: (val) => parseFloat(val),
    toisodate: (val) => new Date(val).toISOString(),
    timeoffset: (isostr) => new Date(isostr).getTimezoneOffset(),
    tostring: (val) => val.toString(),
    urlencode: (val) => encodeURI(val),
    urldecode: (val) => decodeURI(val),
    replacestr: (str, from, to) => str.replace(from, to),
    replaceregexp: (str, reg, to) => str.replace(new RegExp(reg), to),
    replaceallstr: (str, from, to) => str.replaceAll(from, to),
    replaceallregexp: (str, reg, to) => str.replaceAll(new RegExp(reg, 'g'), to),
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
    tofixed: (val, decimals) => Number.parseFloat(val).toFixed(decimals),
    gettime: (d) => new Date(d).getTime(),
    toisostring: (d) => new Date(d).toISOString(),
    // https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString
    localestring: (d, timezone, options) => new Date(d).toLocaleString(timezone, options),
    now: () => Date.now(),
    hextostring: (val) =>
        new TextDecoder().decode(new Uint8Array(val.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))),
    valuePicker: (val,pick) => Object.entries(val).filter(([, v]) => v === pick).map(([k,]) => k),
    valuePickerMulti: (val,pick) => Object.entries(val).filter(([, v]) => pick.includes(v)).map(([k,]) => k)
};

exports.map = map;
