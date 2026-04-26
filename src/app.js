import { spawn, spawnSync } from "child_process";
import InputEvent from "input-event";
import chroma from 'chroma-js';
import { pipeline, RawImage } from '@huggingface/transformers';
import config from "../config.json" with { type: 'json' };
import data from "../data/data.json" with { type: 'json' };
import alert from "./alert.js";

console.log('🎚️  Starting DJ Lights');

let state = {
  color: chroma([255, 255, 255]),
  rgb: [255, 255, 255],
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

const input = new InputEvent(config.input.device);
const keyboard = new InputEvent.Keyboard(input);

// event listeners for keyboard controls
keyboard.on('keypress', e => {
  if (e.code == config.input.mapping.capture) {
    takePhoto();
  }

  if (e.code == config.input.mapping.hue.up) {
    state.color = chroma(state.color).set('hsl.h', '+5');
    updateLights();
  }

  if (e.code == config.input.mapping.hue.down) {
    state.color = chroma(state.color).set('hsl.h', '-5');
    updateLights();
  }

  if (e.code == config.input.mapping.saturation.up) {
    state.color = chroma(state.color).set('hsl.s', '+0.1');
    updateLights();
  }

  if (e.code == config.input.mapping.saturation.down) {
    state.color = chroma(state.color).set('hsl.s', '-0.1');
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
  if (!color) {
    state.rgb = state.color.rgb();
  } else {
    state.rgb = color;
  }

  console.log(`🖍️  Setting lights to ${state.rgb}`);
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

  photoEmbedding.dispose();

  state.color = chroma(bestMatch.color);

  console.log(`🤖 Best Match is ${bestMatch.title} by ${bestMatch.artist}`);

  // alert(bestMatch);

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
