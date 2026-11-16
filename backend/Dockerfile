FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV BACKEND_PORT=5003

EXPOSE 5003

CMD ["node", "--experimental-sqlite", "./src/server.js"]
