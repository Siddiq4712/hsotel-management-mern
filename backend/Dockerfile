FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install && npm install -g nodemon
COPY . .
EXPOSE 4000
CMD ["sh", "-c", "npm run start || nodemon server.js"]
