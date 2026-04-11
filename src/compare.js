// This script loops through all covers and extracts data from them
// It saves this in extractions json
import { pipeline, RawImage } from '@huggingface/transformers';
import embedding from "../data/embedding.json" with { type: 'json' };
import config from '../config.json' with { type: 'json' };

const extractor = await pipeline(
  'image-feature-extraction',
  config.model
);

const cosineSimilarity = (a,b) => {
  let dot = 0, normA = 0, normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

(async() => {
  const photo = await RawImage.read(`./capture.jpg`);
  let photoEmbedding = await extractor(photo, {
    pooling: 'mean',
    normalize: true
  });

  photoEmbedding = photoEmbedding.data;

  let bestMatch = null;
  let bestScore = -Infinity;

  for (const embed of embedding) {
    const score = cosineSimilarity(photoEmbedding, embed.embedding);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = embed;
    }
  }

  console.log(bestMatch.artist, bestMatch.title);
})();