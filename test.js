'use strict'

const tapeWithoutPromise = require('tape')
const addPromiseSupport = require('tape-promise').default
const tape = addPromiseSupport(tapeWithoutPromise)
const queryOsm = require('@derhuerst/query-overpass')
const stations = require('db-stations/full')
const groupBy = require('lodash/groupBy')
const flatMap = require('lodash/flatMap')
const chunk = require('lodash/chunk')
const get = require('lodash/get')
const uniq = require('lodash/uniq')

const tracks = require('.')

tape('base', t => {
	tracks.forEach(track => {
		const matchingStations = stations.filter(station => station.id === track.station)
		t.ok(matchingStations.length === 1, 'matching station')
		t.ok(typeof track.id === 'string' && track.id.length >= 9, 'track id')
		t.ok(typeof track.name === 'string' && track.name.length > 0, 'track name')
		t.ok(typeof track.longName === 'string' && track.longName.length > 0, 'track longName')

		t.ok(typeof track.perron.id === 'string' && track.perron.id.length >= 9, 'perron id')
		t.ok(typeof track.perron.name === 'string' && track.perron.name.length > 0, 'perron name')
		t.ok(typeof track.perron.length === 'number' && track.perron.length > 0, 'perron length')
		t.ok(track.perron.station === track.station, 'perron length')
		t.ok(typeof track.perron.height === 'number' && track.perron.height > 0, 'perron height')

		if (track.osmPlatform) {
			t.ok(['way', 'relation'].includes(track.osmPlatform.type), 'track osmPlatform type')
			t.ok(typeof track.osmPlatform.id === 'string' && track.osmPlatform.id.length > 0, 'track osmPlatform id')
		}

		if (track.osmStopPosition) {
			t.ok(track.osmStopPosition.type === 'node', 'track osmStopPosition type')
			t.ok(typeof track.osmStopPosition.id === 'string' && track.osmStopPosition.id.length > 0, 'track osmStopPosition id')
		}
	})
	t.ok(tracks.filter(track => !!track.osmPlatform).length >= 5, 'tracks with osmPlatform')
	t.ok(tracks.filter(track => !!track.osmStopPosition).length >= 5, 'tracks with osmStopPosition')

	const byStopPosition = groupBy(tracks.filter(track => !!track.osmStopPosition), track => {
		return [track.osmStopPosition.type, track.osmStopPosition.id].join('#')
	})
	Object.keys(byStopPosition).forEach(key => {
		const notUnique = byStopPosition[key].every(track => track.osmStopPosition.notUnique)
		t.ok(notUnique || (byStopPosition[key].length === 1), `unique stop position ${key}`)
	})

	t.end()
})

tape.skip('upstream osm', async t => {
	// @todo distance to matching perron/track (if available)
	const osmElements = flatMap(tracks, track => {
		return ['osmPlatform', 'osmStopPosition']
			.filter(key => Boolean(track[key]))
			.map(key => ({ datasetType: key, trackName: track.name, ...track[key] }))
	})
	for (const elements of chunk(osmElements, 100)) {
		const osmQuery = `[out:json][timeout:20]; ${elements.map(item => `${item.type}(${item.id}); out;`).join(' ')}`
		const osmResults = await queryOsm(osmQuery, { retryOpts: { retries: 3, minTimeout: 20000 }, endpoint: 'http://overpass.juliustens.eu/api/interpreter' })
		elements.forEach(element => {
			const matching = osmResults.find(item => item.id + '' === element.id + '' && item.type === element.type)
			t.ok(matching, `matching osm element ${element.type} ${element.id}`)
			const ref = get(matching, 'tags.ref')
			const localRef = get(matching, 'tags.local_ref')
			const groupedRefs = [ref, localRef].filter(Boolean)
			const refs = uniq(
				flatMap(groupedRefs, r => r.split(/[,;/+]/))
					.filter(Boolean)
					.filter(r => !!r.replace(/[^\d]/g, ''))
					.map(r => r.replace(/^Gleis/gi, '').trim())
					.filter(Boolean),
			)
			if (element.datasetType === 'osmStopPosition') {
				if (refs.length > 0 && !refs.includes(element.trackName)) console.error(`WARNING: possible osm stop_position mismatch in track for ${element.type} ${element.id}:`, element.trackName, refs)
				t.ok(get(matching, 'tags.public_transport') === 'stop_position', `public_transport=stop_position ${element.type} ${element.id}`)
			}
			if (element.datasetType === 'osmPlatform') {
				if (refs.length > 0 && !refs.includes(element.trackName)) console.error(`WARNING: possible osm platform mismatch in track for ${element.type} ${element.id}:`, element.trackName, refs)

				// @todo warn if public_transport is not set
				const isRailwayPlatformEdge = get(matching, 'tags.railway') === 'platform_edge'
				const isRailwayPlatform = get(matching, 'tags.railway') === 'platform'
				const isPublicTransportPlatform = get(matching, 'tags.public_transport') === 'platform'
				t.ok(isRailwayPlatformEdge || isRailwayPlatform || isPublicTransportPlatform, `<tag>=platform ${element.type} ${element.id}`)
			}
		})
	}
	t.end()
})
