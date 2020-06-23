// const promzard = require('promzard'
import { promises as fs } from 'fs';
import init_config from './init/config';
import init_interceptor, { templates } from './init/interceptor';
import { defaultSignal } from '../arguments';
import { writeTemplate } from './init/util';
import { prettify } from '../util/prettify';

// These exports are necessary for yargs
export const command = 'init [file]'
export const desc = 'Create boilerplate configuration/scripts'
export const builder = {
  file: {
    default: 'config',
    description: 'file to create',
    choices: ['config', 'interceptor', 'script']
  }
}

function filterDefaults(obj: object) {
  return Object.fromEntries(Object.entries(obj).map(([key, val]) => [key, val === defaultSignal ? undefined : val]));
}

function toAlmostJSON(obj: any) {
  if (obj === undefined) throw new Error('Can not serialize undefined');
  if (obj === null) throw new Error('Can not serialize null');
  const entries = Object.entries(obj).map(([key, val]) => {
    return `${key}: ${JSON.stringify(val)},`
  }).join('\n');
  return `{${entries}}`;
}

export const handler = async function (argv: any) {
  console.log(`Initializing ${argv.file}`);
  switch (argv.file) {
    case 'config': {
      const rawConfig = await init_config();
      if (!rawConfig) throw new Error('Can not initialize with undefined configuration');
      const filteredConfig = filterDefaults(rawConfig);
      console.log(`Writing to ./hackium.config.js`);
      const config = `module.exports = ${toAlmostJSON(filteredConfig)};`;
      await fs.writeFile('hackium.config.js', prettify(config), 'utf-8');
      break;
    }
    case 'interceptor': {
      const rawConfig = await init_interceptor();
      if (!rawConfig) throw new Error('Can not initialize with undefined configuration');
      try {
        await writeTemplate(templates.get(rawConfig.type), rawConfig.name);
      } catch (e) {
        console.log('\nError: ' + e.message);
      }
      break;
    }
    case 'script':
      break;
  }
}
