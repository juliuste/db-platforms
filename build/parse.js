'use strict'

const groupBy = require('lodash/groupBy')
const omit = require('lodash/omit')
const flatMap = require('lodash/flatMap')
const stations = require('db-stations/full')

// @todo fix this somehow
const knownMissingStationNumbers = [
	'2516', // Hamburg Sternschanze
	'558', // Berlin Schöneberg
	'1239', // Döberitz
	'214', // Auerstedt
	'354', // Bad Sulza Nord
	'4652', // Oberhof (Thür)
	'6275', // Tromsdorf
	'2259', // Greppin
	'7177' // Bürstadt
]

// replace stationNumber with station
const improveStationMetadata = oldEntry => {
	const matchingStations = stations.filter(station => '' + station.nr === '' + oldEntry.stationNumber)
	if (matchingStations.length !== 1) throw new Error(`unknown station with stationNumber "${oldEntry.stationNumber}" in the original dataset`)
	return {
		station: matchingStations[0].id,
		...omit(oldEntry, ['stationNumber'])
	}
}

const createPerron = list => {
	const { perron, station, perronLength: length, perronHeight: height } = list[0]
	if (!list.every(item => item.station === station) || list.every(item => item.length === length) || list.every(item => item.length === length)) {
		throw new Error(`inconsistent data for perron "${perron}" at station "${station}" in the original dataset`)
	}

	return {
		type: 'perron',
		id: [station, perron].join(':'),
		name: perron,
		station,
		length: +length,
		height: +height
	}
}

const createTrack = perrons => rawTrack => {
	const { station, trackName: longName, track, perron: perronName } = rawTrack
	const perron = perrons.find(perron => perron.name === perronName && perron.station === station)
	return {
		type: 'track',
		id: [station, perronName, track].join(':'), // @todo departurePerron / arrivalPerron
		name: track,
		longName,
		station,
		perron: perron.id // @todo departurePerron / arrivalPerron
	}
}

const processStationPerronsAndTracks = list => {
	const byPerron = Object.values(groupBy(list, 'perron'))
	const perrons = byPerron.map(createPerron)
	const tracks = list.map(createTrack(perrons))
	return [...perrons, ...tracks]
}

const parse = data => {
	const withStationIds = data.filter(e => !knownMissingStationNumbers.includes(e.stationNumber)).map(improveStationMetadata)
	const byStation = Object.values(groupBy(withStationIds, 'station'))
	const all = flatMap(byStation, processStationPerronsAndTracks)
	const tracks = all.filter(e => e.type === 'track')
	const perrons = all.filter(e => e.type === 'perron')
	return { perrons, tracks }
}

module.exports = parse
