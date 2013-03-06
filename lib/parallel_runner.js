var Formatter = require('./formatter').Formatter
  TestSuite = require('./test_suite').TestSuite;

var ParallelRunner = function() {
  this.configuration = null;
  this.formatter = new Formatter();
  this.configurations = [];
  this.tests = {};
  this.execute_serially = false;
  this.number_of_contexts = 1;
}

ParallelRunner.prototype.exeuteSerially = function(execute_serially) {
  this.execute_serially = execute_serially;
  return this;
}

ParallelRunner.prototype.parallelContexts = function(number_of_contexts) {
  this.number_of_contexts = number_of_contexts;
  return this;
}

ParallelRunner.configurations = function(configuration) {  
  var runner = new ParallelRunner();
  runner.configuration = configuration;
  return runner;
}

ParallelRunner.prototype.add = function(suite_name, test_files) {
  this.tests[suite_name] = new TestSuite(this.formatter, this.configuration, suite_name, test_files);
  return this;
}

var process_testsuites_serially = function(config_name, tests, test_names, options, callback) {
  var test_suite_name = test_names.pop();
  var test_suite = tests[test_suite_name];

  test_suite.execute_parallel(config_name, options, function(err, results) {
    if(test_names.length > 0) {
      process_testsuites_serially(config_name, tests, test_names, options, callback);
    } else {
      callback(null);
    }
  });
}

ParallelRunner.prototype.run = function(config_name) {  
  var self = this;
  var keys = Object.keys(this.tests);
  if(config_name == null) throw new Error("The name of a configuration to run against must be provided");

  // Options
  var options = {
      number_of_contexts: this.number_of_contexts
    , execute_serially: this.execute_serially
  }

  // Execute the test suites
  process_testsuites_serially(config_name, this.tests, keys, options, function(err) {
    // Get keys again
    keys = Object.keys(self.tests);
    // All configurations we need to stop
    var configurations = [];
    // // Execute the stop part of the configuration
    for(var i = 0; i < keys.length; i++) {
      var test_suite = self.tests[keys[i]];
      configurations = configurations.concat(test_suite.configuration.all(config_name));
    }

    var number_of_configs = configurations.length;
    for(var i = 0; i < configurations.length; i++) {
      configurations[i].stop(function() {
        number_of_configs = number_of_configs - 1;

        if(number_of_configs == 0) {
          process.exit(0);
        }
      })
    }
  });
}

exports.ParallelRunner = ParallelRunner;