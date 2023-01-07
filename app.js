const ws281x = require('rpi-ws281x-native');

const lightCount = 50;
const channel = ws281x(lightCount, { stripType: 'ws2812' });

const setLights = color => {
  console.log('setting lights to', color);
  const colorArray = channel.array;

  for (let i = 0; i < channel.count; i++) {
    colorArray[i] = 0xffcc22 // use color value here instead
  }

  ws281x.render();
}

// setLights('red');

const PiCamera = require('pi-camera');
const myCamera = new PiCamera({
  mode: 'photo',
  output: `~/test.jpg`,
  width: 640,
  height: 480,
  nopreview: true,
});

myCamera.snap()
  .then((result) => {
    console.log('captured');
    // Your picture was captured
  })
  .catch((error) => {
     // Handle your error
  });
