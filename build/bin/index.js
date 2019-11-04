#!/usr/bin/env node
'use strict'

const mri = require('mri')
const chalk = require('chalk')
const fs = require('fs')
const { spawn } = require('child_process')
const { resolve } = require('path')

const pkg = require('../../package.json')
const { queryStation, parseStation, queryOsmCategory, queryElementId, queryOsmType, queryOsmId, verifyOsmId, queryObsolete } = require('./lib')

const argv = mri(process.argv.slice(2), {
	boolean: ['help', 'h', 'version', 'v']
})

const opt = {
	dataDirectory: argv._[0] || '.',
	help: argv.help || argv.h,
	version: argv.version || argv.v,
	open: argv['auto-open'] || argv.o,
	unknownOnly: argv['unknown-only'] || argv.u
}

if (opt.help === true) {
	process.stdout.write(`
db-perrons-cli [data-directory] [options]

Arguments:
    data-directory        NDJSON data directory path containing ndjson files (default: '.').

Options:
	--auto-open     -o Open OpenStreetMap around stations automatically (only on mac OS, using 'open' CLI)
	--unknown-only  -u Only suggest stations/perrons/tracks that don't have associated OSM data yet
    --help          -h Show help dialogue (this)
    --version       -v Show version
`)
	process.exit(0)
}

if (opt.version === true) {
	process.stdout.write(`db-perrons-cli v${pkg.version}\n`)
	process.exit(0)
}

const showError = function (err) {
	if (process.env.NODE_DEBUG === 'db-perrons-cli') console.error(err)
	process.stderr.write(chalk.red(err.message) + '\n')
	process.exit(err.code || 1)
}

const main = async (opt) => {
	// query station
	const { id: station, name: stationName, location: stationLocation } = await queryStation('Which station?', { unknownOnly: opt.unknownOnly })
	const tracks = await parseStation(station)
	const selectableTracks = tracks.filter(t => !opt.unknownOnly || (!t.osmPlatform || !t.osmStopPosition))

	if (stationLocation && opt.open) {
		const { latitude, longitude } = stationLocation
		const url = `https://www.openstreetmap.org/query?lat=${latitude}&lon=${longitude}#map=17/${latitude}/${longitude}`
		spawn('open', [url])
	}

	// query track number
	const options = selectableTracks.map(track => ({
		value: track.id,
		title: track.name
	}))
	const elementId = await queryElementId('Which track?', options)
	const selected = selectableTracks.find(t => t.id === elementId)

	// query obsolete
	const obsolete = await queryObsolete('Obsolete?')

	let osmType, osmId, osmCategory, entry, file
	if (!obsolete) {
		// query osm public_transport category (platform/stopPosition)
		if (selectableTracks.length === 0) throw new Error('No tracks found for the given station.')
		osmCategory = await queryOsmCategory('Which OSM public_transport category?', { stopPosition: !selected.osmStopPosition, platform: !selected.osmPlatform })

		// query osm type
		if (osmCategory === 'platform') {
			osmType = await queryOsmType('Which OSM type?')
		} else {
			osmType = 'node'
			console.log('OSM-Type: node')
		}

		// osm id
		osmId = await queryOsmId('Which OSM id?')
		verifyOsmId(osmId)

		entry = {
			id: elementId,
			osmType,
			osmId,
			stationName,
			revised: true
		}
		file = resolve(opt.dataDirectory, osmCategory === 'platform' ? './osm-platforms.ndjson' : './osm-stop-positions.ndjson')
	} else {
		entry = { id: elementId, stationName }
		file = resolve(opt.dataDirectory, './obsolete.ndjson')
	}

	const ndjson = JSON.stringify(entry) + '\n'
	try {
		fs.appendFileSync(file, ndjson) // @todo pify & await
		console.log('Appended to ' + file)
	} catch (err) {
		showError(err)
	}

	process.stdout.write(ndjson)
}

main(opt)
	.catch(showError)
