FROM node:6-alpine

RUN mkdir -p /app
COPY . /app
WORKDIR /app
RUN apk add --no-cache git

RUN npm install --production

CMD npm start