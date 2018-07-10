const Aces = require('./aces');
const AceBuilder = require('./builder');
const { rulesToQuery, toMongoQuery } = require('./query');
const Rule = require('./rule');
const authorize = require('./hooks/authorize');

module.exports = {
  Aces,
  AceBuilder,
  authorize,
  rulesToQuery,
  toMongoQuery,
  Rule
};