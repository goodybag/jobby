var assert = require('assert');
var Jobby = require('../');

var jobby = new Jobby({
  conString: 'postgres://localhost/scheduled_jobs_test'
});

describe('Jobby', function() {
  describe('#define', function() {
    it('should define a new job handler', function() {
      assert(!('foo' in jobby.definitions) );
      jobby.define('foo', function() {});
      assert('foo' in jobby.definitions );
      assert(typeof jobby.definitions.foo === 'function');
    });

    it('should throw error defining job twice', function() {
      assert.throws(function() {
        jobby.define('bar', function() {});
        jobby.define('bar', function() {});
      }, Error);
    });

    it('should throw error for incorrect param types', function() {
      assert.throws(function() {
        jobby.define(function() {}, 'apple');
      }, Error);
    });
  });

});
