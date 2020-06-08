const promzard = require('promzard')

import fs from 'fs';

export const command = 'init [file]'

export const desc = 'Create boilerplate configuration/scripts'

export const builder = {
  file: {
    default: 'config',
    description: 'file to create',
    choices: ['config', 'interceptor', 'script']
  }
}

export const handler = function (argv: any) {
  console.log(`Initializing ${argv.file}`);
  switch (argv.file) {
    case 'config':
      promzard(require.resolve('./init/config'), {}, function (err: Error, data: any) {
        console.log(`Writing to ./hackium.config.js`);
        const config = `
        module.exports = ${JSON.stringify(data.default, null, 2)};\n`.trimStart();
        fs.writeFileSync('hackium.config.js', config, 'utf-8');
      })
      break;
    case 'interceptor':
      break;
    case 'script':
      break;
  }
}
