FROM centos:7.9.2009

COPY aclfile /root/
COPY startMosquitto.sh /bin

ENV CONGIF_FROM_ENV true

RUN yum update -y && yum install -y wget \
  && yum install -y epel-release \
  && yum update -y epel-release \
  && yum install -y mosquitto \
  && cp /etc/mosquitto/mosquitto.conf /etc/mosquitto/mosquitto.conf.orig \
  && chmod 755 /bin/startMosquitto.sh \
  && mkdir /var/log/mosquitto \
  && chown mosquitto:mosquitto /var/log/mosquitto \
  && yum clean all


EXPOSE 1883
EXPOSE 9001

ENTRYPOINT /bin/startMosquitto.sh
