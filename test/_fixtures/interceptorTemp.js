const { patterns } = require('../../dist/src');

exports.intercept = patterns.Script('*.js');

exports.interceptor = function (hackium, interception) {
  const response = interception.response;
  response.body += `;window.interceptedVal = 'interceptedValHotload';`;
  return response;
};
