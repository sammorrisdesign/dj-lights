const { createCanvas, loadImage } = require('canvas');
const ws281x = require('rpi-ws281x-native');
const shell = require('shelljs');
const chroma = require('chroma-js');
const fs = require('fs');
const Vibrant = require('node-vibrant');
const Rainbow = require('rainbowvis.js');

// light config
const lightCount = 150;
const lights = ws281x(lightCount, {
  gpio: 21,
  brightness: 120
});

// const cameraCommands = "--immediate --timeout 500 --nopreview --hdr --verbose 0 --roi 0.25,0,0.5,1 -q 80 --autofocus-range macro --autofocus-speed fast";

const cameraCommands = "--immediate --timeout 500 --nopreview --verbose 0 --roi 0.25,0,0.5,1 -q 80 --autofocus-range macro --autofocus-speed fast";

let awb;
let existingColor = '#000000';

const updateLights = color => {
  color = Number("0x" + color.replace('#', ''));

  for (let i = 0; i < lights.count; i++) {
    lights.array[i] = color;
  }

  ws281x.render();
}

const setLights = (color, isRepeating = true) => {
  console.log('setting lights to', color);

  const colors = new Rainbow();
  colors.setSpectrum(existingColor, color);
  let tick = 0;

  while (tick < 101) {
    updateLights(colors.colourAt(tick));
    tick++;
  }

  existingColor = color;

  if (isRepeating) {
    setTimeout(() => {
      takePhoto();
    }, 2000);
  } else {
    ws281x.reset();
    ws281x.finalize();
  }
}
const getColorFromImage = image => {
  console.log('getting color from photo');

  console.time('getting color');

  Vibrant.from(image)
    .getPalette()
    .then(palette => {
      const totalPopulation = Object.keys(palette).map(swatch => palette[swatch].population).reduce((a, b) => a + b, 0);
      const sortedPalette = Object.keys(palette).map(swatch => {
        return {
          type: swatch,
          color: chroma(palette[swatch].hex),
          coverage: (palette[swatch].population / totalPopulation) * 100
        }
      }).sort((a, b) => b.coverage - a.coverage);

      let swatch = sortedPalette[0];

      console.log(sortedPalette);

      // pick vibrant unless another swatch has larger population
      if (swatch.coverage < 80 && swatch.type !== 'Vibrant') {
        const vibrantSwatch = sortedPalette.filter(swatch => swatch.type == 'Vibrant')[0];
        if (vibrantSwatch && vibrantSwatch.coverage > 3) {
          console.log(`prominent ${swatch.type} swatch (${swatch.color.hex()}) lacks coverage at ${Math.round(swatch.coverage)}%. Switching to Vibrant swatch (${vibrantSwatch.color.hex()})`);
          swatch = vibrantSwatch;
        }
      }

      // boost saturation
      if (swatch.type !== 'Vibrant') {
        console.log(`boosting saturation on ${swatch.type} swatch (${swatch.color.hex()})`);
        swatch.color = swatch.color.saturate(2);
      } else if (swatch.color.hsl()[1] < 40) {
        console.log(`boosting saturation on Vibrant swatch (${swatch.color.hex()}) as it is low`);
        swatch.color = swatch.color.saturate(2);
      }

      // if greenish hue push more towards green
      if (swatch.color.hsl()[0] > 140 && swatch.color.hsl()[0] < 160) {
        console.log(`tilting swatch (${swatch.color.hex()}) to green to avoid turquoise output`);

        swatch.color = swatch.color.set('rgb.b', '*0.25');
        swatch.color = swatch.color.set('rgb.g', '*1.5');
      }

      // tilt red to prevent reds looking pink
      if (swatch.color.hsl()[0] >= 345 || swatch.color.hsl()[0] < 13) {
        console.log(`tilting swatch (${swatch.color.hex()}) to red (${swatch.color.hsl()[0]} degrees of hue found) to avoid pink output`);

        swatch.color = swatch.color.set('rgb.r', '*2');
        swatch.color = swatch.color.set('rgb.b', '*0.25');
        swatch.color = swatch.color.set('rgb.g', '*0.25');
      }

      console.timeEnd('getting color');

      setLights(swatch.color.hex());
    });
}

const cleanImage = async() => {
  console.log('cleaning image');

  const canvas = createCanvas(1920, 2160)
  const ctx = canvas.getContext('2d');

  const image = await loadImage('./capture.jpg');
  ctx.drawImage(image, 0, 0, 1920, 2160);

  ctx.rect(50, 800, 150, 250);
  ctx.rect(1050, 800, 250, 250);
  ctx.fill();

  const savedImage = canvas.toBuffer('image/jpeg', { quality: 1 });

  fs.writeFileSync('capture.jpg', savedImage);

  getColorFromImage(savedImage);
}

const getAWBBasedOnTimeOfDay = () => {
  // ToDo: Can we get this in a better way? Maybe use the wall as a "gray card" to adjust outside of libcamera.
  // https://forums.raspberrypi.com/viewtopic.php?t=327943

  let redgain = 1;
  let bluegain = 1;

  console.time('calibrating awb');
  shell.exec(`libcamera-jpeg ${cameraCommands} --width 160 --height 180 --awbgains ${redgain},${bluegain} --output test.jpg`);
  console.timeEnd('calibrating awb');

  takePhoto();
}

const takePhoto = () => {
  console.log('taking photo using');
  console.time('taking photo');

  // Options from: https://www.raspberrypi.com/documentation/computers/camera_software.html#common-command-line-options
  shell.exec(`libcamera-jpeg ${cameraCommands} --width 1920 --height 2160 --awbgains ${awb} --rawfull --output capture.jpg`)

  console.timeEnd('taking photo');

  cleanImage();
}

console.log('starting script');

getAWBBasedOnTimeOfDay();


// takePhoto();

process.on('SIGINT', () => {
  console.log('stopping script');
  setLights('#000000');

  process.nextTick(() => {
    process.exit(0);
  });
});
