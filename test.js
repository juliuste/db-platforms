'use strict'

const tapeWithoutPromise = require('tape')
const addPromiseSupport = require('tape-promise').default
const tape = addPromiseSupport(tapeWithoutPromise)
const queryOsm = require('@derhuerst/query-overpass')
const stations = require('db-stations/full')
const chunk = require('lodash/chunk')
const retry = require('p-retry')

const { perrons, tracks } = require('.')

const stationsWithBrokenPerronHeight = [
	'8000108' // Freilassing (1906)
]

tape.skip('db-perrons base', t => {
	perrons.forEach(perron => {
		const matchingStations = stations.filter(station => station.id === perron.station)
		t.ok(matchingStations.length === 1, 'matching station')
		t.ok(typeof perron.id === 'string' && perron.id.length >= 9, 'perron id')
		t.ok(typeof perron.name === 'string' && perron.name.length > 0, 'perron name')
		t.ok(typeof perron.length === 'number' && perron.length > 0, 'perron length')
		t.ok(stationsWithBrokenPerronHeight.includes(perron.station) || (typeof perron.height === 'number' && perron.height > 0), 'perron height')
		if (perron.osm) {
			// @todo check if node/way/relation exists on osm
			t.ok(['way', 'relation'].includes(perron.osm.type), 'perron osm type')
			t.ok(typeof perron.osm.id === 'string' && perron.osm.id.length > 0, 'perron osm id')
		}
	})
	t.ok(perrons.filter(perron => !!perron.osm).length >= 5, 'perrons with osm')

	tracks.forEach(track => {
		const matchingStations = stations.filter(station => station.id === track.station)
		t.ok(matchingStations.length === 1, 'matching station')
		t.ok(typeof track.id === 'string' && track.id.length >= 11, 'track id')
		t.ok(typeof track.name === 'string' && track.name.length > 0, 'track name')
		t.ok(typeof track.longName === 'string' && track.longName.length > 0, 'track longName')

		const matchingPerrons = perrons.filter(perron => perron.id === track.perron)
		t.ok(matchingPerrons.length === 1, 'matching perronm')

		if (track.osm) {
			t.ok(track.osm.type === 'node', 'track osm type')
			t.ok(typeof track.osm.id === 'string' && track.osm.id.length > 0, 'track osm id')
		}
	})
	t.ok(tracks.filter(track => !!track.osm).length >= 5, 'tracks with osm')
	t.end()
})

tape('db-perrons upstream osm', async t => {
	// @todo distance to matching perron/track (if available)
	const osmElements = [...tracks, ...perrons].filter(item => !!item.osm).map(item => ({ ...item.osm, datasetType: item.type }))
	for (let elements of chunk(osmElements, 100)) {
		const osmQuery = `[out:json][timeout:20]; ${elements.map(item => `${item.type}(${item.id}); out;`).join(' ')}`
		const osmResults = await retry(() => queryOsm(osmQuery), { retries: 3 })
		elements.forEach(element => {
			const matching = osmResults.find(item => item.id + '' === element.id + '' && item.type === element.type)
			t.ok(matching, `matching osm element ${element.type} ${element.id}`)
			if (element.datasetType === 'track') {
				t.ok(matching.tags.public_transport === 'stop_position', `public_transport=stop_position ${element.type} ${element.id}`)
			}
			if (element.datasetType === 'perron') {
				// @todo warn if public_transport is not set
				const isRailwayPlatform = matching.tags.railway === 'platform'
				const isPublicTransportPlatform = matching.tags.public_transport === 'platform'
				t.ok(isRailwayPlatform || isPublicTransportPlatform, `<tag>=platform ${element.type} ${element.id}`)
			}
		})
	}
	t.end()
})
