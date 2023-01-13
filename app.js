const ws281x = require('rpi-ws281x-native');
const getColors = require('get-image-colors');
const shell = require('shelljs');
const fs = require('fs');

// light config
const lightCount = 150;
const lights = ws281x(lightCount, {
  dma: 10,
  freq: 800000,
  gpio: 21,
  invert: false,
  stripType: ws281x.stripType.WS2812,
  brightness: 80
});

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

    if (filteredColors.length) {
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
  shell.exec('libcamera-jpeg --output test.jpg --hdr --verbose 0 --roi 0.25,0,0.5,1 --width 1920 --height 2160 --saturation 1.2 -q 100 --autofocus-range macro');
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
