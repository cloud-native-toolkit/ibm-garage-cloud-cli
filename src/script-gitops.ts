#!/usr/bin/env node

import {addCommandToArgs} from './util/add-command-to-args';

process.argv = addCommandToArgs(process.argv, 'gitops');

require('./script');
