FROM node:6-alpine

RUN apk --no-cache add wget
RUN mkdir /app
WORKDIR /app
COPY . .

CMD npm start