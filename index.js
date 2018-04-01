require = require("esm")(module/*, options*/);
console.time('playing-permissions import');
module.exports = require('./src/index');
console.timeEnd('playing-permissions import');
