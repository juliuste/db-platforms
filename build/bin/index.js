#!/usr/bin/env node
'use strict'

const mri = require('mri')
const chalk = require('chalk')
const fs = require('fs')
const { spawn } = require('child_process')

const pkg = require('../../package.json')
const { queryStation, parseStation, queryElementType, queryElementId, queryPerronOsmType, queryOsmId, verifyOsmId, queryBrokenOrObsolete } = require('./lib')

const argv = mri(process.argv.slice(2), {
	boolean: ['help', 'h', 'version', 'v']
})

const opt = {
	datafile: argv._[0] || './osm.ndjson',
	help: argv.help || argv.h,
	version: argv.version || argv.v,
	open: argv['auto-open'] || argv.o,
	unknownOnly: argv['unknown-only'] || argv.u
}

if (opt.help === true) {
	process.stdout.write(`
db-perrons-cli [datafile] [options]

Arguments:
    datafile        NDJSON data file path (default: './osm.ndjson').

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
	// query arrival station
	const { id: station, name: stationName, location: stationLocation } = await queryStation('Which station?', { unknownOnly: opt.unknownOnly })
	const { perrons, tracks } = await parseStation(station)

	const selectablePerrons = perrons.filter(p => !opt.unknownOnly || !p.osm)
	const selectableTracks = tracks.filter(t => !opt.unknownOnly || !t.osm)

	if (stationLocation && opt.open) {
		const { latitude, longitude } = stationLocation
		const url = `https://www.openstreetmap.org/query?lat=${latitude}&lon=${longitude}#map=17/${latitude}/${longitude}`
		spawn('open', [url])
	}

	// query elementType (perron/track)
	if (selectablePerrons.length === 0 && selectableTracks.length === 0) throw new Error('No tracks or perrons found for the given station.')
	const elementType = await queryElementType('Which element type?', { perrons: selectablePerrons.length > 0, tracks: selectableTracks.length > 0 })

	// perron/track number
	let options
	if (elementType === 'perron') {
		options = selectablePerrons.map(perron => {
			const tracksAtPerron = tracks.filter(track => track.perron === perron.id)
			const trackDescription = `track${tracksAtPerron.length > 1 ? 's' : ''} ${tracksAtPerron.map(track => track.name).join('/')}`
			return {
				value: perron.id,
				title: [perron.name, trackDescription].join(' - ')
			}
		})
	}
	if (elementType === 'track') {
		options = selectableTracks.map(track => ({
			value: track.id,
			title: track.name
		}))
	}
	const elementId = await queryElementId('Which element?', options)

	let broken
	let obsolete
	const brokenOrObsolete = await queryBrokenOrObsolete('Broken or obsolete?')
	if (brokenOrObsolete === 'broken') broken = true
	if (brokenOrObsolete === 'obsolete') obsolete = true

	let osmType
	let osmId
	if (!obsolete && !broken) {
		// osm type
		if (elementType === 'perron') {
			osmType = await queryPerronOsmType('Which OSM type?', elementType)
		} else {
			osmType = 'node'
			console.log('OSM-Type: node')
		}

		// osm id
		osmId = await queryOsmId('Which OSM id?')
		verifyOsmId(osmId)
	}

	const entries = {
		type: elementType,
		id: elementId,
		broken,
		obsolete,
		osmType,
		osmId,
		stationName,
		revised: true
	}

	const ndjson = JSON.stringify(entries) + '\n'

	try {
		fs.appendFileSync(opt.datafile, ndjson) // @todo pify & await
		console.log('Appended to ' + opt.datafile)
	} catch (err) {
		showError(err)
	}

	process.stdout.write(ndjson)
}

main(opt)
	.catch(showError)
