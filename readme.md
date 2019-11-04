# db-platforms

Deutsche Bahn platform information, enriched with OSM data.

You're invited to help, see the [definitions](#definitions), [data structure](#data-structure) and [contributing](#contributing) sections!

Using [this original dataset](https://data.deutschebahn.com/dataset/data-bahnsteig) provided by [Deutsche Bahn](https://www.bahn.de).

[![npm version](https://img.shields.io/npm/v/db-platforms.svg)](https://www.npmjs.com/package/db-platforms)
[![Build Status](https://travis-ci.org/juliuste/db-platforms.svg?branch=master)](https://travis-ci.org/juliuste/db-platforms)
[![Greenkeeper badge](https://badges.greenkeeper.io/juliuste/db-platforms.svg)](https://greenkeeper.io/)
[![license](https://img.shields.io/github/license/juliuste/db-platforms.svg?style=flat)](license)

## Definitions

Since the word *platform* is ambiguous in the English language (some people use it refering to the tracks at which trains depart while some people think of it as the place where you wait for your train, see also [here](https://en.wikipedia.org/wiki/Railway_platform#Identification)), we use the following terms in this readme:

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
const tracks = require('db-platforms')
```

The module exposes a list of *tracks*. Tracks contain the following information:

- Metadata for the specific track, e.g. id, name, long name.
- ID of the track's station, you can use the [`db-stations`](https://github.com/derhuerst/db-stations) module to retrieve additional information.
- The *perron* this track belongs to. Note that this information is extracted from the [Deutsche Bahn dataset mentioned above](https://data.deutschebahn.com/dataset/data-bahnsteig), which turns out to contain some errors in the mapping from tracks to perrons. This means that sometimes two tracks are shown to belong to the same perron while they actually don't. For this reason, it is probably better to - if available for that track - use OpenStreetMap information to determine if two tracks are located next to each other.
- OpenStreetMap *stop position* and *platform* entities corresponding to that track. See also [*Why aren't OSM platforms tagged on perrons?*](#why-arent-osm-platforms-tagged-on-perrons).


### Output sample

```js
[
	{
		id: '8000001:1',
		name: '1',
		longName: 'Gleis 1',
		station: '8000001',
		perron: {
			id: '8000001:B01',
			name: 'B01',
			station: '8000001',
			length: 168,
			height: 76
		},
		osmPlatform: { // null if not tagged yet
			type: 'way',
			id: '33170523'
		},
		osmStopPosition: { // null if not tagged yet
			type: 'node',
			id: '215971279'
		}
	},
	{
		id: '8000001:2',
		name: '2',
		longName: 'Gleis 2',
		station: '8000001',
		perron: {
			id: '8000001:B02',
			name: 'B02',
			station: '8000001',
			length: 387,
			height: 76
		},
		osmPlatform: { // null if not tagged yet
			type: 'relation',
			id: '5151598'
		},
		osmStopPosition: { // null if not tagged yet
			type: 'node',
			id: '215971391'
		}
	},
	// …
]
```

## Data structure

We aim to associate the following OpenStreetMap entities with *tracks*.

| type | association |
| ---- | ----------- |
| `osmStopPosition` | Point *on* a metal rail, mapped in OSM as a node with attribute `public_transport=stop_position`, sometimes has an attribute `ref` or `local_ref` containing the track number |
| `osmPlatform` | Perron area or edge close to the rail, mapped in OSM as a way or relation (MultiPolygon) with attribute `public_transport=platform`, `railway=platform` or `railway=platform_edge`, sometimes has an attribute `ref` containing the numbers of adjacent tracks. |

### Why aren't OSM platforms tagged on perrons

Even though OpenStreetMap *platforms* and this module's *perrons* describe the same concept, we don't store OSM platform associations on *perrons*, but rather on individual *tracks*. This happens for the following reasons:

1. As mentioned above, the [original Deutsche Bahn dataset](https://data.deutschebahn.com/dataset/data-bahnsteig) sometimes contains errors in the association of tracks to perrons, meaning that multiple tracks are tagged to be part of the same perron while actually being separated in the real world.
2. Deciding where one perron ends and another begins is a very opinionated task. You could even argue that terminal stations like Leipzig main station only have one giant perron instead of many. Since OSM contributors and the people who created the Deutsche Bahn dataset often draw these lines differently, it makes sense not to couple the concept of OpenStreetMap *platforms* with DB *perrons*.
3. OpenStreetMap knows the concept of *platform edges*, corresponding to the edge of a platform which is relevant for a specific track. These couldn't be associated with *perrons*, but can be mapped to *tracks*.

### Files

OpenStreetMap associations are stored in `osm-stop-positions.ndjson` and `osm-platforms.ndjson`, [ndjson](http://ndjson.org/) files which contain one record per row. All records are objects with the following keys (required).

| key name | description | example |
| -------- | ----------- | ------- |
| `id` | Track id | `"8011674:1"` |
| `osmType` | Type of the OSM entity, either `node`, `way` or `relation`. Always `node` for *stop positions* | `"way"` |
| `osmId` | Id of the OSM entity, `undefined` if `broken=true` or `obsolete=true`. Note that OSM ids are not too stable, however this still seems to be the best way to associate data (for now). Additionally, tests that verify that ids are still valid and refering to public_transport entities are run on a daily basis. | `"378453650"` |
| `stationName` | Name of the station. Note that this field is required, but won't ever be parsed, we just use it to make the dataset a bit more human-readable. | `"Gorgast"` |
| `revised` | Some entries have been automatically fetched/guessed from tagged OSM nodes (`false`), while others have been manually inserted (`true`). This field is currently not exposed by the module, but can be used internally to monitor quality. | `true` |

Put together, our example would give us the following data row for `osm-platforms.ndjson`:

```json
{"id":"8011674:1","osmType":"way","osmId":"378453650","stationName":"Gorgast","revised":true}
```

#### Obsolete entries in the original dataset

The original dataset contains some old tracks/perrons that don't really exist at the time (e.g. tracks that will never be served, semi-demolished perrons, …). These are stored in `obsolete.ndjson` and will be filtered out in the module's build process.

## Contributing

If you want to add information to the dataset, **[fork this repository](https://help.github.com/articles/fork-a-repo/), add information and finally [submit a pull request](https://help.github.com/articles/about-pull-requests/)**. If you don't know how any of this works, you can also just [open an issue](https://github.com/juliuste/db-platforms/issues) with the information you want to add in text form and I'll add it to the dataset for you. The same applies if you have found an error or want to change anything about the data structure.

Please note that by contributing to this project, you waive any copyright claims on the information you add.

See the [**todo list**](todo.md) for a list of stations that have not been (fully) covered yet.

### CLI

If you want to contribute to this project, you can either add data to `osm-stop-positions.ndjson` and `osm-platforms.ndjson` manually or use the CLI as follows:

1. Clone the repository (or your fork)

```bash
git clone https://github.com/juliuste/db-platforms.git
```

2. Navigate to the repository root

```bash
cd db-platforms
```

3. Use the CLI to add entries to `osm-stop-positions.ndjson` and `osm-platforms.ndjson`

```bash
./build/bin/index # starts the cli
./build/bin/index --help # shows the help menu
./build/bin/index --auto-open # starts the CLI, opens OpenStreetMap around stations automatically (only on mac OS, using 'open' CLI)
```

## License

The original dataset was released as [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/), the crowdsourced database of OpenStreetMap associations is licensed as [CC0](https://creativecommons.org/publicdomain/zero/1.0/deed.de).
