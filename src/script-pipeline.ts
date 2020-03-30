#!/usr/bin/env node

console.log('argv before', process.argv);

process.argv = process.argv.slice(0, 2).concat(['pipeline']).concat(process.argv.slice(2));

console.log('argv after', process.argv);

require('./script');