from rpi5_ws2812.ws2812 import Color, WS2812SpiDriver
import sys
import json

# Initialize the WS2812 strip with 100 leds and SPI channel 0, CE0
strip = WS2812SpiDriver(spi_bus=0, spi_device=0, led_count=150).get_strip()

# Set color
def set_lights(state):
  strip.set_all_pixels(Color(state["rgb"][0], state["rgb"][1], state["rgb"][2]))
  strip.set_brightness(state["brightness"])
  strip.show()

# Watches for input values
for line in sys.stdin:
    # read input and convert to dict
    state = json.loads(line.strip())

    # pass through to the lights
    set_lights(state)
