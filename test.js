'use strict'

const tape = require('tape')

const boilerplate = require('.')

tape('boiler-plate', t => {
	t.ok(boilerplate)
})
