const ws281x = require('rpi-ws281x-native');
const getColors = require('get-image-colors');

// light config
const lightCount = 50;
const lights = ws281x(lightCount, { stripType: 'ws2812' });

// camera config
const PiCamera = require('pi-camera');
const camera = new PiCamera({
  mode: 'photo',
  width: 640,
  height: 480,
  nopreview: true,
});

const setLights = color => {
  console.log('setting lights to', color);
  const colorArray = lights.array;

  for (let i = 0; i < lights.count; i++) {
    colorArray[i] = 0xffcc22 // use color value here instead
  }

  ws281x.render();

  setTimeout(() => {
    takePhoto();
  }, 5000);
}

const takePhoto = () => {
  camera.snapDataUrl()
    .then((result) => {
      getColors(result, 'image/jpg').then(colors => {
        const colorsAsHSL = colors.map(color => color.hsl());

        let highSaturationIndex = null;

        colorsAsHSL.forEach((color, i) => {
          if (color[1] && !highSaturationIndex) {
            highSaturationIndex = i;
          }
        });

        const colorsAsHex = colors.map(color => color.hex());
        const colorToSet = highSaturationIndex ? colorsAsHex[highSaturationIndex] : colorsAsHex[0];

        setLights(colorToSet);
      }).catch((error) => {
        console.log(error);
      })
    })
    .catch((error) => {
      console.log(error);
    });
}

takePhoto();
