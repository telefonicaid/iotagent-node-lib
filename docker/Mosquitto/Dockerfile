ARG IMAGE_TAG=13.4-slim
FROM debian:${IMAGE_TAG}

ARG CLEAN_DEV_TOOLS
ENV CLEAN_DEV_TOOLS=${CLEAN_DEV_TOOLS:-1}

ENV CONFIG_FROM_ENV=true

COPY aclfile /root/aclfile
COPY startMosquitto.sh /bin/startMosquitto.sh

RUN set -eux; \
    apt-get update; \
    apt-get -y upgrade; \
    apt-get install -y --no-install-recommends \
        wget \
        mosquitto \
        mosquitto-clients; \
    cp /etc/mosquitto/mosquitto.conf /etc/mosquitto/mosquitto.conf.orig; \
    chmod 0755 /bin/startMosquitto.sh; \
    mkdir -p /var/log/mosquitto /var/run/mosquitto /var/lib/mosquitto; \
    chown -R mosquitto:mosquitto /var/log/mosquitto /var/run/mosquitto /var/lib/mosquitto; \
    chmod 0700 /root/aclfile; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*; \
    if [ "${CLEAN_DEV_TOOLS}" != "0" ]; then \
        apt-get purge -y --auto-remove wget || true; \
    fi

EXPOSE 1883 9001

ENTRYPOINT ["/bin/startMosquitto.sh"]
