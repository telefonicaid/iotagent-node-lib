FROM centos:7

COPY aclfile /root/
COPY startMosquitto.sh /bin

RUN yum update -y && yum install -y wget \
  && yum install -y epel-release \
  && yum update -y epel-release \
  && yum install -y mosquitto perl \
  && chmod 755 /bin/startMosquitto.sh \
  && mkdir /var/log/mosquitto \
  && chown mosquitto:mosquitto /var/log/mosquitto \
  && touch /etc/mosquitto/pwfile \
  && sed -i '$ i acl_file /etc/mosquitto/aclfile\npassword_file /etc/mosquitto/pwfile' /etc/mosquitto/mosquitto.conf \
  && mv /root/aclfile /etc/mosquitto/aclfile \
  && echo "log_dest file /mosquitto/log/mosquitto.log" >> /etc/mosquitto/mosquitto.conf \
  && echo "log_timestamp true" >> /etc/mosquitto/mosquitto.conf \
  && yum clean all

EXPOSE 1883

ENTRYPOINT /bin/startMosquitto.sh
