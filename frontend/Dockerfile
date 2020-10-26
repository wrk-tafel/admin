FROM node:current-alpine

RUN npm install http-server -g

COPY app /app
WORKDIR /app

CMD [ "http-server", "/app" ]
