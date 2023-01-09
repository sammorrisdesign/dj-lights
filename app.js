const ws281x = require('rpi-ws281x-native');
// const Raspistill = require('node-raspistill').Raspistill;
const libcamera = require('node-libcamera')
const getColors = require('get-image-colors');
const shell = require('shelljs');
const fs = require('fs');

// light config
const lightCount = 150;
const lights = ws281x(lightCount, {
  stripType: 'ws2812',
  brightness: 40
});

// camera config
// const naturalLight = {
//   awb: 'auto',
//   exposure: 'auto',
//   saturation: 20
// }

// const camera = new Raspistill({
//   outputDir: './',
//   width: 640,
//   height: 480,
//   quality: 100,
//   awb: 'auto',
//   exposure: 'auto',
//   saturation: 20
// });

const setLights = color => {
  console.log('setting lights to', color);
  const colorArray = lights.array;
  color = Number("0x" + color.replace('#', ''));

  for (let i = 0; i < lights.count; i++) {
    colorArray[i] = color;
  }

  ws281x.render();

  setTimeout(() => {
    takePhoto();
  }, 5000);
}

const getColorFromImage = image => {
  console.log('getting color from photo');

  getColors(image, {
    count: 5,
    type: 'image/jpg'
  }).then(colors => {
    const hexes = colors.map(color => color.hex());
    console.log(hexes);

    const colorsAsHSL = colors.map(color => color.hsl());
    console.log(colorsAsHSL);

    const filteredColors = colors.filter(color => color.hsl()[1] > 0.25);

    if (filteredColors) {
      console.log('chosen', filteredColors[0].hex());
      const colorToSet = filteredColors[0].saturate(3);
      setLights(colorToSet.hex());
    } else {
      setLights('#ffffff');
    }
  }).catch((error) => {
    console.log(error);
  })
}

const takePhoto = () => {

  shell.exec('libcamera-still --output test.jpg --width 640 --height 480 --verbose 1');

  const image = fs.readFileSync('test.jpg');

  getColorFromImage(image);
}

console.log('starting script');

takePhoto();

process.on('SIGINT', () => {
  ws281x.reset();
  ws281x.finalize();

  process.nextTick(() => {
    process.exit(0);
  });
});
