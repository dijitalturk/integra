var assert = require('assert')
  , format = require('util').format;

var Runner = function() {  
  this.configuration = null;
  this.formatter = new Formatter();
  this.tests = {};
}

Runner.configurations = function(configuration) {  
  var runner = new Runner();
  runner.configuration = configuration;
  runner.execute_serially = false;
  return runner;
}

Runner.prototype.add = function(suite_name, test_files) {
  this.tests[suite_name] = new TestSuite(this.formatter, this.configuration, suite_name, test_files);
  return this;
}

Runner.prototype.exeuteSerially = function(execute_serially) {
  this.execute_serially = execute_serially;
  return this;
}

Runner.prototype.run = function(config_name) {  
  var keys = Object.keys(this.tests);
  var number_of_tests = keys.length;
  if(config_name == null) throw new Error("The name of a configuration to run against must be provided");

  // Execute all the test suites
  for(var i = 0; i < keys.length; i++) {
    var test_suite = this.tests[keys[i]];
    // Print info about test suite
    // console.log("\n==================================================================")
    // console.log(format("== Running test suite [%s]", test_suite.name))
    // console.log("==================================================================\n")
    // Execute the test suite
    test_suite.execute(config_name, {
      execute_serially: this.execute_serially
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


          // console.log("\n==================================================================")
          // console.log(format("number of assertions: %d", total_number_of_assertions));
          // console.log("==================================================================")

          process.exit(0);
        });
      }
    });
  }
}

//
// Wraps a test suite
//
var TestSuite = function(formatter, configuration, name, files) {
  this.formatter = formatter;
  this.configuration = configuration;
  this.name = name;
  this.files = files;  

  // Statistics
  this.test_controls = [];
}

var process_files_serially = function(test_suite, config_name, files, options, callback) {
  var file = files.pop();

  runFile(test_suite, config_name, file, options, function() {
    if(files.length > 0) {
      process.nextTick(function() {
        process_files_serially(test_suite, config_name, files, options, callback);
      });
    } else {
      callback(null, []);
    }
  });
}

TestSuite.prototype.execute = function(config_name, options, callback) {
  var self = this;
  var number_of_files = this.files.length;

  // First run the the start part of the configuration
  var configuration = this.configuration.get(config_name);

  // Configuration start
  configuration.start(function() {
    if(options.execute_serially) {
      return process_files_serially(self, config_name, self.files, options, callback);
    }

    // Load all the files
    for(var i = 0; i < self.files.length; i++) {
      console.log('\n' + self.formatter.bold(self.files[i]));

      runFile(self, config_name, self.files[i], options, function() {
        number_of_files = number_of_files - 1;

        if(number_of_files == 0) {
          callback(null, []);
        }
      });
    }
  });
}

var process_tests_serially = function(test_suite, tests, test_names, config_name, file_name, options, callback) {
  var test_name = test_names.pop();
  // Test control
  var test_control = new TestControl(config_name, file_name, test_name);
    
  // Done function
  var done_function = function(_test_control) {
    return function() {
      // Execute the tear down function
      test_suite.configuration.get(config_name).teardown(function() {
        // If we have no assertion errors print test name
        if(_test_control.number_of_failed_assertions == 0) {
          console.log('✔ ' + _test_control.name);
        } else {
          console.log(test_suite.formatter.error('✖ ' + _test_control.name));
          // Assertions
          _test_control.assertions.forEach(function (a) {
            console.log('Assertion Message: ' + test_suite.formatter.assertion_message(a.message));
            console.log(a.stack + '\n');
          });
        }

        if(test_names.length > 0) {
          process.nextTick(function() {
            process_tests_serially(test_suite, tests, test_names, config_name, file_name, options, callback);
          })
        } else {
          test_suite.test_controls.push(_test_control);
          callback(null, null);
        }
      });
    }
  }

  // Set up the done function
  test_control.done = done_function(test_control); 
  // Execute the test setup
  test_suite.configuration.get(config_name).setup(function() {
    // Execute the test
    tests[test_name].apply(tests, [test_suite.configuration.get(config_name), test_control]);
  });
}

var runFile = function(test_suite, config_name, file_name, options, callback) {
  var test = require(process.cwd() + file_name);
  var keys = Object.keys(test);
  var number_of_tests = keys.length;

  // Execute serially
  if(options.execute_serially) {
    return process_tests_serially(test_suite, test, keys, config_name, file_name, options, callback);
  }


  // Iterate over all the functions
  for(var name in test) {    
    // Test control
    var test_control = new TestControl(config_name, file_name, name);
    
    // Done function
    var done_function = function(_test_control) {
      return function() {
        // Execute the tear down function
        test_suite.configuration.get(config_name).teardown(function() {
          // If we have no assertion errors print test name
          if(_test_control.number_of_failed_assertions == 0) {
            console.log('✔ ' + _test_control.name);
          } else {
            console.log(test_suite.formatter.error('✖ ' + _test_control.name));
            // Assertions
            _test_control.assertions.forEach(function (a) {
              console.log('Assertion Message: ' + test_suite.formatter.assertion_message(a.message));
              console.log(a.stack + '\n');
            });
          }

          // Adjust the number of tests left to run
          number_of_tests = number_of_tests - 1;
          if(number_of_tests == 0) {
            test_suite.test_controls.push(_test_control);
            callback(null, null);
          }                
        });
      }
    }

    var execute_function = function(_test, _name, _test_control) {
      return function() {
        test_suite.configuration.get(config_name).setup(function() {
          // Execute the test
          _test[_name].apply(_test, [test_suite.configuration.get(config_name), _test_control]);          
        })
      }
    }

    // Set up the done function
    test_control.done = done_function(test_control); 
    // Execute it
    execute_function(test, name, test_control)();
  }  
}

var TestControl = function(config_name, file_name, name) {
  this.config_name = config_name;
  this.file_name = file_name;
  this.name = name;
  // Add the basic stats  
  this.number_of_assertions = 0;
  this.number_of_failed_assertions = 0;
  this.number_of_successful_assertions = 0;
  // Caught errors
  this.assertions = [];
}

TestControl.prototype.ok = function(value, description) {
  this.number_of_assertions++;

  try {
    assert.ok(value, description);    
    this.number_of_successful_assertions++;
  } catch(err) {
    this.assertions.push(err);
    this.number_of_failed_assertions++;
  }
}

TestControl.prototype.equal = function(expected, value, description) {
  this.number_of_assertions++;

  try {
    assert.equal(expected, value, description);
    this.number_of_successful_assertions++;
  } catch(err) {
    this.assertions.push(err);
    this.number_of_failed_assertions++;
  }
}

//
// Output helper
//
var Formatter = function() {
  // Output helpers
  this.options = { error_prefix: '\u001b[31m',
    error_suffix: '\u001b[39m',
    ok_prefix: '\u001b[32m',
    ok_suffix: '\u001b[39m',
    bold_prefix: '\u001b[1m',
    bold_suffix: '\u001b[22m',
    assertion_prefix: '\u001b[35m',
    assertion_suffix: '\u001b[39m' };  
}

Formatter.prototype.error = function (str) {
  return this.options.error_prefix + str + this.options.error_suffix;
}
  
Formatter.prototype.ok = function (str) {
  return this.options.ok_prefix + str + this.options.ok_suffix;
}
  
Formatter.prototype.bold = function (str) {
  return this.options.bold_prefix + str + this.options.bold_suffix;
}
  
Formatter.prototype.assertion_message = function (str) {
  return this.options.assertion_prefix + str + this.options.assertion_suffix;
}

exports.Runner = Runner;











