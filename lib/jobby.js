var util = require('util');
var EventEmitter = require('events').EventEmitter;
var pg = require('pg');

var Jobby = function(opts) {
  opts = opts || {};

  this._dbName = opts.dbName || 'scheduled_jobs';
  this._dbTable = opts.dbTable || 'jobs';
  this._conString = opts.conString || 'postgres://localhost/scheduled_jobs';
  this._processInterval = opts.processInterval || 5000;
  this._intervalId = null;
  this.definitions = opts.definitions || {};

  this._setup();
};

util.inherits(Jobby, EventEmitter);

Jobby.prototype.noop = function() {};

Jobby.prototype.query = function(query, vals, callback) {
  if (typeof vals === 'function') {
    callback = vals;
    vals = null;
  }

  callback = callback || this.noop;

  pg.connect(this._conString, function(err, client, done) {
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

Jobby.prototype.schedule = function(type, job, callback) {

  job.when = job.when || new Date();

  var query = 'insert into ' + this._dbTable + ' ("type", "status", "when", "data") values ($1, $2, $3, $4)';
  var vals = [
    type
  , 'pending'
  , job.when
  , JSON.stringify(job.data)
  ];

  this.query(query, vals, callback);
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
  this._intervalId = setInterval(this.run.bind(this), this._processInterval);
};

Jobby.prototype.stop = function() {
  clearInterval = this._intervalId;
  this._intervalId = null;
};

Jobby.prototype.run = function() {
  // get pending job
  this.query('select * from ' + this._dbTable, function(err, results) {
    console.log(err, results);
  });

  // run and emit job metadata
};

Jobby.prototype._setup = function() {
  this._setupTypes();
};

Jobby.prototype._setupTypes = function() {
  var self = this;
  self.query('select exists (select 1 from pg_type where typname = \'job_status\')', function(err, result) {
    if (err) return self.emit('setup:error', err);
    if (result.exists) return self._setupTables();
    self.query('create type job_status as enum (\'pending\', \'in-progress\', \'completed\', \'failed\')', function(err) {
      if (err) return self.emit('setup:error', err);
      self._setupTables();
    });
  });
};

Jobby.prototype._setupTables = function() {
  var self = this;
  var cols = [
    'id serial primary key'
  , 'created_at timestamptz not null default now()'
  , 'type text'
  , 'data json'
  , 'status job_status'
  , '"when" timestamp'
  , 'retries int default 0'
  ].join(', ');
  var create = 'create table if not exists "' + self._dbTable + '" ( ' + cols +  ' )';
  this.query(create, function(err){
    if(err) return self.emit('setup:error', err);
    self.emit('setup:complete');
  });
};

Jobby.prototype.on('setup:error', function(error) {
  console.error('Unable to setup Jobby');
  throw error;
});

module.exports = Jobby;
