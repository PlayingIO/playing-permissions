var env = require('./index');
var path = require('path');
var configPath = path.join(__dirname, 'config');
console.log('configPath', configPath);
const config = env.create(configPath).config;
console.log('defaultKey', config.get('defaultKey'));
console.log('devKey', config.get('devKey'));
console.log('host', config.get('host'));