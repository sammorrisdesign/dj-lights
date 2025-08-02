# DJ Lights
A node script for a Raspberry Pi that controls and sets the color of WS281B LED light strip based on prominent colors on album art.

![Six images in an animated gif showing the LED lights in action with different album covers](examples/examples.gif)

## Examples

I would estimate that this gets an accurate color from about 90% of covers. This often depends on the design of the cover. For example, The White Stripes' Elephant, Washed Out's Mister Mellow all have a prominent color that is easily picked up.

<img src="examples/example--white-stripes.jpg" style="width:320px;" alt="The White Stripes' Elephant produces a strong red" />
<img src="examples/example--washed-out.jpg" style="width:320px;" alt="Washed Out's Mister Mellow produces an orange-yellow" />

When presented with a cover with multiple colors vibrancy and coverage will take precedence. For example, Pearl and The Oyster's Coast 2 Coast resulting in a blue.

<img src="examples/example--pearl-and-the-oysters.jpg" style="width:320px;" alt="Pearl and The Oyster's Coast 2 Coast produces a blue" />

Vibrancy will beat out coverage if a majority of the cover is made up of more netural colors. For example, Madvillain will produce an orange based on the small square on the cover.

<img src="examples/example--madvillain.jpg" style="width:320px;" alt="Madvillain produces an orange" />

However, because of changes in environemental lighting, there is a threshold where a vibrant color won't get picked up. For example, the green on Talking Heads' Fear of Music won't be detected. Here the color was tweaked using an attached HID-device to match the green we'd want to see.

<img src="examples/example--talking-heads.jpg" style="width:320px;" alt="Talking Heads' Fear of Music produces a white but is tweaked to a more appropriate green" />

If there's no strong color detected in the photo, it will default to a white.

<img src="examples/example--lcd-soundsystem.jpg" style="width:320px;" alt="LCD Soundsystem's 45:33 produces a white" />

## How it Works
### Physical Setup
Lights are controlled by a combination of two inputs.
1. A Raspberry Pi Camera Module used to take a photo of the album art. The resulting photo is fed to `node-vibrant` to the prominent color to send to the lights
2. A mini-keyboard with a knob to manually tweak the color, take a photo, and turn on the lights on or off.

```mermaid
flowchart TD;
    A[DOIO KB03 Keyboard] -->|color tweaks, on/off, take photo| B(Raspberry Pi);
    B --> |sets the color| C(WS281B LED Strip);
    D[Camera Module 3] --> |photo for analysis| B;
```

### Camera process
An input from Keyboard triggers this flow...
1. Take a photo with a Raspberry Pi Camera Module 3 – cheaper options output inconsistent colors. Automatic White Balance is applied differently based on the time of day.
2. Image is loaded in a canvas. Black squares are drawn over recurring glare in my setup. This is done because this causes the color algorithm to pick up on the glare instead of the color we actually want.
3. Using `node-vibrant`, we get a palette from the photo. The returned palette has named colors like `Vibrant` and `MutedLight`. Bias towards the `Vibrant` swatch unless it has a low percentage coverage of the image or another swatch has an high percentage.
4. The colors are tweaked and boosted based on various conditions. For example: A color that is in the red hue will get boosted red and reduced green and blue values as a hex that looks red will be rendered pink on the LED strip.
5. A final color is passed to a function that will fade the LED lights to the color.

### Keyboard controls
A DOIO KB03 Keyboard allows for...
- Take a photo and start the camera process above
- Tweak the current hue
- Tweak the current saturation
- Turn the brightness up, down, or off


## Development
### Requirements
- Node v16.13.1 to run the script
- `node-canvas` requirements...
`sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`
- Sudo access for `rpi-ws281x-native`
- `pm2` to permanently keep the script running

### Installation
Once you have the requirements running `npm i` will get you the dependencies.

### Usage
Use `npm run start` to start the script on the Pi

`npm run kill` will stop the script and `npm run logs` will tail the logs while it's running.

There's also a `npm run connect` script which is just a shortcut to connect to the local Pi.

You can also run `npm run download` to download the last capture from the local Pi.

### Config
The config.json file lets you setup the light settings (number of LEDs and the GPIO it's plugged into on the Pi). It also lets you change the input device and what keys need to be pressed on the keyboard to control everything.

### Colour calibration
Color calibration on Pi cameras can be a bit of a pain. So, you can run `npm run test`, that will generate images for every available white balance setting that `libcamera` has. You can then download all generated images from the local Pi with `npm run downloadTest`. Then set the `calibration` in the config.