Jobby
===

Easy job scheduling for node persisted by Postgres.

### Features
* Supports scheduling recurring and one-off jobs via cron strings and datetimes
* Emits events per job so you can easily hook up logging or profiling
* Handles multiple workers by locking job processes

### Usage

Worker scripts
```javascript
var Jobby = require('jobby');
var mailer = require('./path/to/mailer');
var jobby = new Jobby();

jobby.define('email new user', function(job, done) {
  var mail = {
    to: job.data.to
  , from: job.data.from
  , subject: 'Welcome!'
  };

  mailer.send(mail, done);
});

// Begin processing jobs on the queue
jobby.start();
```

Schedule jobs

```javascript
jobby.schedule('email new user', {
  when: '2014-01-13 14:30'
, data: {
    from: 'john@goodybag.com'
  , to: 'bill.gates@microsoft.com'
  , subject: 'Welcome!'
  }
});
```

API
---

### new Jobby([config])

Creates a new Jobby with an optional config parameter:


  * processInterval - The interval in milliseconds (default 5000) by which to process jobs
  * definitions - Job definitions object keyed by job type to handler function

```js
var jobby = new Jobby({
  dbName: 'scheduled_jobs' // default `scheduled jobs`
, dbTable: 'jobs'
, processInterval: 1000 // in milliseconds, default 5000ms

// declare job handler functions
, definitions: {
    'email user': function(job, done) { ... }
  , 'debit user': function(job, done) { ... }
  }
});
```

### define(type, fn)

Registers a handler function for a job type.

* __type__ - string for job type
* __fn(job, done)__ - function for consuming a job
  * job object
  * done(err, result) callback

```js
jobby.define('email user', function(job, done) {
  mailer.send({
    to: job.data.to
  , from: job.data.from
  , subject: 'Hey there'
  }, done);
});
```

### schedule(type, job)

Places job on the scheduler queue.

* __type__ - string for job type
* __job__ - object containing job data

Example with all job options:

```js
jobby.schedule('welcome user', {
  when: new Date('2014-02-12 14:00') // Date Object or cron string, default `new Date()`
, data: {
    to: 'John@goodybag.com'
  , from: 'support@goodybag.com'
  , subject: 'Welcome!'
  }
, retryLimit: 3 // enables retrying job before failing, default 0
});
```

### start()

Begin processing job queue.

```js
jobby.start();
```

### stop()

Stop processing jobs.

```js
jobby.stop();
```

Events
---

Jobby instances emit various key events per job:

* __start__ - emits `job` object upon starting a new job
* __complete__ - emits `job` object upon completing job regardless of success or failure
* __success__ - emits `job` object upon job completing successfully
* __fail__ - emits `error` and `job` object upon job failing


For example:

```javascript
jobby.on('start', function(job) {
  console.log('Job %s starting', job.type);
});
```

All events may also be appended with `:job name` for specific job types.

```javascript
jobby.on('success:email user', function(job) {
  console.log('User notified %s', job.data.email);
});

jobby.on('fail:email user', function(error, job) {
  console.log('Could not email %s: %s', job.data.email, error.message);
});
```

Environment Configuration
---

By default, `jobby.start()` will begin processing all pending
jobs in the queue. If you want to specify certain types per workers you
can set up the environment variable `JOB_TYPES`.


For example, if you only want to process job types `email` and `image-processing`:
```
JOB_TYPES=email,image-processing node worker.js
```
