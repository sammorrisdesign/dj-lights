<<<<<<< HEAD
const ws281x = require('rpi-ws281x-native');
=======
const pixel = require("node-pixel");
const PiCamera = require('pi-camera');
const five = require("johnny-five");
const Raspi = require("raspi-io").RaspiIO; 

let board = new five.Board({
  debug: true,
  io: new Raspi()
});
let strip = null;
>>>>>>> c2e74cc78b52946758dda4f07fffa45d9feb6654

const channel = ws281x(100, { stripType: 'ws2812' });

<<<<<<< HEAD
const colorArray = channel.array;
for (let i = 0; i < channel.count; i++) {
  colorArray[i] = 0xffcc22;
}

ws281x.render();
=======
const updateLights = () => {
  // take a photo
  camera.snapDataUrl()
    .then((result) => {
      // figure out way of getting colour from "result"
      // maybe 'color-thief' or 'fast-average-color'
      strip.color("rgb(0, 255, 0)");
      strip.show();
    })
    .catch((error) => {
       // Handle your error
    });
  
  // run again
  setTimeout(updateLights, 1000);
};

console.log('starting');
 
board.on("ready", function() {

console.log('ready');

  strip = new pixel.Strip({
    board: this,
    controller: "FIRMATA",
    strips: [ {pin: 6, length: 4}, ], // this is preferred form for definition
    gamma: 2.8, // set to a gamma that works nicely for WS2812
  });
 
  strip.on("ready", function() {
    strip.color("rgb(0, 255, 0)"); // sets strip to a blue-green color using a named colour
    strip.show(); 
    updateLights();  
  });
});
>>>>>>> c2e74cc78b52946758dda4f07fffa45d9feb6654
