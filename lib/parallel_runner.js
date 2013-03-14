var Formatter = require('./formatter').Formatter
  , TestSuite = require('./test_suite').TestSuite
  , EventEmitter = require('events').EventEmitter
  , inherits = require('util').inherits;

var ParallelRunner = function() {
  EventEmitter.call(this);

  this.configuration = null;
  this.formatter = new Formatter();
  this.configurations = [];
  this.tests = {};
  this.execute_serially = false;
  this.number_of_contexts = 1;
  this.parallelize_level = ParallelRunner.TEST;
}

inherits(ParallelRunner, EventEmitter);

// At what level to parallelize
ParallelRunner.TEST = 'test';
ParallelRunner.FILE = 'file';

ParallelRunner.prototype.exeuteSerially = function(execute_serially) {
  this.execute_serially = execute_serially;
  return this;
}

ParallelRunner.prototype.parallelContexts = function(number_of_contexts) {
  this.number_of_contexts = number_of_contexts;
  return this;
}

ParallelRunner.prototype.parallelizeAtLevel = function(level) {
  this.parallelize_level = level;
  return this;
}

ParallelRunner.prototype.schedulerHints = function(schedulerHints) {
  this.schedulerHints = schedulerHints;
  return this;
}

ParallelRunner.configurations = function(configuration) {  
  var runner = new ParallelRunner();
  runner.configuration = configuration;
  return runner;
}

ParallelRunner.prototype.add = function(suite_name, test_files) {
  this.tests[suite_name] = new TestSuite(this, this.formatter, this.configuration, suite_name, test_files, {
      testStatisticsCallback: this.testStatisticsCallback
    , schedulerHints: this.schedulerHints
  });
  return this;
}

var process_testsuites_serially = function(self, config_name, tests, test_names, options, callback) {
  var test_suite_name = test_names.pop();
  var test_suite = tests[test_suite_name];

  // Emit the start of a test suite
  self.emit("testsuite_start", test_suite);
  // Execute the test suite in parallel
  test_suite.execute_parallel(config_name, options, function(err, results) {
    self.emit("testsuite_end", test_suite);

    if(test_names.length > 0) {
      process_testsuites_serially(self, config_name, tests, test_names, options, callback);
    } else {
      callback(null);
    }
  });
}

ParallelRunner.prototype.run = function(config_name, options) {  
  var self = this;
  var keys = Object.keys(this.tests);
  options = options ? options : {}
  if(config_name == null) throw new Error("The name of a configuration to run against must be provided");

  // If single test run single context
  if(options.test) this.number_of_contexts = 1;

  // Options
  var test_suite_options = {
      number_of_contexts: this.number_of_contexts
    , execute_serially: this.execute_serially
    , parallelize_level: this.parallelize_level
  }

  // Merge in any options
  for(var name in options) test_suite_options[name] = options[name];

  // Execute the test suites
  process_testsuites_serially(self, config_name, this.tests, keys, test_suite_options, function(err) {
    // Get keys again
    keys = Object.keys(self.tests);
    // All configurations we need to stop
    var configurations = [];
    // Execute the stop part of the configuration
    for(var i = 0; i < keys.length; i++) {
      var test_suite = self.tests[keys[i]];
      configurations = configurations.concat(test_suite.configuration.all(config_name));
    }

    var number_of_configs = configurations.length;
    for(var i = 0; i < configurations.length; i++) {
      configurations[i].stop(function() {
        number_of_configs = number_of_configs - 1;

        if(number_of_configs == 0) {
          // Emit end event
          self.emit("end");
        }
      })
    }
  });
}

exports.ParallelRunner = ParallelRunner;