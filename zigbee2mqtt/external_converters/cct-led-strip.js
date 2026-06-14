const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const e = exposes.presets;
const ea = exposes.access;

// Fan mode values as set by ZigbeeFanControl on the ESP32
const fanModeToPattern = {0: 'solid', 1: 'wave', 2: 'breathe', 3: 'sparkle'};
const patternToFanMode = {solid: 0, wave: 1, breathe: 2, sparkle: 3};

module.exports = [
  {
    zigbeeModel: ['CCT-LED-Strip'],
    model: 'CCT-LED-Strip',
    vendor: 'DIY',
    description: 'DIY CCT LED strip with animations',
    fromZigbee: [
      fz.on_off,
      fz.brightness,
      fz.color_temperature,
      {
        cluster: 'hvacFanCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
          if (msg.data.hasOwnProperty('fanMode')) {
            return {pattern: fanModeToPattern[msg.data['fanMode']] ?? 'solid'};
          }
        },
      },
    ],
    toZigbee: [
      tz.light_on_off,
      tz.light_brightness,
      tz.light_color_temperature,
      {
        key: ['pattern'],
        convertSet: async (entity, key, value, meta) => {
          const mode = patternToFanMode[value] ?? 0;
          const endpoint = meta.device.getEndpoint(2);
          await endpoint.write('hvacFanCtrl', {fanMode: mode});
          return {state: {pattern: value}};
        },
        convertGet: async (entity, key, meta) => {
          const endpoint = meta.device.getEndpoint(2);
          await endpoint.read('hvacFanCtrl', ['fanMode']);
        },
      },
    ],
    exposes: [
      e.light().withBrightness().withColorTemperature(153, 500),
      exposes.enum('pattern', ea.ALL, ['solid', 'wave', 'breathe', 'sparkle'])
        .withDescription('Animation pattern'),
    ],
  },
];
