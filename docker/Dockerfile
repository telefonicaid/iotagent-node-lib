FROM centos:7

COPY aclfile /root/
COPY startMosquitto.sh /bin

RUN yum update -y && yum install -y wget \
  && wget http://dl.fedoraproject.org/pub/epel/7/x86_64/e/epel-release-7-7.noarch.rpm && yum localinstall -y --nogpgcheck epel-release-7-7.noarch.rpm \
  && yum install -y npm git \
  && yum install -y mosquitto\
  && mkdir /var/log/mosquitto\
  && chown mosquitto:mosquitto /var/log/mosquitto\
  && touch /etc/mosquitto/pwfile\
  && mv /etc/mosquitto/mosquitto.conf.example /etc/mosquitto/mosquitto.conf\
  && sed -i '$ i acl_file /etc/mosquitto/aclfile\npassword_file /etc/mosquitto/pwfile' /etc/mosquitto/mosquitto.conf\
  && mv /root/aclfile /etc/mosquitto/aclfile

EXPOSE 1883

ENTRYPOINT /bin/startMosquitto.sh
