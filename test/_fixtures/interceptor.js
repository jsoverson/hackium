const { patterns } = require('puppeteer-interceptor');

exports.intercept = patterns.Script('*.js');

exports.interceptor = function (hackium, interception) {
  const response = interception.response;
  response.body += `;window.interceptedVal = 'interceptedValue';`;
  return response;
};
