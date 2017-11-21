FROM node:6-alpine

RUN apk add --no-cache git
RUN mkdir /app
WORKDIR /app
COPY . .

CMD npm start