FROM node:alpine

RUN apk --no-cache add wget
RUN mkdir /app
WORKDIR /app
COPY . .

CMD npm start

HEALTHCHECK CMD wget -q localhost:5005 -O /dev/null || exit 1