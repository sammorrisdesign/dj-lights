const { createCanvas, loadImage } = require('canvas');
const ws281x = require('rpi-ws281x-native');
const shell = require('shelljs');
const fs = require('fs');
const Vibrant = require('node-vibrant');
const chroma = require('chroma-js');

// light config
const lightCount = 150;
const lights = ws281x(lightCount, {
  gpio: 21,
  brightness: 120
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
  }, 2000);
}
const getColorFromImage = image => {
  console.log('getting color from photo');

  Vibrant.from(image)
    .quality(1)
    .maxColorCount(10)
    .getPalette()
    .then(palette => {
      const sortedPalette = Object.keys(palette).map(swatch => {
        return {
          type: swatch,
          color: chroma(palette[swatch].hex),
          hex: palette[swatch].hex,
          population: palette[swatch].population
        }
      }).sort((a, b) => b.population - a.population);

      console.log(sortedPalette);

      let swatch = sortedPalette[0];

      // boost saturation
      if (swatch.type !== 'Vibrant') {
        console.log('boosting saturation on non-vibrant swatch');
        swatch.color = swatch.color.saturate(2);
      }

      // tilt red to prevent reds looking pink
      if (swatch.color.hsl()[0] >= 350 || swatch.color.hsl() < 5) {
        console.log('tilting color to red to avoid pink output');
        swatch.color = chroma('rgb(255, 0, 0)');
      }

      setLights(swatch.color.hex());
    });
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

const takePhoto = () => {
  console.log('taking photo');
  // Options from: https://www.raspberrypi.com/documentation/computers/camera_software.html#common-command-line-options
  shell.exec('libcamera-jpeg --nopreview --output test.jpg --hdr --verbose 0 --roi 0.25,0,0.5,1 --width 1920 --height 2160 -q 100 --autofocus-range macro --awb tungsten');

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
