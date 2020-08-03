import inquirer from 'inquirer';
import { SafeMap } from '../../util/SafeMap';

export const templates = new SafeMap([
  ['Basic interceptor template', 'interceptor.js'],
  ['Pretty printer', 'interceptor-prettify.js'],
  ['JavaScript transformer using shift-refactor', 'interceptor-refactor.js'],
]);

export default async function initialize() {
  return inquirer
    .prompt([
      {
        name: 'name',
        message: 'Filename:',
        default: 'script.js',
        type: 'string',
      },
    ])
    .catch((error) => {
      console.log('Init error');
      console.log(error);
    });
}
