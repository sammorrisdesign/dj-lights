# DJ Lights
A node script for Raspberry Pis that lets a strip of WS281B LED lights to a prominent cover from the album art

# How does it work?
1. Takes a photo with a Raspberry Pi Camera Module 3 (Cheaper options output inconsistent colors). Given the lighting during the day and a night, the AWB (Automatic White Balance) that is applied changes based on time of day.
2. The image is loaded into a canvas. Here black squares are drawn over areas where lights reflect on the cover and cause glare. Leaving these in the photo causes the color algorithm to frequently pick up the glare instead of the color we want.
3. Using `node-vibrant`, we get a palette from the modified photo. This palette has named colors like `Vibrant` and `MutedLight`. We bias towards the `Vibrant` swatch unless it has a low percentage coverage of the image or another swatch has an incredible high percentage.
4. The colors are tweaked and boosted based on various conditions. For example: A color that is in the red hue will get boosted red and reduced green and blue values as a hex that looks red will be rendered pink on the LED strip. Another example is a general boost to saturation of a color so it pops more on the strip.
5. A final color is passed to a function that will fade the LED lights from either off to the color, or the previous color to newly picked one.
6. The script waits a few seconds before taking another photo and starting again.

# Requirements
- Node v16.13.1 to run the script
- `node-canvas` requirements...
`sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`
- Sudo access for `rpi-ws281x-native`

# Installation
Once you have the requirements running `npm i` will get you the dependencies

# Usage
Use `npm run start` to start the script
