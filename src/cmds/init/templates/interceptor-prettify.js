
const prettier = require('prettier');

function prettify(src) {
  return prettier.format(src, { parser: "babel" });
}

exports.intercept = [
  {
    urlPattern: '*',
    resourceType: 'Script',
    requestStage: 'Response'
  }
];

exports.interceptor = async function (browser, interception, debug) {
  const { request, response } = interception;
  debug(`Prettifying ${request.url}`);
  response.body = prettify(response.body);
  return response;
}
