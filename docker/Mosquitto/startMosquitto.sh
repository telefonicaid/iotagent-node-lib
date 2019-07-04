#!/bin/bash

touch /var/log/mosquitto/mosquitto.log
chmod 664 /var/log/mosquitto/mosquitto.log
chown mosquitto.mosquitto /var/log/mosquitto/mosquitto.log

mosquitto_passwd -b /etc/mosquitto/pwfile iota ${IOTA_PASS}
/usr/sbin/mosquitto -c /etc/mosquitto/mosquitto.conf &

tail -f /var/log/mosquitto/mosquitto.log | perl -pe 's/(\d+)/localtime($1)/e'
