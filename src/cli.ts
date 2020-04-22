#!/usr/bin/env node

import yargs = require('yargs');

import { definition } from './arguments';
import Lib from './';

const args = yargs.options(definition).help();

const lib = new Lib(args.argv);

lib.run();
