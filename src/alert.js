// This file is more of a helper that handles all the alerts
// Alerts are sent via a service called Pushover
import Pushover from "node-pushover";
import path from 'path';
import config from "../config.json" with { type: 'json' };

const push = new Pushover({
  token: config.pushover.app,
  user: config.pushover.user
});

const dirname = import.meta.dirname;

export default function alert(data) {
  push.send(config.pushover.user, data.title, data.artist, path.join(dirname, `../data/covers/${data.id}.jpeg`));
}