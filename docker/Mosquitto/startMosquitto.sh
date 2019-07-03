#!/usr/bin/env bash

mosquitto_passwd -b /etc/mosquitto/pwfile iota ${IOTA_PASS}
/usr/sbin/mosquitto -c /etc/mosquitto/mosquitto.conf &
touch /var/log/mosquitto/mosquitto.log
tail -f /var/log/mosquitto/mosquitto.log | perl -pe 's/(\d+)/localtime($1)/e'
