await page.goto('https://example.com');

const newPage = await browser.newPage();

await newPage.goto('https://google.com');

await newPage.type('[aria-label=Search]', 'hackium\n');
