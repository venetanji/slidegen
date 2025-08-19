# Dockerfile

FROM node:14

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install

# Copy app source
COPY . .

# Expose the app port
EXPOSE 3000

# Command to run the app
CMD [ "node", "src/server.js" ]