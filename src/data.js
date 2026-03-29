// Combines the output of discogs, colors, and extract into one file
import fs from "fs";
import releases from "../data/releases.json" with { type: 'json' };
import colors from "../data/colors.json" with { type: 'json' };
import embedding from "../data/embedding.json" with { type: 'json' };

let data = new Array;

for (const release of releases) {
  const embeddingForRelease = embedding.find(embed => embed.id == release.id).embedding;
  const colorForRelease = colors.find(color => color.id == release.id).color;

  data.push({
    ...release,
    embedding: embeddingForRelease,
    color: colorForRelease
  });
}

fs.writeFileSync("data/data.json", JSON.stringify(data, null, 2));