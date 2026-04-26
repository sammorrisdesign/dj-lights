// This scripts gets colors from album covers
import { Vibrant } from "node-vibrant/node";
import chroma from "chroma-js";
import fs from "fs";
import releases from "../data/releases.json" with { type: 'json' };
import colors from "../data/colors.json" with { type: 'json' };

// loop through it and use node-vibrant to get colors from it

const getColorFromImage = async(id) => {
  console.log('getting color from photo');
  console.time('getting color');
  console.time('vibrant from');

  const v = new Vibrant(`./data/covers/${id}.jpeg`);
  const palette = await v.getPalette();

  console.timeEnd('vibrant from');

  const totalPopulation = Object.keys(palette).map(swatch => palette[swatch].population).reduce((a, b) => a + b, 0);
  const sortedPalette = Object.keys(palette).map(swatch => {
    return {
      type: swatch,
      color: chroma(palette[swatch].hex),
      coverage: (palette[swatch].population / totalPopulation) * 100
    }
  }).sort((a, b) => b.coverage - a.coverage);

  let swatch = sortedPalette[0];

  // pick vibrant unless another swatch has larger population
  if (swatch.coverage < 80 && swatch.type !== 'Vibrant') {
    const vibrantSwatch = sortedPalette.filter(swatch => swatch.type == 'Vibrant')[0];
    if (vibrantSwatch && vibrantSwatch.coverage > 3) {
      console.log(`prominent ${swatch.type} swatch (${swatch.color.hex()}) lacks coverage at ${Math.round(swatch.coverage)}%. Switching to Vibrant swatch (${vibrantSwatch.color.hex()})`);
      swatch = vibrantSwatch;
    }
  }

  // boost saturation
  if (swatch.type !== 'Vibrant') {
    console.log(`boosting saturation on ${swatch.type} swatch (${swatch.color.hex()})`);
    swatch.color = swatch.color.saturate(2);
  } else if (swatch.color.hsl()[1] < 40) {
    console.log(`boosting saturation on Vibrant swatch (${swatch.color.hex()}) as it is low`);
    swatch.color = swatch.color.saturate(2);
  }

  // if greenish hue push more towards green
  if (swatch.color.hsl()[0] > 140 && swatch.color.hsl()[0] < 160) {
    console.log(`tilting swatch (${swatch.color.hex()}) to green to avoid turquoise output`);

    swatch.color = swatch.color.set('rgb.b', '*0.25');
    swatch.color = swatch.color.set('rgb.g', '*1.5');
  }

  // tilt red to prevent reds looking pink
  if (swatch.color.hsl()[0] >= 345 || swatch.color.hsl()[0] < 13) {
    console.log(`tilting swatch (${swatch.color.hex()}) to red (${swatch.color.hsl()[0]} degrees of hue found) to avoid pink output`);

    swatch.color = swatch.color.set('rgb.r', '*2');
    swatch.color = swatch.color.set('rgb.b', '*0.25');
    swatch.color = swatch.color.set('rgb.g', '*0.25');
  }

  console.timeEnd('getting color');

  return swatch.color.hex();
}

(async() => {
  let data = new Array;
  for (const release of releases) {
    const isNew = !colors.some(color => color.id == release.id);

    if (isNew) {
      const color = await getColorFromImage(release.id);

      data.push({
        ...release,
        color,
        colorType: "solid"
      })
    }
  }

  data = data.concat(colors);

  fs.writeFileSync("./data/colors.json", JSON.stringify(data, null, 2));
})();