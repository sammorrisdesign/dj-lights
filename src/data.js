// Combines the output of discogs, colors, and extract into one file
import fs from "fs";
import releases from "../data/releases.json" with { type: 'json' };
import colors from "../data/colors.json" with { type: 'json' };
import embedding from "../data/embedding.json" with { type: 'json' };

let data = new Array;
const ignoreList = [
  18542482, // R.A.P. Ferreira - Bob's Son (pure black cover throws it off) 
]

for (const release of releases) {
  const embeddingForRelease = embedding.find(embed => embed.id == release.id).embedding;
  const { color, colorType } = colors.find(color => color.id == release.id);

  if (!ignoreList.includes(release.id)) {
   data.push({
      ...release,
      embedding: embeddingForRelease,
      color,
      colorType
    });
  } else {
    console.log(`🫣 Ignoring ${release.title} – ${release.artist}`)
  }
}

fs.writeFileSync("data/data.json", JSON.stringify(data, null, 2));