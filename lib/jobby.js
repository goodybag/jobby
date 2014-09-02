var util = require('util');
var EventEmitter = require('events').EventEmitter;
var pg = require('pg');

var Jobby = function(opts) {
  opts = opts || {};

  this._dbName = opts.dbName || 'scheduled_jobs';
  this._dbTable = opts.dbTable || 'jobs';
  this._conString = opts.conString || 'postgres://localhost/scheduled_jobs';
  this._processInterval = opts.processInterval || 5000;
  this.definitions = opts.definitions || {};
};

util.inherits(Jobby, EventEmitter);

Jobby.prototype.query = function(query, vals, callback) {
  if (typeof vals === 'function') {
    callback = vals;
    vals = null;
  }

  pg.connect(this._conString, function(err, client, done) {
    if (err) {
      console.log(err);
      return callback(err);
    }

    client.query(query, vals, function(err, result) {
      done();
      if (err) {
        return callback(err);
      }

      callback(null, result.rows);
    });
  });
};

Jobby.prototype.schedule = function(job, callback) {

};

Jobby.prototype.define = function(type, fn) {
  if (type in this.definitions) {
    return fn(new Error('Already defined job type: ' + type));
  } else if (typeof type !== 'string' || typeof fn !== 'function') {
    return fn(new Error('Incorrect job definition: type must be `string` and fn must be a `function`'));
  }

  this.definitions = fn;
};

Jobby.prototype.start = function() {
  if (this._intervalId !== null) throw new Error('Scheduler has already started');
  this._intervalId = setInterval(this.rum, this._processInterval);
};

Jobby.prototype.stop = function() {
  clearInterval = this._intervalId;
  this._intervalId = null;
};

Jobby.prototype.run = function() {
  // get pending job

  // run and emit job metadata
};
module.exports = Jobby;
