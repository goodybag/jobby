var Jobby = require('./');

var jobby = new Jobby();

jobby.query('select now()', function(err, result) {
  console.log(arguments);
});
