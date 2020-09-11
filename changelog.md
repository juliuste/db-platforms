# Changelog

## `0.1.5`

- Update to latest [stations](https://github.com/derhuerst/db-stations) and [platforms](http://download-data.deutschebahn.com/static/datasets/bahnsteig/DBSuS-Bahnsteigdaten-Stand2020-03.csv) datasets

## `0.1.4`

- Add stations in Leipzig

## `0.1.3`

- Add additional data for missing stations in Berlin and Bremen as well as some category 2 stations

## `0.1.2`

- Fix broken OpenStreetMap entries, remove outdated entries, bulk import new entries by OSM ref/local_ref

## `0.1.1`

- Fix broken OpenStreetMap entries

## `0.1.0`

- **BREAKING:** Rename module to **`db-platforms`** (from `db-perrons`)
- **BREAKING:** Update the data structure exposed by the module
    - Remove `type` attribute of tracks/perrons
    - Expose a list of `track`s as export root
    - Expose `perron`s as a child property of `track`s
    - Remove OSM information from `perron`s
    - Introduce `track.osmPlatform`
    - Rename `track.osm` to `track.osmStopPosition`
- Remove invalid osm data
