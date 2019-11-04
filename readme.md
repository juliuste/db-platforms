# db-platforms

Deutsche Bahn perron (platform) and track information, enriched (by crowdsourcing) with OSM data.

You're invited to help, see the [definitions](#definitions), [data structure](#data-structure) and [contributing](#contributing) sections!

Using [this original dataset](https://data.deutschebahn.com/dataset/data-bahnsteig) provided by [Deutsche Bahn](https://www.bahn.de).

[![npm version](https://img.shields.io/npm/v/db-platforms.svg)](https://www.npmjs.com/package/db-platforms)
[![Build Status](https://travis-ci.org/juliuste/db-platforms.svg?branch=master)](https://travis-ci.org/juliuste/db-platforms)
[![Greenkeeper badge](https://badges.greenkeeper.io/juliuste/db-platforms.svg)](https://greenkeeper.io/)
[![dependency status](https://img.shields.io/david/juliuste/db-platforms.svg)](https://david-dm.org/juliuste/db-platforms)
[![license](https://img.shields.io/github/license/juliuste/db-platforms.svg?style=flat)](license)
[![chat on gitter](https://badges.gitter.im/juliuste.svg)](https://gitter.im/juliuste)

## Definitions

Since the word *platform* is ambiguous in the English language (some people use it refering to the tracks at which trains depart while some people think of it as the place where you wait for your train, see also [here](https://en.wikipedia.org/wiki/Railway_platform#Identification)), we use the following terms:

| term | definition | 🇫🇷 | 🇵🇱 | 🇩🇪 |
| ---- | ---------- | -- | -- | -- |
| **perron** | The area where you wait for your train, right next to the tracks | quai | peron | Bahnsteig |
| **track** | Tracks (their numbers) are usually announced via speakers or visible on a departure board. There are often two tracks at one perron. | voie | tor | Gleis |

## Installation and Usage

If you're using `JavaScript`, you can use the package by installing:

```bash
npm install db-platforms
```

```js
const { tracks, perrons } = require('db-platforms')
```

`tracks` and `perrons` are arrays of objects which look as follows:

### `perrons`

```js
[
	{
		"type": "perron",
		"id": "8011674:B01",
		"name": "B01",
		"station": "8011674", // station id, see the `db-stations` module
		"length": "99",
		"height": "28",
		"osm": { // contributed osm data
			"type": "way",
			"id": "378453650"
		}
	},
	{
		"type": "perron",
		"id": "8011678:B01",
		"name": "B01",
		"station": "8011678",
		"length": "147",
		"height": "38"
	},
	{
		"type": "perron",
		"id": "8011678:B02",
		"name": "B02",
		"station": "8011678",
		"length": "212",
		"height": "55"
	},
	// …
]
```

### `tracks`

```js
[
	{
		"type": "track",
		"id": "8011674:B01:1",
		"name": "1",
		"longName": "Gleis 1",
		"station": "8011674",
		"perron": "8011674:B01",
		"osm": {
			"type": "node",
			"id": "5213148680"
		}
	},
	{
		"type": "track",
		"id": "8011678:B01:1",
		"name": "1",
		"longName": "Gleis 1",
		"station": "8011678",
		"perron": "8011678:B01"
	},
	{
		"type": "track",
		"id": "8011678:B02:2",
		"name": "2",
		"longName": "Gleis 2",
		"station": "8011678",
		"perron": "8011678:B02"
	},
	// …
]
```

## Data structure

We aim to associate the following OpenStreetMap entities with our elements

| type | association |
| ---- | ----------- |
| `track` | Point *on* a metal rail, mapped in OSM as a node with attribute `public_transport=stop_position`, sometimes has an attribute `ref` or `local_ref` containing the track number |
| `perron` | Perron area close to the rail, mapped in OSM as a way or relation (MultiPolygon) with attribute `public_transport=platform` or `railway=platform`, sometimes has an attribute `ref` containing the numbers of adjacent tracks |

OpenStreetMap associations are stored in `osm.ndjson`, an [ndjson](http://ndjson.org/) file which contains one record per row. All records are objects with the following keys (required).

| key name | description | example |
| -------- | ----------- | ------- |
| `type` | Type of the dataset element, either `track` or `perron` | `"perron"` |
| `id` | Id of dataset element | `"8011674:B01"` |
| `broken` | The original dataset contains wrong information for this track/perron that prevents us from associating it properly (e.g. given track number doesn't exist, two tracks are supposed to be at the same perron but actually aren't, etc…). | `false` |
| `obsolete` | The original dataset contains some old tracks/perrons that don't really exist at the time (e.g. tracks that will never be served, semi-demolished perrons, …). | `false` |
| `osmType` | Type of the OSM entity, either `node`, `way` or `relation`, `undefined` if `broken=true` or `obsolete=true` | `"way"` |
| `osmId` | Id of the OSM entity, `undefined` if `broken=true` or `obsolete=true`. Note that OSM ids are not too stable, however this still seems to be the best way to associate data (for now). Additionally, tests that verify that ids are still valid and refering to public_transport entities are run on a daily basis. | `"378453650"` |
| `stationName` | Name of the station. Note that this field is required, but won't ever be parsed, we just use it to make the dataset a bit more human-readable. | `"Gorgast"` |
| `revised` | Some entries have been automatically fetched/guessed from tagged OSM nodes (`false`), while others have been manually inserted (`true`). This field is currently not exposed by the module, but can be used internally to monitor quality. | `true` |

Put together, our example would give us the following data row for the NDJSON file:

```json
{"type":"perron","id":"8011674:B01","broken":false,"obsolete":false,"osmType":"way","osmId":"378453650","stationName":"Gorgast","revised":true}
```

## Contributing

If you want to add information to the dataset, **[fork this repository](https://help.github.com/articles/fork-a-repo/), add information and finally [submit a pull request](https://help.github.com/articles/about-pull-requests/)**. If you don't know how any of this works, you can also just [open an issue](https://github.com/juliuste/db-platforms/issues) with the information you want to add in text form and I'll add it to the dataset for you. The same applies if you have found an error or want to change anything about the data structure.

Please note that by contributing to this project, you waive any copyright claims on the information you add.

See the [**todo list**](todo.md) for a list of stations that have not been (fully) covered yet.

### CLI

If you want to contribute to this project, you can either add data to `osm.ndjson` manually or use the CLI as follows:

1. Clone the repository (or your fork)

```bash
git clone https://github.com/juliuste/db-platforms.git
```

2. Navigate to the repository root

```bash
cd db-platforms
```

3. Use the CLI to add entries to `osm.ndjson`

```bash
./build/bin/index # starts the cli
./build/bin/index --help # shows the help menu
./build/bin/index --auto-open # starts the CLI, opens OpenStreetMap around stations automatically (only on mac OS, using 'open' CLI)
```

## License

The original dataset was released as [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/), the crowdsourced database of OpenStreetMap associations is licensed as [CC0](https://creativecommons.org/publicdomain/zero/1.0/deed.de).
