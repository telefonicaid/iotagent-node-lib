#!/usr/bin/env bash

if [ "${CONGIF_FROM_ENV}" = true ] ; then
    cp /etc/mosquitto/mosquitto.conf.orig /etc/mosquitto/mosquitto.conf
    echo "log_timestamp true" >> /etc/mosquitto/mosquitto.conf
    echo "log_timestamp_format %Y-%m-%dT%H:%M:%S" >> /etc/mosquitto/mosquitto.conf
    echo 'listener 9001' >> /etc/mosquitto/mosquitto.conf
    echo 'protocol websockets' >> /etc/mosquitto/mosquitto.conf
    echo 'listener 1883' >> /etc/mosquitto/mosquitto.conf
    echo 'protocol mqtt' >> /etc/mosquitto/mosquitto.conf    
    if ! [ -z "${IOTA_PASS}" ] ; then
      # Only if IOTA_PASS is set and not empty MQTT user/pass authentication is used
      touch /etc/mosquitto/pwfile
      sed -i '$ i acl_file /etc/mosquitto/aclfile\npassword_file /etc/mosquitto/pwfile' /etc/mosquitto/mosquitto.conf
      cp -f /root/aclfile /etc/mosquitto/aclfile
      mosquitto_passwd -b /etc/mosquitto/pwfile iota ${IOTA_PASS}
    fi
fi

/usr/sbin/mosquitto -c /etc/mosquitto/mosquitto.conf
