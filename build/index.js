'use strict'

const download = require('./download')
const parse = require('./parse')
const streamToPromise = require('get-stream').array
const ndjson = require('ndjson')
const fs = require('fs')
const { resolve } = require('path')
const groupBy = require('lodash/groupBy')

const mergeOsmDataWithStatic = (osmPlatformData, osmStopPositionData, obsoleteData, parsedTracks) => {
	const tracks = JSON.parse(JSON.stringify(parsedTracks)) // cloning is "inefficient" and not necessary here, but the method doesn't have side effects
	return tracks.map(track => {
		const matchingPlatforms = osmPlatformData.filter(d => d.id === track.id)
		const matchingStopPositions = osmStopPositionData.filter(d => d.id === track.id)
		const obsolete = obsoleteData.filter(d => d.id === track.id)

		if (matchingPlatforms.length > 1) throw new Error(`more than one osm platform entry found for track ${track.id}`)
		if (matchingStopPositions.length > 1) throw new Error(`more than one osm stop_position entry found for track ${track.id}`)
		if (obsolete.length > 1) throw new Error(`more than one obsolete entry found for track ${track.id}`)

		if (obsolete.length === 1) return null

		const [matchingPlatform] = matchingPlatforms
		const [matchingStopPosition] = matchingStopPositions

		if (matchingPlatform) {
			const { osmType, osmId } = matchingPlatform
			if (!['node', 'way', 'relation'].includes(osmType) || !osmId) throw new Error(`invalid entry "${JSON.stringify(matchingPlatform)}"`)
			track.osmPlatform = {
				type: osmType,
				id: osmId,
			}
		}

		if (matchingStopPosition) {
			const { osmType, osmId, notUnique } = matchingStopPosition
			if (!['node', 'way', 'relation'].includes(osmType) || !osmId) throw new Error(`invalid entry "${JSON.stringify(matchingStopPosition)}"`)
			track.osmStopPosition = {
				type: osmType,
				id: osmId,
				notUnique,
			}
		}

		return track
	}).filter(Boolean)
}

const build = async () => {
	const data = await download()
	const parsedTracks = parse(data)

	const groupedById = Object.values(groupBy(parsedTracks, 'id'))
	groupedById.forEach(group => {
		if (group.length > 1) throw new Error(`multiple stations with the same id: ${group[0].id}`)
	})

	const osmPlatformDataStream = fs.createReadStream(resolve(__dirname, '../osm-platforms.ndjson')).pipe(ndjson.parse())
	const osmPlatformData = await streamToPromise(osmPlatformDataStream)

	const osmStopPositionDataStream = fs.createReadStream(resolve(__dirname, '../osm-stop-positions.ndjson')).pipe(ndjson.parse())
	const osmStopPositionData = await streamToPromise(osmStopPositionDataStream)

	const obsoleteDataStream = fs.createReadStream(resolve(__dirname, '../obsolete.ndjson')).pipe(ndjson.parse())
	const obsoleteData = await streamToPromise(obsoleteDataStream)

	return mergeOsmDataWithStatic(osmPlatformData, osmStopPositionData, obsoleteData, parsedTracks)
}

build()
	.then(res => process.stdout.write(JSON.stringify(res)))
	.catch(console.error)
