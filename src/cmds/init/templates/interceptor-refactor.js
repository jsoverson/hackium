
const { parseScript } = require('shift-parser');
const { RefactorSession } = require('shift-refactor');

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

  const ast = parseScript(response.body);

  const refactor = new RefactorSession(ast);

  // replace all console.log(...) expressions with alert(...) calls
  // see https://jsoverson.github.io/shift-query-demo/ for an interactive query sandbox 
  // and https://github.com/jsoverson/shift-refactor for refactor API
  refactor.replace(`CallExpression[callee.object.name='console'][callee.property='log']`, node => {
    return new Shift.CallExpression({
      callee: new Shift.IdentifierExpression({ name: 'alert' }),
      arguments: node.arguments
    });
  })

  response.body = refactor.print();
  return response;
}
