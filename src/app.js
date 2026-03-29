import ws281x from 'rpi-ws281x-native';
import shell from "shelljs";
import Rainbow from 'rainbowvis.js';
import InputEvent from "input-event";
import { pipeline, RawImage } from '@xenova/transformers';
import config from "../config.json" with { type: 'json' };
import data from "../data/data.json" with { type: 'json' };

let state = {
  color: '#000000',
  brightness: 120,
  isOn: false
}

const lights = ws281x(config.lights.count, {
  gpio: config.lights.gpio,
  brightness: state.brightness
});

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

const extractor = await pipeline(
  'image-feature-extraction',
  config.model
);

// get color from an existing image. This can take ~5 seconds
const getColorFromImage = async(image) => {
  console.time("Getting color");

  const photo = await RawImage.read(`./capture.jpg`);
  let photoEmbedding = await extractor(photo, {
    pooling: 'mean',
    normalize: true
  });

  photoEmbedding = photoEmbedding.data;

  let bestMatch = null;
  let bestScore = -Infinity;

  for (const release of data) {
    const score = cosineSimilarity(photoEmbedding, release.embedding);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = `${embed.id} = ${embed.artist} – ${embed.title}`
    }
  }

  console.log(bestMatch);

  setLights(bestMatch.color);
  console.timeEnd("Getting color");
}

// set a different awb based on time of day (presuming overhead lights come on a certain time)
const getAWBBasedOnTimeOfDay = () => {
  const d = new Date();
  let hour = d.getHours();

  if (hour > 18) {
    return config.calibration.night;
  } else {
    return config.calibration.day;
  }
}

// take a photo with libcamera to be analysed
const takePhoto = () => {
  console.log('taking photo');
  console.time('taking photo');

  // Options from: https://www.raspberrypi.com/documentation/computers/camera_software.html#common-command-line-options
  shell.exec(`libcamera-jpeg --width ${config.sizes.width} --height ${config.sizes.height} --mode ${config.sizes.width}:${config.sizes.height} ${config.commands} --awb ${getAWBBasedOnTimeOfDay()} --output capture.jpg`)
  console.timeEnd('taking photo');

  getColorFromImage();
}

console.log('starting script');