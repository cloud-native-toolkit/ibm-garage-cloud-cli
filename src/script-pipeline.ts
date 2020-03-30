#!/usr/bin/env node

process.argv = process.argv.slice(0, 2).concat(['pipeline']).concat(process.argv.slice(2));

require('./script');