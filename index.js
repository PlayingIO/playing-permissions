if (!global._babelPolyfill) { require('babel-polyfill'); }

const ramda = require('ramda');
const func = require('./lib/function');
const list = require('./lib/list');
const logic = require('./lib/logic');
const math = require('./lib/math');
const object = require('./lib/object');
const relation = require('./lib/relation');
const string = require('./lib/string');
const type = require('./lib/type');

module.exports = Object.assign(ramda,
  func, list, logic, math, object, relation, string, type
);
