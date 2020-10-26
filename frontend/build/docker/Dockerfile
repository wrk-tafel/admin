FROM node:current-alpine

# RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
# WORKDIR /home/node/app
# COPY package*.json ./
# USER node
# RUN npm run build
# COPY --chown=node:node . .

RUN npm install http-server -g

COPY app /app
WORKDIR /app

EXPOSE 8080

CMD [ "http-server", "-p", "8080", "/app" ]
