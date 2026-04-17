from rpi5_ws2812.ws2812 import Color, WS2812SpiDriver
import time
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--r', dest='r', type=int, help='Red value of the colour you want')
parser.add_argument('--g', dest='g', type=int, help='Green value of the colour you want')
parser.add_argument('--b', dest='b', type=int, help='Blue value of the colour you want')
parser.add_argument('--count', dest='count', type=int, help='LED Count')
args = parser.parse_args()

print("hello")

if __name__ == "__main__":

    # Initialize the WS2812 strip with 100 leds and SPI channel 0, CE0
    strip = WS2812SpiDriver(spi_bus=0, spi_device=0, led_count=150).get_strip()
    while True:
        strip.set_all_pixels(Color(args.r, args.g, args.b))
        strip.show()

exit()