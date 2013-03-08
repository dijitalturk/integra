var format = require('util').format
  , Formatter = require('./formatter').Formatter
  , TestSuite = require('./test_suite').TestSuite
  , EventEmitter = require('events').EventEmitter
  , inherits = require('util').inherits;

var Runner = function() {  
  EventEmitter.call(this);

  this.configuration = null;
  this.formatter = new Formatter();
  this.tests = {};
}

inherits(Runner, EventEmitter);

Runner.configurations = function(configuration) {  
  var runner = new Runner();
  runner.configuration = configuration;
  runner.execute_serially = false;
  return runner;
}

Runner.prototype.exeuteSerially = function(execute_serially) {
  this.execute_serially = execute_serially;
  return this;
}

Runner.prototype.add = function(suite_name, test_files) {
  this.tests[suite_name] = new TestSuite(this, this.formatter, this.configuration, suite_name, test_files);
  return this;
}

Runner.prototype.run = function(config_name) {  
  var keys = Object.keys(this.tests);
  var number_of_tests = keys.length;
  var self = this;
  if(config_name == null) throw new Error("The name of a configuration to run against must be provided");

  // Execute all the test suites
  for(var i = 0; i < keys.length; i++) {
    var test_suite = this.tests[keys[i]];
    // Execute the test suite
    test_suite.execute(config_name, {
        execute_serially: this.execute_serially
      , number_of_contexts: 1
      , parallelize_level: 'file'
    }, function(err, results) {
      number_of_tests = number_of_tests - 1;

      // Finished test running
      if(number_of_tests == 0) {
        var configuration = test_suite.configuration.get(config_name);
        // Execute the stop part of the configuration
        configuration.stop(function() {
          var total_number_of_assertions = 0;
          for(var i = 0; i < test_suite.test_controls.length; i++) {
            total_number_of_assertions += test_suite.test_controls[i].number_of_assertions;
          }

          // Emit end event
          self.emit("end");
        });
      }
    });
  }
}

exports.Runner = Runner;











