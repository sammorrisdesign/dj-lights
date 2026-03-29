// This script makes API requests to Discogs to fetch all release's in a user's connection
// It then downloads all album art + creates a releases json in the data folder
const Discogs = require('disconnect').Client;
const fs = require('fs');
const { Readable } = require('stream');
const { finished } = require('stream/promises');

const config = require("../config.json");

// fetch all releases from a discogs account
const fetchReleasesFromDiscogs = async (page = 1, responses = new Array) => {
  console.log(`🪩 Fetching from Discogs – page ${page}`);

  const collection = new Discogs().user().collection();
  const response = await collection.getReleases(config.discogs.username, 0, { page: page, per_page: 100 });

  // add recent response to array
  responses.push(response.releases);

  // if we have another page to fetch, let's fetch that before continuing
  // this will keep iterating throughout all available pages
  if (response.pagination.urls.next) {
    responses = await fetchReleasesFromDiscogs(page + 1, responses);
  }

  // return all responses;
  return responses.flat();
}

(async () => {
  // fetch all releases from a discogs account
  const releases = await fetchReleasesFromDiscogs();

  // create simple data object
  let data = new Array;
  for (const release of releases) {
    
    try {
      // download image, if it exists
      if (release.basic_information.cover_image) {
        console.log(`📔 Fetching album cover – ${release.basic_information.artists[0].name}'s ${release.basic_information.title}`);
        const image = fs.createWriteStream(`./data/covers/${release.id}.jpeg`);
        const { body } = await fetch(release.basic_information.cover_image);
        await finished(Readable.fromWeb(body).pipe(image));
      } else {
        console.log(`⛔️ Unable to fetch album cover – ${release.basic_information.artists[0].name}'s ${release.basic_information.title}`);
      }

      // push to data object
      data.push({
        id: release.id,
        artist: release.basic_information.artists[0].name,
        title: release.basic_information.title,
      });
    } catch (e) {
      console.log(release);
      console.log(e);
    }
  }

  fs.writeFileSync("data/releases.json", JSON.stringify(data, null, 2));
})();