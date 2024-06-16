const mqtt = require('mqtt');
const config = require('config');
const fs = require('fs');
const EventEmitter = require('events');
const { logger } = require('./common');

// load configs
const gatewayId = config.get('mqtt.gatewayId');
const host = config.get('mqtt.host');
const port = config.get('mqtt.port');
const certPath = config.get('mqtt.authentication.certPath');
const keyPath = config.get('mqtt.authentication.keyPath');

class MqttClient extends EventEmitter {

    constructor() {
        super();

        var options = {
            host: host,
            port: port,
            protocol: 'mqtts',
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath),
            rejectUnauthorized: false
        }

        this.client = mqtt.connect(options);
        this.client.on('connect', () => {
            this._onConnect();
        });
        this.client.on('error', (error) => {
            logger.log('error', 'Could not connect: ' + error.message);
        });
    }

    _onConnect() {
        logger.log('info', 'Client connected');

        this.client.on('message', (topic, message) => this._onMessage(topic, message));

        this.client.on('error', function (error) {
            logger.log('error', error);
        });
    };

    _onMessage(topic, message) {
        logger.log('info', `Received message on topic ${topic}: ${message}`);
    }

    publishMessage(messageJson) {
        for (const objectId in messageJson) {
            if (messageJson.hasOwnProperty(objectId)) {
                const object = messageJson[objectId];
                const devName = object.devName || gatewayId;
                const valueName = object.valuename || object.name; // Используем valuename, если он есть
                const topic = `/devices/${devName}/controls/${valueName}`;
                const value = object.value !== undefined ? object.value.toString() : 'undefined'; // Проверка на undefined

                logger.log('info', `Publishing message to MQTT Broker: ${topic} ${value}`);
                this.client.publish(topic, value);
            }
        }
    }
}

module.exports = { MqttClient };
