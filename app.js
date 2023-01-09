const ws281x = require('rpi-ws281x-native');
const getColors = require('get-image-colors');
const shell = require('shelljs');
const fs = require('fs');

// light config
const lightCount = 150;
const lights = ws281x(lightCount, {
  dma: 10,
  freq: 800000,
  gpio: 18,
  invert: false,
  stripType: ws281x.stripType.WS2812,
  brightness: 40
});

setLights("#11CBF9");

console.log(lights);

const setLights = color => {
  console.log('setting lights to', color);
  const colorArray = lights.array;
  color = Number("0x" + color.replace('#', ''));

  console.log(color);

  for (let i = 0; i < lights.count; i++) {
    colorArray[i] = color;
  }

  ws281x.render();

  console.log(ws281x);

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

// takePhoto();

process.on('SIGINT', () => {
  ws281x.reset();
  ws281x.finalize();

  process.nextTick(() => {
    process.exit(0);
  });
});
