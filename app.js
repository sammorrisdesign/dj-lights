const ws281x = require('rpi-ws281x-native');
const Raspistill = require('node-raspistill').Raspistill;
const getColors = require('get-image-colors');

// light config
const lightCount = 150;
const lights = ws281x(lightCount, {
  stripType: 'ws2812',
  brightness: 20
});

// camera config
const camera = new Raspistill({
  outputDir: './',
  width: 640,
  height: 480,
  saturation: 10,
  quality: 100,
  drc: 'high'
});

const setLights = color => {
  console.log('setting lights to', color);
  const colorArray = lights.array;
  color = Number("0x" + color.replace('#', ''));
  console.log(color);

  for (let i = 0; i < lights.count; i++) {
    colorArray[i] = color;
  }

  ws281x.render();

  setTimeout(() => {
    takePhoto();
  }, 5000);
}

const takePhoto = () => {
  camera.takePhoto('latest')
    .then((result) => {
      getColors(result, 'image/jpg').then(colors => {
        const colorsAsHSL = colors.map(color => color.hsl());

        let highSaturationIndex = null;

        colorsAsHSL.forEach((color, i) => {
          if (color[1] && !highSaturationIndex) {
            highSaturationIndex = i;
          }
        });

        let colorToSet = highSaturationIndex ? colors[highSaturationIndex] : colors[0];

        colorToSet = colorToSet.saturate(3);

        setLights(colorToSet.hex());
      }).catch((error) => {
        console.log(error);
      })
    })
    .catch((error) => {
      console.log(error);
    });
}

takePhoto();

process.on('SIGINT', () => {
  ws281x.reset();
  ws281x.finalize();

  process.nextTick(() => {
    process.exit(0);
  });
});
