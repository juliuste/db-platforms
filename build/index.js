'use strict'

const download = require('./download')
const parse = require('./parse')
const streamToPromise = require('get-stream').array
const ndjson = require('ndjson')
const fs = require('fs')
const { resolve } = require('path')

const mergeOsmDataWithStatic = (osmData, parsedPerronsAndTracks) => {
	const { perrons, tracks } = JSON.parse(JSON.stringify(parsedPerronsAndTracks)) // cloning is "inefficient" and not necessary here, but the method doesn't have side effects
	osmData.forEach(row => {
		const { type, id, broken, obsolete, osmType, osmId, stationName } = row
		if (!['track', 'perron'].includes(type) || !id || !stationName) throw new Error(`invalid entry "${JSON.stringify(row)}"`)

		const list = type === 'track' ? tracks : perrons
		const matching = list.filter(item => item.type === type && item.id === id)
		if (matching.length !== 1) throw new Error(`no matching entries found in original dataset for ${type} "${id}"`)
		const [item] = matching

		if (broken) {
			item.broken = true
			return
		}

		if (obsolete) {
			item.obsolete = true
			return
		}

		if (!['node', 'way', 'relation'].includes(osmType) || !osmId) throw new Error(`invalid entry "${JSON.stringify(row)}"`)
		if (item.osm) throw new Error(`duplicate osm data for ${type} "${id}"`)
		item.osm = { type: osmType, id: osmId }
	})

	return {
		perrons: perrons.filter(perron => !perron.broken && !perron.obsolete),
		tracks: tracks.filter(track => !track.broken && !track.obsolete)
	}
}

const build = async () => {
	const data = await download()
	const parsedPerronsAndTracks = parse(data)

	const osmDataStream = fs.createReadStream(resolve(__dirname, '../osm.ndjson')).pipe(ndjson.parse())
	const osmData = await streamToPromise(osmDataStream)

	return mergeOsmDataWithStatic(osmData, parsedPerronsAndTracks)
}

build()
	.then(res => process.stdout.write(JSON.stringify(res)))
	.catch(console.error)
