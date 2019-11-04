# Changelog

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
