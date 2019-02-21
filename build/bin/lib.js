'use strict'

const isUICLocationCode = require('is-uic-location-code')
const chalk = require('chalk')
const textPrompt = require('text-prompt')
const selectPrompt = require('select-prompt')
const autocompletePrompt = require('cli-autocomplete')
const uniq = require('lodash/uniq')
const got = require('got')
const { perrons, tracks } = require('../..')

const findStations = async query => {
	const { body } = await got.get('https://2.db.transport.rest/stations', {
		query: {
			results: 100,
			query
		},
		json: true
	})
	return body
}

// stations
const id9to7 = id => id.length === 9 && id.slice(0, 2) === '00' ? id.slice(2) : id
const isStationId = (s) => /^\d{7}$/.test(s.toString())
const parseStation = (query) => {
	if (isStationId(query)) {
		const perronsAtStation = perrons.filter(p => p.station === query)
		const tracksAtStation = tracks.filter(t => t.station === query)
		return { perrons: perronsAtStation, tracks: tracksAtStation }
	}
	throw new Error('Station not found.')
}
const suggestStations = unknownOnly => async (input) => {
	if (!input || input === '') return []
	const stations = await findStations(input)
	const validStations = stations.filter(s => isUICLocationCode(id9to7(s.id))).map(({ name, id, location }) => ({ title: [name, id9to7(id)].join(' - '), value: { name, id: id9to7(id), location } }))
	if (!unknownOnly) return validStations
	return validStations.filter(({ value }) => {
		const incompleteStations = uniq([...perrons, ...tracks].filter(item => !item.osm).map(item => item.station))
		return incompleteStations.includes(value.id)
	}).filter((element, index) => index < 5)
}
const queryStation = (msg, { unknownOnly }) => new Promise((resolve, reject) => {
	autocompletePrompt(chalk.bold(msg), suggestStations(unknownOnly))
		.on('submit', resolve)
		.on('abort', (val) => {
			reject(new Error(`Rejected with ${val}.`))
		})
})

// element type (perron/track)
const queryElementType = (msg, { perrons, tracks }) => new Promise((resolve, reject) => {
	const options = []
	if (perrons) {
		options.push({
			value: 'perron',
			title: 'Perron'
		})
	}
	if (tracks) {
		options.push({
			value: 'track',
			title: 'Track'
		})
	}
	selectPrompt(msg, options)
		.on('abort', (v) => reject(new Error(`Rejected with ${v}.`)))
		.on('submit', resolve)
})

// element id
const queryElementId = (msg, options) => new Promise((resolve, reject) => {
	selectPrompt(msg, options)
		.on('abort', (v) => reject(new Error(`Rejected with ${v}.`)))
		.on('submit', resolve)
})

// osm type (way/relation)
const queryPerronOsmType = (msg) => new Promise((resolve, reject) => {
	selectPrompt(msg, [
		{
			value: 'way',
			title: 'Way'
		},
		{
			value: 'relation',
			title: 'Relation (MultiPolygon)'
		}
	])
		.on('abort', (v) => reject(new Error(`Rejected with ${v}.`)))
		.on('submit', resolve)
})

// osm id
const verifyOsmId = (x) => {
	if (typeof x !== 'string' || x.length === 0) throw new Error('Invalid OSM id.')
}
const queryOsmId = (msg) => new Promise((resolve, reject) =>
	textPrompt(msg)
		.on('submit', resolve)
		.on('abort', (v) => reject(new Error(`Rejected with ${v}.`)))
)

// broken or obsolete
const queryBrokenOrObsolete = (msg) => new Promise((resolve, reject) => {
	const options = [
		{
			value: undefined,
			title: 'No'
		},
		{
			value: 'broken',
			title: 'Broken'
		},
		{
			value: 'obsolete',
			title: 'Obsolete'
		}
	]
	selectPrompt(msg, options)
		.on('abort', (v) => reject(new Error(`Rejected with ${v}.`)))
		.on('submit', resolve)
})

module.exports = {
	queryStation,
	parseStation,
	queryElementType,
	queryElementId,
	queryPerronOsmType,
	queryOsmId,
	verifyOsmId,
	queryBrokenOrObsolete
}
