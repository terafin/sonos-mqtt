const http = require('http');
const SonosSystem = require('sonos-discovery');
const SonosHttpAPI = require('sonos-http-api/lib/sonos-http-api.js');
const settings = require('sonos-http-api/settings');

const discovery = new SonosSystem(settings);
const api = new SonosHttpAPI(discovery, settings);

let server = http.createServer(api.requestHandler);

server.listen(settings.port);


