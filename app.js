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

const updateLights = color => {
  color = Number("0x" + color.replace('#', ''));

  for (let i = 0; i < lights.count; i++) {
    lights.array[i] = color;
  }
}

const setLights = color => {
  console.log('setting lights to', color);

  updateLights();

  ws281x.render();

  setTimeout(() => {
    takePhoto();
  }, 2000);
}
const getColorFromImage = image => {
  console.log('getting color from photo');

  Vibrant.from(image)
    .quality(3)
    .getPalette()
    .then(palette => {
      const totalPopulation = Object.keys(palette).map(swatch => palette[swatch].population).reduce((a, b) => a + b, 0);
      const sortedPalette = Object.keys(palette).map(swatch => {
        return {
          type: swatch,
          color: chroma(palette[swatch].hex),
          hex: palette[swatch].hex,
          coverage: (palette[swatch].population / totalPopulation) * 100
        }
      }).sort((a, b) => b.coverage - a.coverage);

      let swatch = sortedPalette[0];

      // pick vibrant unless another swatch has larger population
      if (swatch.coverage < 60 && swatch.type !== 'Vibrant') {
        const vibrantSwatch = sortedPalette.filter(swatch => swatch.type == 'Vibrant')[0];
        if (vibrantSwatch && vibrantSwatch.coverage > 5) {
          console.log(`prominent ${swatch.type} swatch (${swatch.hex}) lacks coverage at ${Math.round(swatch.coverage)}%. Switching to Vibrant swatch (${vibrantSwatch.hex})`);
          swatch = vibrantSwatch;
        }
      }

      // boost saturation
      if (swatch.type !== 'Vibrant') {
        console.log(`boosting saturation on ${swatch.type} swatch (${swatch.hex})`);
        swatch.color = swatch.color.saturate(2);
      } else if (swatch.color.hsl()[1] < 40) {
        console.log(`boosting saturation on Vibrant swatch (${swatch.hex}) as it is low`);
        swatch.color = swatch.color.saturate(2);
      }

      // if greenish hue push more towards green
      if (swatch.color.hsl()[0] > 140 && swatch.color.hsl()[0] < 160) {
        console.log(`tilting swatch (${swatch.hex}) to green to avoid turquoise output`);

        swatch.color = swatch.color.set('rgb.b', '*0.25');
        swatch.color = swatch.color.set('rgb.g', '*1.5');
      }

      // tilt red to prevent reds looking pink
      if (swatch.color.hsl()[0] >= 345 || swatch.color.hsl()[0] < 13) {
        console.log(`tilting swatch (${swatch.hex}) to red (${swatch.color.hsl()[0]} degrees of hue found) to avoid pink output`);
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

const getAWBBasedOnTimeOfDay = () => {
  // ToDo: Can we get this in a better way? Maybe use the wall as a "gray card" to adjust outside of libcamera.
  // https://forums.raspberrypi.com/viewtopic.php?t=327943
  const d = new Date();
  let hour = d.getHours();

  if (hour > 18) {
    return 'tungsten'
  } else {
    return 'fluorescent'
  }
}

const takePhoto = () => {
  console.log('taking photo');
  const awb = getAWBBasedOnTimeOfDay();
  // Options from: https://www.raspberrypi.com/documentation/computers/camera_software.html#common-command-line-options
  shell.exec(`libcamera-jpeg --nopreview --hdr --verbose 0 --roi 0.25,0,0.5,1 --width 1920 --height 2160 -q 80 --autofocus-range macro --awb ${awb} --denoise cdn_hq --output test.jpg`);

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
