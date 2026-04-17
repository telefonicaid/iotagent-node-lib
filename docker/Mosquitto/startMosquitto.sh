#!/bin/sh
set -eu

echo "INFO: startMosquitto..."

if [ "${CONFIG_FROM_ENV}" = "true" ] ; then
    cp /etc/mosquitto/mosquitto.conf.orig /etc/mosquitto/mosquitto.conf

    sed -i 's|log_dest file /var/log/mosquitto/mosquitto.log|log_dest stderr|g' /etc/mosquitto/mosquitto.conf

    cat >> /etc/mosquitto/mosquitto.conf <<'EOF'
log_timestamp true
log_timestamp_format %Y-%m-%dT%H:%M:%S
listener 9001
protocol websockets
listener 1883
protocol mqtt
EOF

    if [ -n "${IOTA_PASS:-}" ] ; then
        sed -i '$ i acl_file /etc/mosquitto/aclfile\npassword_file /etc/mosquitto/pwfile' /etc/mosquitto/mosquitto.conf

        cp -f /root/aclfile /etc/mosquitto/aclfile
        sed -i "s/user iota/user ${IOTA_USER}/g" /etc/mosquitto/aclfile

        : > /etc/mosquitto/pwfile
        mosquitto_passwd -b /etc/mosquitto/pwfile "${IOTA_USER}" "${IOTA_PASS}"

        chown mosquitto:mosquitto /etc/mosquitto/pwfile /etc/mosquitto/aclfile
        chmod 0700 /etc/mosquitto/pwfile /etc/mosquitto/aclfile
    fi
fi

echo "INFO: content /etc/mosquitto/mosquitto.conf:"
cat /etc/mosquitto/mosquitto.conf

echo "INFO: start: /usr/sbin/mosquitto -c /etc/mosquitto/mosquitto.conf"
exec /usr/sbin/mosquitto -c /etc/mosquitto/mosquitto.conf

