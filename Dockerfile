FROM ubuntu:14.04
MAINTAINER Jason Greathouse <jgreat@jgreat.me>

ENV DEBIAN_FRONTEND noninteractive

#install
RUN apt-get update && \
    apt-get dist-upgrade -y && \
    apt-get install -y software-properties-common git curl python build-essential && \
    curl -sL https://deb.nodesource.com/setup_0.12 | sudo bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    npm update -g && \
    npm install -g gulp

#add repo
ADD . /app

#add entrypoint and start up scripts
ADD .docker/usr/local/bin /usr/local/bin

#Change the working directory to the app root
WORKDIR /app

#Install app requirements
RUN npm install

#entrypoint script to set env vars when linking containers for dev
ENTRYPOINT ["/usr/local/bin/entry.sh"]

#Default command to run on start up
CMD ["/usr/local/bin/start-app.sh"]
