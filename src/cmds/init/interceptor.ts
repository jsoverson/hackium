
import inquirer from 'inquirer';
import { defaultSignal } from '../../arguments';
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
        message: "Filename:",
        default: 'interceptor.js',
        type: 'string',
      },
      {
        name: 'type',
        message: "Which template would you like to use?",
        default: 0,
        choices: ['Basic interceptor template', 'Pretty printer', 'JavaScript transformer using shift-refactor'],
        type: 'list',
      },
    ])
    .catch(error => {
      console.log("Init error");
      console.log(error);
    });
};