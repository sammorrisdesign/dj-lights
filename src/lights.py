from pi5neo import Pi5Neo
import time
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--r', dest='r', type=int, help='Red value of the colour you want')
parser.add_argument('--g', dest='g', type=int, help='Green value of the colour you want')
parser.add_argument('--b', dest='b', type=int, help='Blue value of the colour you want')
parser.add_argument('--brightness', dest='brightness', default=0.4, type=float, help='Brightness')
args = parser.parse_args()

with Pi5Neo('/dev/spidev0.0', num_leds=150, spi_speed_khz=800, quiet_mode=True) as neo:
    neo.fill_strip(args.r, args.g, args.b)
    neo.update_strip()
