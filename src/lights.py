from rpi5_ws2812.ws2812 import Color, WS2812SpiDriver
import sys
import json

# Initialize the WS2812 strip with 100 leds and SPI channel 0, CE0
strip = WS2812SpiDriver(spi_bus=0, spi_device=0, led_count=150).get_strip()

# Set color
def set_lights(r, g, b):
  strip.set_all_pixels(Color(r, g, b))
  strip.show()

# Watches for input values
for line in sys.stdin:
    # read input and convert to dict
    color = json.loads(line.strip())

    # pass through to the lights
    set_lights(color[0], color[1], color[2])
