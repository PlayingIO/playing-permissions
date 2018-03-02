if (!global._babelPolyfill) { require('babel-polyfill'); }

module.exports.Rule = require('./lib/rule');
module.exports.RuleBuilder = require('./lib/builder');
