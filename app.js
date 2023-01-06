// const pixel = require("node-pixel");
const PiCamera = require('pi-camera');
const five = require("johnny-five");
 
let board = new five.Board();
let strip = null;

const camera = new PiCamera({
  mode: 'photo',
  width: 640,
  height: 480,
  nopreview: true,
});

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
 
board.on("ready", function() {
  // strip = new pixel.Strip({
  //   board: this,
  //   controller: "FIRMATA",
  //   strips: [ {pin: 6, length: 4}, ], // this is preferred form for definition
  //   gamma: 2.8, // set to a gamma that works nicely for WS2812
  // });

  // strip.on("ready", function() {
  //   strip.color("rgb(0, 255, 0)"); // sets strip to a blue-green color using a named colour
  //   strip.show(); 
  //   updateLights();  
  // });
});
