import inquirer from 'inquirer';
import { defaultSignal } from '../../arguments';
import { copyTemplate } from './util';

export default async function initialize() {
  return inquirer
    .prompt([
      {
        name: 'url',
        message: 'What URL do you want to load by default?',
        default: defaultSignal,
      },
      // {
      //   name: 'adblock',
      //   message: "Do you want to block ads?",
      //   default: true,
      //   type: 'confirm'
      // },
      {
        name: 'devtools',
        message: 'Do you want to open devtools automatically?',
        default: true,
        type: 'confirm',
      },
      {
        name: 'inject',
        message: 'Do you want to create a blank JavaScript injection?',
        default: false,
        type: 'confirm',
      },
      {
        name: 'interceptor',
        message: 'Do you want to add a boilerplate interceptor?',
        default: false,
        type: 'confirm',
      },
      {
        name: 'execute',
        message: 'Do you want to add a boilerplate Hackium script?',
        default: false,
        type: 'confirm',
      },
      {
        name: 'headless',
        message: 'Do you want to run headless?',
        default: false,
        type: 'confirm',
      },
    ])
    .then(async (answers) => {
      if (answers.inject) answers.inject = [await copyTemplate('inject.js')];
      else answers.inject = [];
      if (answers.interceptor) answers.interceptor = [await copyTemplate('interceptor.js')];
      else answers.interceptor = [];
      if (answers.execute) answers.execute = [await copyTemplate('script.js')];
      else answers.execute = [];
      return answers;
    })
    .catch((error) => {
      console.log('Init error');
      console.log(error);
    });
}
