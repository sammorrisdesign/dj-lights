const ws281x = require('rpi-ws281x-native');

const channel = ws281x(100, { stripType: 'ws2812' });

const colorArray = channel.array;
for (let i = 0; i < channel.count; i++) {
  colorArray[i] = 0xffcc22;
}

ws281x.render();