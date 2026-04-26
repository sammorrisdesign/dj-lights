import { spawn, spawnSync } from "child_process";
import InputEvent from "input-event";
import chroma from 'chroma-js';
import { pipeline, RawImage } from '@huggingface/transformers';
import config from "../config.json" with { type: 'json' };
import data from "../data/data.json" with { type: 'json' };
import alert from "./alert.js";

console.log('🎚️  Starting DJ Lights');

let state = {
  colorType: "solid",
  colors: new Array(144).fill([255, 255, 255]),
  brightness: 1,
  isOn: true
}

// Setup the lights python event
let lights = spawn('python3', ['-u', 'src/lights.py'], {
  stdio: 'pipe' 
});

// Returns console logs from Python
lights.stdout.on('data', (data) => {
  console.log(`🐍 ${data.toString()}`);
});


lights.stderr.on('data', (data) => {
  console.log(`⛔️ ${data.toString()}`);
});

const input = new InputEvent(config.input.device);
const keyboard = new InputEvent.Keyboard(input);

// event listeners for keyboard controls
keyboard.on('keypress', e => {
  if (e.code == config.input.mapping.capture) {
    takePhoto();
  }

  if (e.code == config.input.mapping.hue.up) {
    const colorToSet = chroma(state.colors[0]).set('hsl.h', '+5');
    state.colors = generateSolidLightsFromColor(colorToSet.rgb());
    state.colorType = "solid";
    updateLights();
  }

  if (e.code == config.input.mapping.hue.down) {
    const colorToSet = chroma(state.colors[0]).set('hsl.h', '-5');
    state.colors = generateSolidLightsFromColor(colorToSet.rgb());
    state.colorType = "solid";
    updateLights();
  }

  if (e.code == config.input.mapping.saturation.up) {
    const colorToSet = chroma(state.colors[0]).set('hsl.s', '+0.1');
    state.colors = generateSolidLightsFromColor(colorToSet.rgb());
    state.colorType = "solid";
    updateLights();
  }

  if (e.code == config.input.mapping.saturation.down) {
    const colorToSet = chroma(state.colors[0]).set('hsl.s', '-0.1');
    state.colors = generateSolidLightsFromColor(colorToSet.rgb());
    state.colorType = "solid";
    updateLights();
  }

  if (e.code == config.input.mapping.brightness.down) {
    state.brightness = Math.max(0, parseFloat((state.brightness - 0.1).toFixed(1)));
    updateLights();
  }

  if (e.code == config.input.mapping.brightness.up) {
    state.brightness = Math.min(1, parseFloat((state.brightness + 0.1).toFixed(1)));
    updateLights();
  }

  if (e.code == config.input.mapping.lights) {
    if (state.isOn) {
      state.isOn = false;
      updateLights();
    } else {
      state.isOn = true;
      updateLights();
    }
  }
});

const generateSolidLightsFromColor = (rgb) => {
  return new Array(144).fill(rgb)
}

const generateGradientedLightsFromColors = (colors) => {
  const gradient = chroma.scale(colors).domain([0, 144]);
  const colorsToReturn = Array.from({ length: 144 }, (_, i) => {
    return gradient(i).rgb();
  });

  return colorsToReturn
}

const generateSectionedLightsFromColors = (colors) => {
  const sections = colors.length;
  const sectionLength = Math.ceil(144 / sections);

  const colorsToReturn = Array.from({ length: 144 }, (_, i) => {
    const currentSection = Math.floor(i / sectionLength);
    return colors[currentSection];
  });

  return colorsToReturn
}

// change colour of the lights
const updateLights = () => {
  console.log(`🖍️  Setting lights: ${state.colorType == "solid" ? `solid rgb(${state.colors[0]})` : state.colorType}`);
  lights.stdin.write(JSON.stringify(state) + '\n');
}

const extractor = await pipeline(
  'image-feature-extraction',
  config.model, {
    dtype: 'fp16',
    device: 'cpu'
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

  let bestMatch = null;
  let bestScore = -Infinity;

  for (const release of data) {
    const score = cosineSimilarity(photoEmbedding.data, release.embedding);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = release;
    }
  }

  bestMatch = data.find(release => release.id == 35526118);

  photoEmbedding.dispose();

  if (bestMatch.colorType == "solid") {
    state.colors = generateSolidLightsFromColor(bestMatch.color)
  } else if (bestMatch.colorType == "gradient") {
    state.colors = generateGradientedLightsFromColors(bestMatch.color)
  } else if (bestMatch.colorType == "sections") {
    state.colors = generateSectionedLightsFromColors(bestMatch.color);
  }

  state.colorType = bestMatch.colorType;

  console.log(`🤖 Best Match is ${bestMatch.title} by ${bestMatch.artist}`);

  updateLights();
}

// take a photo with libcamera to be analysed
const takePhoto = () => {
  console.time('📸 Taking photo');

  // Options from: https://www.raspberrypi.com/documentation/computers/camera_software.html#common-command-line-options
  spawnSync('rpicam-still', ['--nopreview', '--width', 1920, '--height', 1080, '--roi', '0.1,0.2,0.9,0.8', '--verbose', '0', '--zsl', '-t', '100', '-o', 'capture.jpg']);

  console.timeEnd('📸 Taking photo');

  getColorFromImage();
}

takePhoto();
