var pg = require('pg');

var db = module.exports = function(config){
  config = config || {};
  this.conString = config.conString;
  this.table = config.table;
};

db.prototype.noop = function() {};
db.prototype.query = function(query, vals, callback) {
  if (typeof vals === 'function') {
    callback = vals;
    vals = null;
  }
  callback = callback || this.noop;

  pg.connect(this.conString, function(err, client, done) {
    if (err) {
      return callback(err);
    }

    client.query(query, vals, function(err, result) {
      done();
      if (err) {
        return callback(err);
      }

      return callback(null, result.rows[0]);
    });
  });
};

db.prototype.schedule = function(type, job, callback) {
  var query = 'insert into ' + this.table + ' ("type", "status", "when", "data", "retryLimit") values ($1, $2, $3, $4, $5)';
  var vals = [
    type
  , 'pending'
  , job.when
  , job.data
  , job.retryLimit
  ];
  this.query(query, vals, callback);
};
