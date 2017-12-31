const SonosSystem = require('sonos-discovery')
const settings = require('sonos-http-api/settings')
const nodeStatic = require('node-static')
const http = require('http')
const requireDir = require('sonos-http-api/lib/helpers/require-dir')
const path = require('path')
const mqtt = require('mqtt')
require('homeautomation-js-lib/mqtt_helpers.js')

var shouldRetain = process.env.MQTT_RETAIN

if (_.isNil(shouldRetain)) {
    shouldRetain = true
}

var mqttOptions = {}

var client = mqtt.setupClient(null, null)

const discovery = new SonosSystem(settings)

function SonosMQTTAPI(discovery, settings) {

    const webroot = settings.webroot
    const actions = {}

    this.getWebRoot = () => webroot

    this.getPort = () => API_PORT

    this.discovery = discovery

    const player_related_events = [
        'group-mute',
        'transport-state',
        'group-volume',
        'volume-change',
        'mute-change',
    ]

    const system_related_events = [
        'list-change',
        'initialized',
        'topology-change',
    ]

    player_related_events.forEach(action =>
        discovery.on(action, player => {
            let topic = `${MQTT_PREFIX}${player.roomName.toLowerCase().replace(' ', '-')}/${action}`
            client.publish(topic.toLowerCase(), JSON.stringify(player))
        })
    )
    system_related_events.forEach(action =>
        discovery.on(action, system => {
            let topic = `${MQTT_PREFIX}system/${action}`
            client.publish(topic.toLowerCase(), JSON.stringify(system))
        })
    )

    // this handles registering of all actions
    this.registerAction = (action, handler) => {
        client.subscribe(`${MQTT_PREFIX}${action}`, { qos: 1 })
        client.subscribe(`${MQTT_PREFIX}${action}/#`, { qos: 1 })
        actions[action] = handler
    }

    //load modularized actions
    requireDir(path.join(__dirname, './node_modules/sonos-http-api/lib/actions'), (registerAction) => {
        registerAction(this)
    })

    this.requestHandler = (topic, message) => {
        if (discovery.zones.length === 0) {
            console.error('System has yet to be discovered')
            return
        }

        const params = topic.replace(MQTT_PREFIX, '').split('/')
        const opt = {}

        opt.player = discovery.getPlayer(params.pop())

        try {
            opt.values = JSON.parse(message.toString())

        } catch (e) {
            var mqttMessage = message.toString()
            if (mqttMessage.indexOf(',') !== -1)
                opt.values = mqttMessage.replace(' ', '+').split(',')
            else
                opt.values = [mqttMessage]
        }

        opt.action = params[0]

        if (!opt.player) {
            opt.player = discovery.getAnyPlayer()
        }

        handleAction(opt)
            .then((response) => {
                if (!response || response.constructor.name === 'IncomingMessage') {
                    response = { status: 'success' }
                } else if (Array.isArray(response) && response.length > 0 && response[0].constructor.name === 'IncomingMessage') {
                    response = { status: 'success' }
                }
                sendResponse(response)
            }).catch((error) => {
                console.error(error)
                sendResponse({ status: 'error', error: error.message, stack: error.stack })
            })

    }

    function handleAction(options) {
        let player = options.player

        if (!actions[options.action]) {
            return Promise.reject({ error: 'action \'' + options.action + '\' not found' })
        }

        return actions[options.action](player, options.values)

    }

}

const sendResponse = body => {
    client.publish(`${MQTT_PREFIX}out`, JSON.stringify(body), { qos: 1 })
    console.log(body)
}
const tryLoadJson = require('sonos-http-api/lib/helpers/try-load-json')

function merge(target, source) {
    Object.keys(source).forEach((key) => {
        if ((Object.getPrototypeOf(source[key]) === Object.prototype) && (target[key] !== undefined)) {
            merge(target[key], source[key])
        } else {
            target[key] = source[key]
        }
    })
}

const settingsFileFullPath = path.resolve(__dirname + '/settings', 'settings.json')
const userSettings = tryLoadJson(settingsFileFullPath)
merge(settings, userSettings)

const api = new SonosMQTTAPI(discovery, settings)

const file = new nodeStatic.Server(settings.webroot)

http.createServer((request, response) =>
    request.addListener('end', () => file.serve(request, response)).resume()
).listen(API_PORT)

client.on('message', api.requestHandler)

module.exports = api