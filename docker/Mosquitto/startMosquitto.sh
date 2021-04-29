#!/usr/bin/env bash

if [ "${CONGIF_FROM_ENV}" = true ] ; then
    touch /etc/mosquitto/pwfile
    sed -i '$ i acl_file /etc/mosquitto/aclfile\npassword_file /etc/mosquitto/pwfile' /etc/mosquitto/mosquitto.conf
    echo "log_timestamp true" >> /etc/mosquitto/mosquitto.conf
    echo "log_timestamp_format %Y-%m-%dT%H:%M:%S" >> /etc/mosquitto/mosquitto.conf
    echo 'listener 9001' >> /etc/mosquitto/mosquitto.conf
    echo 'protocol websockets' >> /etc/mosquitto/mosquitto.conf
    echo 'listener 1883' >> /etc/mosquitto/mosquitto.conf
    echo 'protocol mqtt' >> /etc/mosquitto/mosquitto.conf
    mv /root/aclfile /etc/mosquitto/aclfile
    mosquitto_passwd -b /etc/mosquitto/pwfile iota ${IOTA_PASS}
fi

/usr/sbin/mosquitto -c /etc/mosquitto/mosquitto.conf
