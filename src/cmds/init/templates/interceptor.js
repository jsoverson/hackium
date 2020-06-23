
exports.intercept = [
  {
    urlPattern: '*',
    resourceType: 'Script',
    requestStage: 'Response'
  }
];

exports.interceptor = async function (browser, interception, debug) {
  const { request, response } = interception;
  debug(`Intercepted: ${request.url}`);
  response.body += `\n;console.log('(Hackium v${await browser.version()}): intercepted and modified ${request.url}');\n`
  return response;
}
