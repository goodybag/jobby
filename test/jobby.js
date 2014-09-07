var assert = require('assert');
var Jobby = require('../');
var jobs;

describe('Jobby', function() {
  after(function(done) {
    jobs.db.query('drop table jobs', function(err){
      if (err) throw err;
      done();
    });
  });

  before(function(done){
    jobs = new Jobby({
      conString: 'postgres://localhost/scheduled_jobs_test',
      processInterval: 10
    });
    jobs.on('setup:complete', done);
  });

  beforeEach(function(done) {
    jobs.definitions = {};
    jobs.db.query('delete from jobs', done);
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

  describe('#events', function() {
    before(function() {
      jobs.start();
    });

    after(function() {
      jobs.stop();
    });

    it('emits start event', function(callback) {
      jobs.define('cat', function(job, done) { done(); });
      jobs.schedule('cat');
      jobs.once('start', function(job) {
        assert(job.status === 'in-progress');
        callback();
      });
    });

    it('emits start:type event', function(callback) {
      jobs.define('cat', function(job, done) { done(); });
      jobs.schedule('cat');
      jobs.once('start:cat', function(job) {
        assert(job.status === 'in-progress');
        callback();
      });
    });

    it('emits retry event', function(callback) {
      jobs.define('dog', function(job, done) { done(new Error('woof')); });
      jobs.schedule('dog', {retryLimit: 2});
      jobs.once('retry', function(err, job) {
        callback();
      });
    });

    it('emits retry:type event', function(done) {
      jobs.define('dog', function(job, done) { done(new Error('woof')); });
      jobs.schedule('dog', {retryLimit: 2});
      jobs.once('retry:dog', function(err, job) {
        done();
      });
    });

    it('emits fail event', function(done) {
      jobs.define('bird', function(job, done) { done('woops'); });
      jobs.schedule('bird');
      jobs.once('fail', function(err, job) {
        assert(job.status === 'failed');
        done();
      });
    });

    it('emits success event', function(done) {
      jobs.define('bird', function(job, done) { done(); });
      jobs.schedule('bird');
      jobs.once('success', function(job) {
        assert(job.status === 'completed');
        done();
      });
    });

    it('emits complete event after success', function(done) {
      jobs.define('bird', function(job, done) { done(); });
      jobs.schedule('bird');
      jobs.once('complete', function(job) {
        assert(job.status === 'completed');
        done();
      });
    });
  });
});
