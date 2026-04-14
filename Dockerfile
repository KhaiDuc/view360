FROM node:18-alpine

WORKDIR /app/server

COPY server/package*.json ./

RUN npm install

COPY server/ .

COPY client/ /app/client/

EXPOSE 8080

CMD ["node", "index.js"]
