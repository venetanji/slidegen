FROM node:20-slim

# Install Marp CLI
RUN apt-get update && \
    apt-get install -y curl && \
    npm install -g @marp-team/marp-cli

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD [ "node", "src/server.js" ]