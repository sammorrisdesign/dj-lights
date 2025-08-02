const { createCanvas, loadImage } = require('canvas');
const ws281x = require('rpi-ws281x-native');
const shell = require('shelljs');
const chroma = require('chroma-js');
const fs = require('fs');
const Vibrant = require('node-vibrant');
const Rainbow = require('rainbowvis.js');
const InputEvent = require('input-event');
const config = require('./config.json');

let state = {
  color: '#000000',
  brightness: 120,
  isOn: false
}

const lights = ws281x(config.lights.count, {
  gpio: config.lights.gpio,
  brightness: state.brightness
});

const cameraCommands = "--immediate --timeout 500 --nopreview --hdr --verbose 0 --roi 0.25,0,0.5,1 -q 80 --autofocus-range macro --autofocus-speed fast";

const input = new InputEvent(config.input.device);
const keyboard = new InputEvent.Keyboard(input);

// event listeners for keyboard controls
keyboard.on('keypress', e => {
  if (e.code == config.input.mapping.capture) {
    takePhoto();
  }

  if (e.code == config.input.mapping.hue.up) {
    state.color = chroma(state.color).set('hsl.h', '+5').hex();
    updateLights();
  }

  if (e.code == config.input.mapping.hue.down) {
    state.color = chroma(state.color).set('hsl.h', '-5').hex();
    updateLights();
  }

  if (e.code == config.input.mapping.saturation.up) {
    state.color = chroma(state.color).set('hsl.s', '+0.1').hex();
    updateLights();
  }

  if (e.code == config.input.mapping.saturation.down) {
    state.color = chroma(state.color).set('hsl.s', '-0.1').hex();
    updateLights();
  }

  if (e.code == config.input.mapping.brightness.down) {
    state.brightness = Math.max(0, state.brightness - 10);
    updateLights();
  }

  if (e.code == config.input.mapping.brightness.up) {
    state.brightness = Math.min(200, state.brightness + 10);
    updateLights();
  }

  if (e.code == config.input.mapping.lights) {
    if (state.isOn) {
      updateLights('#000000');
      state.isOn = false;
    } else {
      updateLights();
      state.isOn = true;
    }
  }
});

// change colour of the lights
const updateLights = (color = null) => {
  color = color ? color : state.color;
  color = Number("0x" + color.replace('#', ''));
  state.isOn = true;

  for (let i = 0; i < lights.count; i++) {
    lights.array[i] = color;
  }

  lights.brightness = state.brightness;

  ws281x.render();
}

// fade color of the lights (used only for changing color on photos, not for manual color changes)
const setLights = (color) => {
  console.log('setting lights to', color);

  const colors = new Rainbow();
  colors.setNumberRange(0, 20);
  colors.setSpectrum(state.color, color);
  state.color = color;

  let tick = 0;

  while (tick < 21) {
    updateLights(colors.colourAt(tick));
    tick++;
  }
}

// get color from an existing image. This can take ~5 seconds
const getColorFromImage = image => {
  console.log('getting color from photo');
  console.time('getting color');
  console.time('vibrant from');

  Vibrant.from(image)
    .getPalette()
    .then(palette => {
      console.timeEnd('vibrant from');

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

// draw blocks over image for areas where glare disort the cover
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

// set a different awb based on time of day (presuming lights come on a certain time)
const getAWBBasedOnTimeOfDay = () => {
  const d = new Date();
  let hour = d.getHours();

  if (hour > 17) {
    return 'fluorescent'
  } else {
    return 'cloudy'
  }
}

// take a photo with libcamera to be analysed
const takePhoto = () => {
  console.log('taking photo');
  console.time('taking photo');

  // Options from: https://www.raspberrypi.com/documentation/computers/camera_software.html#common-command-line-options
  shell.exec(`libcamera-jpeg ${cameraCommands} --width 1920 --height 2160 --awb ${getAWBBasedOnTimeOfDay()} --rawfull --output capture.jpg`)
  console.timeEnd('taking photo');

  cleanImage();
}

console.log('starting script');
