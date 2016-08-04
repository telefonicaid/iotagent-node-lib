FROM centos:7

COPY aclfile /root/
COPY startMosquitto.sh /bin

RUN yum update -y && yum install -y wget \
  && yum install -y epel-release \
  && yum update -y epel-release \
  && yum install -y mosquitto \
  && chmod 755 /bin/startMosquitto.sh \
  && mkdir /var/log/mosquitto \
  && chown mosquitto:mosquitto /var/log/mosquitto \
  && touch /etc/mosquitto/pwfile \
  && mv /etc/mosquitto/mosquitto.conf.example /etc/mosquitto/mosquitto.conf \
  && sed -i '$ i acl_file /etc/mosquitto/aclfile\npassword_file /etc/mosquitto/pwfile' /etc/mosquitto/mosquitto.conf \
  && mv /root/aclfile /etc/mosquitto/aclfile \
  && yum clean all

EXPOSE 1883

ENTRYPOINT /bin/startMosquitto.sh
