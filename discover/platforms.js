'use strict'

const platforms = require('../data.json')
const queryOverpass = require('@derhuerst/query-overpass')
const dbStations = require('db-stations/full')
const { get, uniq, uniqBy } = require('lodash')

const getStationName = id => get(dbStations.find(s => s.id === id), 'name')
const getStationLocation = id => get(dbStations.find(s => s.id === id), 'location')

const getOsm = async (stationId, location) => {
	const osmResult = await queryOverpass(`
	[out:json];
	nwr(around:2500,${location.latitude},${location.longitude})["uic_ref"=${stationId}]["railway"~"^(halt|station)$"]->.station;
	.station<->.parent;
	nwr.parent["public_transport"="stop_area"]->.stop_area;
	.stop_area>>->.members;
	nwr.members[~"^(railway|public_transport)$"~"^(platform|platform_edge)$"]->.platforms;

	.platforms out tags;
	`)
	const set = osmResult
		.map(entry => {
			const refs = (get(entry, 'tags.ref') || '').split(/[,;/+]/).map(x => x.trim()).filter(Boolean)
			const localRefs = (get(entry, 'tags.local_ref') || '').split(/[,;/+]/).map(x => x.trim()).filter(Boolean)
			const ptType = get(entry, 'tags.railway') || get(entry, 'tags.public_transport')
			const combinedRefs = uniq([...refs, ...localRefs])
			if (combinedRefs.length > 0) return { id: String(entry.id), type: entry.type, refs: combinedRefs, ptType }
			return null
		})
		.filter(Boolean)
		.filter(x => x.type !== 'node')

	return uniqBy(set, x => JSON.stringify([x.id, x.type]))
}

const find = async () => {
	const unknown = platforms.filter(x => !x.osmPlatform)
	console.error(`trying to match ${unknown.length} of total ${platforms.length}`)

	for (const platform of unknown) {
		const stationName = getStationName(platform.station)
		const stationLocation = getStationLocation(platform.station)
		if (!stationName || !stationLocation) continue

		const osm = await getOsm(platform.station, stationLocation)
		const matching = osm.filter(({ refs }) => refs.includes(platform.name))
		if (matching.length === 0) {
			console.error(`no matches for ${platform.id}, skipping`)
			continue
		}

		const matchingPlatformEdges = matching.filter(x => x.ptType === 'platform_edge')
		const matchingPlatforms = matching.filter(x => x.ptType === 'platform')
		const picked = (matchingPlatformEdges.length > 0) ? matchingPlatformEdges : matchingPlatforms

		if (picked.length > 1) {
			console.error(`multiple matches for ${platform.id}, skipping`)
			continue
		}
		const [match] = picked
		console.error(`match found for ${platform.id}`)
		process.stdout.write(JSON.stringify({
			id: platform.id,
			osmType: match.type,
			osmId: match.id,
			stationName,
			revised: false
		}) + '\n')
	}
}

find()
	.catch(error => {
		console.error(error)
		process.exit(1)
	})
