from pi5neo import Pi5Neo
import time
import argparse

print("lights")

parser = argparse.ArgumentParser()
parser.add_argument('--r', dest='r', type=int, help='Red value of the colour you want')
parser.add_argument('--g', dest='g', type=int, help='Green value of the colour you want')
parser.add_argument('--b', dest='b', type=int, help='Blue value of the colour you want')
args = parser.parse_args()

neo = Pi5Neo('/dev/spidev0.0', num_leds=150, spi_speed_khz=800)
neo.fill_strip(args.r, args.g, args.b)   # Red
neo.update_strip()
