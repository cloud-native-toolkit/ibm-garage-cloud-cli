#!/usr/bin/env node

import {CommandModule, scriptName} from 'yargs';

const yarg = scriptName('igc')
  .usage('IBM Garage Cloud Native Toolkit CLI (https://cloudnativetoolkit.dev)')
  .usage('')
  .usage('Usage: $0 <command> [args]')
  .demandCommand()
  .commandDir('commands');

yarg.help()
  .argv;
