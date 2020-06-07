
await page.click('#button');
await page.click('#button');

page = await browser.newPage();

await page.goto(args[0]);

const body = await page.$('body');
const string = require('./module.js');
await page.evaluate((body, string) => { body.innerHTML = string }, body, string);
const result = await page.evaluate((body) => { body.innerHTML }, body);
