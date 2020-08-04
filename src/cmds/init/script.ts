import inquirer from 'inquirer';

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
