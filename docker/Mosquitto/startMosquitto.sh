#!/usr/bin/env bash

mosquitto_passwd -b /etc/mosquitto/pwfile iota ${IOTA_PASS}
/usr/sbin/mosquitto -c /etc/mosquitto/mosquitto.conf
