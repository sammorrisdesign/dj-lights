const ws281x = require('rpi-ws281x-native');
const getColors = require('get-image-colors');
const shell = require('shelljs');
const { createCanvas, loadImage } = require('canvas');
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

const rgb2Int = (rgb) => {
  return ((rgb[0] & 0xff) << 16) + ((rgb[1] & 0xff) << 8) + (rgb[2] & 0xff);
}

const setLights = color => {
  console.log('setting lights to', color);
  const colorArray = lights.array;
  console.log(color);
  color = rgb2Int(color);
  console.log(color);

  for (let i = 0; i < lights.count; i++) {
    colorArray[i] = color;
  }

  ws281x.render();

  setTimeout(() => {
    takePhoto();
  }, 5000);
}

const cleanImage = async() => {
  console.log('cleaning image');

  const canvas = createCanvas(1920, 2160)
  const ctx = canvas.getContext('2d');

  const image = await loadImage('./test.jpg');
  ctx.drawImage(image, 0, 0, 1920, 2160);

  ctx.rect(50, 800, 150, 250);
  ctx.rect(1050, 800, 250, 250);
  ctx.fill();

  const savedImage = canvas.toBuffer('image/jpeg', { quality: 1 });

  fs.writeFileSync('test.jpg', savedImage);

  getColorFromImage(savedImage);
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

      let colorToSet = filteredColors[0];

      // shift pinker reds towards red
      if (colorToSet.hsl()[0] > 340 || colorToSet.hsl()[0] < 5) {
        console.log(colorToSet.hsl());
        colorToSet = colorToSet.set('rgb.b', 0);
        colorToSet = colorToSet.set('rgb.g', 0);
      }

      // minimum brightness
      if (colorToSet.hsl()[2] < 0.5) {
        colorToSet = colorToSet.set('hsl.l', 0.5);
      }

      // don't oversaturate colors if we already have
      if (colorToSet.hsl()[1] > 0.5) {
        colorToSet = colorToSet.saturate(1);
      } else {
        colorToSet = colorToSet.saturate(2);
      }

      console.log('setting lights to', colorToSet.hex());
      setLights(colorToSet.rgb());
    } else {
      setLights([255,255,255]);
    }
  }).catch((error) => {
    console.log(error);
  })
}

const takePhoto = () => {
  // Options from: https://www.raspberrypi.com/documentation/computers/camera_software.html#common-command-line-options
  shell.exec('libcamera-jpeg --output test.jpg --hdr --verbose 0 --roi 0.25,0,0.5,1 --width 1920 --height 2160 -q 100 --autofocus-range macro --awb tungsten');

  cleanImage();
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
