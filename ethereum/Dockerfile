FROM node
RUN npm i -g remixd &&\
	sed -i s/127.0.0.1/0.0.0.0/g /usr/local/lib/node_modules/remixd/src/websocket.js
EXPOSE 65520
ENTRYPOINT ["/usr/local/bin/remixd", "-s", "/app", "--remix-ide", "https://remix.ethereum.org"]