FROM centos:7.7.1908

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
  && sed -i '$ i acl_file /etc/mosquitto/aclfile\npassword_file /etc/mosquitto/pwfile' /etc/mosquitto/mosquitto.conf \
  && echo "log_timestamp true" >> /etc/mosquitto/mosquitto.conf \
  && echo "log_timestamp_format %Y-%m-%dT%H:%M:%S" >> /etc/mosquitto/mosquitto.conf \
  && echo 'listener 9001' >> /etc/mosquitto/mosquitto.conf \
  && echo 'protocol websockets' >> /etc/mosquitto/mosquitto.conf \
  && echo 'listener 1883' >> /etc/mosquitto/mosquitto.conf \
  && echo 'protocol mqtt' >> /etc/mosquitto/mosquitto.conf \
  && mv /root/aclfile /etc/mosquitto/aclfile \
  && yum clean all

EXPOSE 1883
EXPOSE 9001

ENTRYPOINT /bin/startMosquitto.sh
