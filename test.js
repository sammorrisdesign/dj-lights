// generates photos at different awb values you can calibrate lighting
const config = require('./config.json');
const shell = require('shelljs');

// taken from https://www.raspberrypi.com/documentation/computers/camera_software.html#awb
const awbs = ["auto", "incandescent", "tungsten", "fluorescent", "indoor", "daylight", "cloudy"];
// const awbs = ["auto"];

for (const awb of awbs) {
  console.log('taking photo for', awb);
  console.time('taking photo');
  shell.exec(`libcamera-jpeg --width ${config.sizes.width} --height ${config.sizes.height} --mode ${config.sizes.width}:${config.sizes.height} ${config.commands} --awb ${awb} --output capture--${awb}.jpg`)
  console.timeEnd('taking photo');
}

