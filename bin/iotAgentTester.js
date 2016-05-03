#!/usr/bin/env node

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
 * If not, seehttp://www.gnu.org/licenses/.
 *
 * For those usages not covered by the GNU Affero General Public License
 * please contact with::[contacto@tid.es]
 */
'use strict';

var commandLine = require('../lib/command/commandLine'),
    clUtils = require('command-shell-lib'),
    configCb = {
        host: 'localhost',
        port: 1026,
        service: 'tester',
        subservice: '/test'
    },
    configIot = {
        host: 'localhost',
        port: 4041,
        name: 'default',
        service: 'tester',
        subservice: '/test'
    };

commandLine.init(configCb, configIot);

clUtils.initialize(commandLine.commands, 'IoT Agent tester> ');