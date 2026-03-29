// This script loops through all covers and extracts data from them
// It saves this in extractions json
import { pipeline, RawImage } from '@xenova/transformers';
import fs from 'fs';

const extractor = await pipeline(
  'image-feature-extraction',
  'Xenova/clip-vit-base-patch32'
);

const extractImageData = async(release) => {
  try {
    console.log(`🛸 Extracting image data – ${release.artist}'s ${release.title}`);

    const file = await RawImage.read(`data/covers/${release.id}.jpeg`);
    const embedding = await extractor(file, {
      pooling: 'mean',
      normalize: true
    });

    return embedding.data;
  } catch (e) {
    console.log(release);
    console.log(e);
  }
}

(async() => {
  const releases = JSON.parse(fs.readFileSync("data/releases.json"));

  // loop through each release and extract embeddings from the image data
  let data = new Array;
  for (const release of releases) {
    const embedding = await extractImageData(release);

    if (embedding) {
      data.push({
        ...release,
        "embedding": [...embedding]
      });
    }
  }

  fs.writeFileSync("data/embedding.json", JSON.stringify(data, null, 2));
})();
