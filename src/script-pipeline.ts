#!/usr/bin/env node

import {addCommandToArgs} from './util/add-command-to-args';

process.argv = addCommandToArgs(process.argv, 'pipeline');

require('./script');
