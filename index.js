if (!global._babelPolyfill) { require('babel-polyfill'); }

module.exports = require('./lib/query');
module.exports.Rule = require('./lib/rule');
module.exports.RuleBuilder = require('./lib/builder');
