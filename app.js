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
  const colorArray = lights.array;

  for (let i = 0; i < lights.count; i++) {
    colorArray[i] = Number("0x" + color.replace('#', ''));
  }

  ws281x.render();

  setTimeout(() => {
    // ws281x.reset();
    // ws281x.finalize();
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

process.on('exit',() => {
  ws281x.finalize();
  console.log("process.exit() method is fired");
})
