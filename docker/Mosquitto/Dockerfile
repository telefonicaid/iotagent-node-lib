ARG  IMAGE_TAG=12.6-slim
FROM debian:${IMAGE_TAG}

ARG CLEAN_DEV_TOOLS
ENV CLEAN_DEV_TOOLS ${CLEAN_DEV_TOOLS:-1}

ENV CONGIF_FROM_ENV true

COPY aclfile /root/
COPY startMosquitto.sh /bin

RUN \
    # Install security updates
    apt-get -y update && \
    apt-get -y upgrade && \
    # Install dependencies
    apt-get -y install \
       wget \
       mosquitto mosquitto-clients && \
    cp /etc/mosquitto/mosquitto.conf /etc/mosquitto/mosquitto.conf.orig && \
    chmod 755 /bin/startMosquitto.sh && \
    mkdir -p /var/log/mosquitto && \
    chown mosquitto:mosquitto /var/log/mosquitto && \
    mkdir -p /var/run/mosquitto/ && \
    chown mosquitto:mosquitto /var/run/mosquitto && \
    echo "INFO: Cleaning unused software..." && \
    apt-get clean && \
    apt-get -y autoremove --purge && \
    if [ ${CLEAN_DEV_TOOLS} -eq 0 ] ; then exit 0 ; fi && \
    # remove the same packages we installed at the beginning to build Orch
    apt-get -y autoremove --purge \
        wget


EXPOSE 1883
EXPOSE 9001

ENTRYPOINT /bin/startMosquitto.sh
