'use strict'

const laender = require('german-administrative-areas/laender.geo.json')
const contains = require('@turf/boolean-contains').default
const { point } = require('@turf/helpers')
const uniq = require('lodash/uniq')
const flatten = require('@turf/flatten')
const flatMap = require('lodash/flatMap')
const get = require('lodash/get')
const groupBy = require('lodash/groupBy')
const sortBy = require('lodash/sortBy')
const stations = require('db-stations/full')
const Slugger = require('github-slugger')
const slugger = new Slugger()

const fullData = require('..')
const allStations = uniq([...fullData.perrons, ...fullData.tracks].map(item => item.station))
const incompleteStationIds = uniq([...fullData.perrons, ...fullData.tracks].filter(item => !item.osm).map(item => item.station))
const incompleteStations = incompleteStationIds.map(id => {
	const station = stations.find(s => s.id === id)

	let land = 'Unknown Bundesland'
	if (station.location && station.location.longitude && station.location.latitude) {
		const stationPoint = point([station.location.longitude, station.location.latitude])
		land = laender.find(land => {
			const geometries = land.type === 'FeatureCollection' ? land.features.map(feature => feature.geometry) : [land.geometry]
			const flatGeometries = flatMap(geometries, geometry => flatten(geometry).features).map(feature => feature.geometry)
			return flatGeometries.some(geometry => contains(geometry, stationPoint))
		})
	}

	return {
		id,
		name: station.name || undefined,
		category: station.category || '7',
		land: get(get(land, 'properties') || get(land, 'features[0].properties'), 'GEN')
	}
})

const main = () => {
	const categoryHeading = 'By Category'
	const landHeading = 'By Bundesland'
	process.stdout.write('# ToDo')
	process.stdout.write('\n\n')
	process.stdout.write('List of stations that have not been (fully) covered yet.')
	process.stdout.write('\n\n')

	process.stdout.write(`- [${categoryHeading}](#${slugger.slug(categoryHeading)})`)
	process.stdout.write('\n')
	process.stdout.write(`- [${landHeading}](#${slugger.slug(landHeading)})`)
	process.stdout.write('\n\n')

	const everything = [...fullData.perrons, ...fullData.tracks]
	const coveredLength = everything.filter(item => !!item.osm).length
	const coveredPercentage = Math.round(1000 * (coveredLength / everything.length)) / 10
	process.stdout.write(`**${coveredLength} of ${everything.length}** perrons/tracks covered **(${coveredPercentage}%)**.`)
	process.stdout.write('\n\n')

	const coveredStationsLength = allStations.length - incompleteStations.length
	const coveredStationsPercentage = Math.round(1000 * (coveredStationsLength / allStations.length)) / 10
	process.stdout.write(`**${coveredStationsLength} of ${allStations.length}** stations fully covered **(${coveredStationsPercentage}%)**.`)
	process.stdout.write('\n\n')

	process.stdout.write(`## ${categoryHeading}`)
	process.stdout.write('\n\n')
	const byCategory = groupBy(incompleteStations, 'category')
	const categories = ['1', '2', '3', '4', '5', '6', '7']

	for (const category of categories) {
		const categoryName = `Category ${category}`
		process.stdout.write(`- [${categoryName}](#${slugger.slug(categoryName)})`)
		process.stdout.write('\n')
	}

	for (const category of categories) {
		const categoryName = `Category ${category}`
		const matchingStations = sortBy(byCategory[category] || [], 'name')
		process.stdout.write('\n')
		process.stdout.write(`### ${categoryName}`)
		process.stdout.write('\n\n')
		if (matchingStations.length === 0) {
			process.stdout.write('**All stations in this category are already covered.**')
			process.stdout.write('\n')
		} else {
			for (const matchingStation of matchingStations) {
				const name = [matchingStation.name, matchingStation.id].filter(x => !!x).join(' - ')
				process.stdout.write(`- ${name}`)
				process.stdout.write('\n')
			}
		}
		process.stdout.write('\n')
	}

	process.stdout.write(`## ${landHeading}`)
	process.stdout.write('\n\n')

	const byLand = groupBy(incompleteStations, 'land')
	const coveredLaenderLength = 16 - Object.keys(byLand).length
	const coveredLaenderPercentage = Math.round(1000 * (coveredLaenderLength / 16)) / 10
	process.stdout.write(`**${coveredLaenderLength} of 16** Bundesländer fully covered **(${coveredLaenderPercentage}%)**.`)
	process.stdout.write('\n')

	for (const land of Object.keys(byLand).sort()) {
		process.stdout.write(`- [${land}](#${slugger.slug(land)})`)
		process.stdout.write('\n')
	}

	for (const land of Object.keys(byLand).sort()) {
		process.stdout.write('\n')
		process.stdout.write(`### ${land}`)
		process.stdout.write('\n\n')
		const landStations = sortBy(byLand[land], 'name')
		for (const landStation of landStations) {
			const name = [landStation.name, landStation.id].filter(x => !!x).join(' - ')
			process.stdout.write(`- ${name}`)
			process.stdout.write('\n')
		}
		process.stdout.write('\n')
	}
}

main()
