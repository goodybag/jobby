var assert = require('assert');
var Jobby = require('../');
var jobs;

describe('jobs', function() {
  after(function() {
    jobs.query('drop table jobs', function(err){
      if (err) throw err;
    });
  });

  before(function(done){
    jobs = new Jobby({
      conString: 'postgres://localhost/scheduled_jobs_test',
      processInterval: 100
    });

    jobs.on('setup:complete', function() {
      done();
    });
  });

  beforeEach(function() {
    jobs.definitions = {};
  });

  describe('#define', function() {
    it('should define a new job handler', function() {
      assert(!('foo' in jobs.definitions) );
      jobs.define('foo', function() {});
      assert('foo' in jobs.definitions );
      assert(typeof jobs.definitions.foo === 'function');
    });

    it('should throw error defining job twice', function() {
      assert.throws(function() {
        jobs.define('bar', function() {});
        jobs.define('bar', function() {});
      }, Error);
    });

    it('should throw error for incorrect param types', function() {
      assert.throws(function() {
        jobs.define(function() {}, 'apple');
      }, Error);
    });
  });

  describe('#start/stop', function() {
    it('should start and stop', function() {
      assert(!jobs._intervalId);
      jobs.start();
      assert(jobs._intervalId);
      jobs.stop();
      assert(!jobs._intervalId);
    });
  });

  describe('events', function() {
    it('emits start event', function(callback) {
      jobs.define('cat', function(job, done) { done(); });
      jobs.schedule('cat', {}, function() {});
      jobs.start();
      jobs.on('start', function(job) {
        jobs.stop();
        callback();
      });
    });

    it('emits retry event', function(done) {
      assert(false);
      done();
    });

    it('emits fail event', function(done) {
      assert(false);
      done();
    });

    it('emits success event', function(done) {
      assert(false);
      done();
    });

    it('emits complete event', function(done) {
      assert(false);
      done();
    });
  });
});
