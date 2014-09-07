var util = require('util');
var db = require('./db');
var EventEmitter = require('events').EventEmitter;

var Jobby = function(opts) {
  opts = opts || {};

  this._dbName = opts.dbName || 'scheduled_jobs';
  this._processInterval = opts.processInterval || 5000;
  this.definitions = opts.definitions || {};

  this.db = new db({
    conString: opts.conString || 'postgres://localhost/scheduled_jobs'
  , table: opts.table || 'jobs'
  });

  this._setup();
};

util.inherits(Jobby, EventEmitter);

Jobby.prototype.schedule = function(type, job, callback) {
  job = job || {};
  job.when = job.when || new Date();
  job.data = JSON.stringify(job.data || {});
  job.retryLimit = job.retryLimit || 0;
  this.db.schedule(type, job, callback);
};

Jobby.prototype.define = function(type, fn) {
  if (type in this.definitions) {
    throw new Error('Already defined job type: ' + type);
  } else if (typeof type !== 'string' || typeof fn !== 'function') {
    throw new Error('Incorrect job definition: type must be `string` and fn must be a `function`');
  }

  this.definitions[type] = fn;
};

Jobby.prototype.start = function() {
  if (this._intervalId !== undefined) throw new Error('Scheduler has already started');
  this._intervalId = setInterval(this.run.bind(this), this._processInterval);
};

Jobby.prototype.stop = function() {
  clearInterval(this._intervalId);
  this._intervalId = undefined;
};

/**
 * 1. Fetches a `pending` job
 * 2. Switch job status to `in-progress`
 * 3. Work on job
 */
Jobby.prototype.run = function() {
  var self = this;
  var query = 'with pending_job as (select * from jobs where status = \'pending\' limit 1)';
  query += 'update jobs set status = \'in-progress\' from pending_job where pending_job.id = jobs.id returning jobs.*';
  this.db.query(query, function(error, job) {
    if (error) self.emit('job:error', error);
    if (!job) return;
    self.emit('start', job);
    self.emit('start:' + job.type, job);
  });
};

Jobby.prototype.on('start', function(job) {
  var self = this;
  var query, vals;
  if (job && job.type in self.definitions) {
    var fn = self.definitions[job.type];
    fn(job, function(err) {
      if ( err && job.retries < job.retryLimit ) {
        query = 'update ' + self.db.table + ' set retries = retries + 1, status=\'pending\' where id = $1 returning *';
        vals = [job.id];
        self.db.query(query, vals, function(err, job) {
          if (err) return self.emit('job:error', err, job);
          self.emit('retry', err, job);
          self.emit('retry:' + job.type, err, job);
        });
      } else if ( err ) {
        query = 'update ' + self.db.table + ' set status = \'failed\' where id = $1 returning *';
        vals = [job.id];
        self.db.query(query, vals, function(err, job) {
          if (err) return self.emit('job:error', err, job);
          self.emit('fail', err, job);
          self.emit('fail:' + job.type, err, job);
        });
      } else {
        query = 'update ' + self.db.table + ' set status = \'completed\' where id = $1 returning *';
        vals = [job.id];
        self.db.query(query, vals, function(err, job) {
          if (err) return self.emit('job:error', err, job);
          self.emit('success', job);
          self.emit('success:' + job.type, job);
        });
      }
    });
  }
});

Jobby.prototype.on('success', function(job) {
  var self = this;
  self.emit('complete', job);
  self.emit('complete:' + job.type, job);
});

Jobby.prototype.on('fail', function(err, job) {
  var self = this;
  self.emit('complete', job);
  self.emit('complete:' + job.type, job);
});

Jobby.prototype._setup = function() {
  this._setupTypes();
};

/**
 * job_status = pending | in-progress | completed | failed
 */
Jobby.prototype._setupTypes = function() {
  var self = this;
  self.db.query('select exists (select 1 from pg_type where typname = \'job_status\')', function(err, result) {
    if (err) return self.emit('setup:error', err);
    if (result.exists) return self._setupTables();
    self.db.query('create type job_status as enum (\'pending\', \'in-progress\', \'completed\', \'failed\')', function(err) {
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
  , '"retryLimit" int default 0'
  ].join(', ');
  var create = 'create table if not exists "' + self.db.table + '" ( ' + cols +  ' )';
  this.db.query(create, function(err){
    if(err) return self.emit('setup:error', err);
    self.emit('setup:complete');
  });
};

Jobby.prototype.on('setup:error', function(error) {
  console.error('Unable to setup Jobby');
  throw error;
});

module.exports = Jobby;
