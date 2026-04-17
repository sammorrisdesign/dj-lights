import shell from "shelljs";
import Rainbow from 'rainbowvis.js';
import InputEvent from "input-event";
import chroma from 'chroma-js';
import { pipeline, RawImage } from '@huggingface/transformers';
import config from "../config.json" with { type: 'json' };
import data from "../data/data.json" with { type: 'json' };
import alert from "./alert.js";

console.log('starting app');

let state = {
  color: [255, 255, 255],
  brightness: 120,
  isOn: false
}

ws281x.configure({
  leds: config.lights.count,
  gpionum: config.lights.gpio,
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
    state.color = chroma(state.color).set('hsl.h', '+5').rgb();
    updateLights();
  }

  if (e.code == config.input.mapping.hue.down) {
    state.color = chroma(state.color).set('hsl.h', '-5').rgb();
    updateLights();
  }

  if (e.code == config.input.mapping.saturation.up) {
    state.color = chroma(state.color).set('hsl.s', '+0.1').rgb();
    updateLights();
  }

  if (e.code == config.input.mapping.saturation.down) {
    state.color = chroma(state.color).set('hsl.s', '-0.1').rgb();
    updateLights();
  }

  if (e.code == config.input.mapping.brightness.down) {
    state.brightness = Math.max(0, state.brightness - 0.1);
    updateLights();
  }

  if (e.code == config.input.mapping.brightness.up) {
    state.brightness = Math.min(1, state.brightness + 0.1);
    updateLights();
  }

  if (e.code == config.input.mapping.lights) {
    if (state.isOn) {
      updateLights([0, 0, 0]);
      state.isOn = false;
    } else {
      updateLights();
      state.isOn = true;
    }
  }
});

// change colour of the lights
const updateLights = (color = null) => {
  console.log(color);

    shell.exec(`python src/lights.py --r ${color[0]} --g ${color[1]} --b ${color[2]} --brightness ${state.brightness}`)
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
  config.model,
  {
    dtype: 'fp8'
  }
);

const cosineSimilarity = (a,b) => {
  let dot = 0, normA = 0, normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// get color from an existing image. This can take ~5 seconds
const getColorFromImage = async() => {
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
      bestMatch = release;
    }
  }

  console.log(bestMatch);
  alert(bestMatch);
  setLights(bestMatch.color);
  console.timeEnd("Getting color");
}

// take a photo with libcamera to be analysed
const takePhoto = () => {
  console.log('taking photo');
  console.time('taking photo');

  // Options from: https://www.raspberrypi.com/documentation/computers/camera_software.html#common-command-line-options
  shell.exec(`rpicam-jpeg --width 1920 --height 1080 --nopreview -t 10 --immediate --shutter 600000 --gain 1.0 --lens-position 10 --verbose 0 --output capture.jpg`)

  console.timeEnd('taking photo');

  getColorFromImage();
}

console.log('starting script');

takePhoto();