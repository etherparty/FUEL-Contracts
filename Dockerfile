FROM node:8.1.4

WORKDIR /app

ADD ./server /app

WORKDIR /build

ADD ./client/build /build

WORKDIR /app

EXPOSE 4200

CMD [ "npm", "start" ]