'use strict'

const got = require('got')
const parseCsv = require('csv-parse')
const streamToPromise = require('get-stream').array

const transformColumnName = column => {
	if (!column) return undefined
	if (column === 'Bahnhofsnummer') return 'stationNumber'
	if (column === 'Bahnsteig') return 'perron'
	if (column === 'Gleisnummer') return 'track'
	if (column === 'örtliche Bezeichnung') return 'trackName'
	if (column === 'Nettobaulänge(m)') return 'perronLength'
	if (column === 'Höhe Bahnsteigkante (cm)') return 'perronHeight'
	throw new Error(`unexpected column '${column}' in the original dataset`)
}

const download = async () => {
	const resource = 'http://download-data.deutschebahn.com/static/datasets/bahnsteig/DBSuS-Bahnsteigdaten-Stand2019-03.csv'
	const parserStream = parseCsv({
		delimiter: ';',
		columns: (oldColumns) => {
			const columns = oldColumns.map(transformColumnName)
			if (columns.filter(c => !!c).length !== 6) throw new Error('unexpected column count in the original dataset')
			return columns
		}
	})
	const downloadStream = got.get(resource, { stream: true })
	const data = await streamToPromise(downloadStream.pipe(parserStream))
	return data
}

module.exports = download
