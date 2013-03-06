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

Runner.prototype.exeuteSerially = function(execute_serially) {
  this.execute_serially = execute_serially;
  return this;
}

Runner.prototype.add = function(suite_name, test_files) {
  this.tests[suite_name] = new TestSuite(this.formatter, this.configuration, suite_name, test_files);
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
    console.dir(configurations)
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

var process_files_serially = function(test_suite, configuration, files, options, callback) {
  var file = files.pop();

  runFile(test_suite, configuration, file, options, function() {
    if(files.length > 0) {
      process.nextTick(function() {
        process_files_serially(test_suite, configuration, files, options, callback);
      });
    } else {
      callback(null, []);
    }
  });
}

var process_files = function(test_suite, configuration, files, options, callback) {
  var number_of_files = files.length;
  // Load all the files
  for(var i = 0; i < files.length; i++) {
    console.log('\n' + test_suite.formatter.bold(files[i]));

    runFile(test_suite, configuration, files[i], options, function() {
      number_of_files = number_of_files - 1;

      if(number_of_files == 0) {
        callback(null, []);
      }
    });
  }
}

TestSuite.prototype.execute_parallel = function(config_name, options, callback) {
  // console.log("================= execute test suite :: " + config_name)
  // console.dir(options)
  var self = this;
  var buckets = [];
  var buckets_left = options.number_of_contexts;
  for(var i = 0; i < options.number_of_contexts; i++) buckets[i] = [];

  // Start all the configurations
  this.configuration.createAndStart(config_name, options.number_of_contexts, function(err, configurations) {

    var index = 0;
    
    // Let's split files into x parallel buckets and distribute them
    for(var i = 0; i < self.files.length; i++) {
      buckets[index].push(self.files[i]);
      index = (index + 1) % options.number_of_contexts;
    }

    // Handle tests done
    var done = function(err) {
      // console.log("=================================================== DONE")
      buckets_left = buckets_left - 1;

      if(buckets_left == 0) {
        callback();
      }
    }

    // Run each bucket of files separately
    for(var i = 0; i < buckets.length; i++) {
      // console.log("========================== EXECUTE BUCKTS")

      if(options.execute_serially) {
        // console.log("=================================================== EXECUTE SERIALLY")
        // console.dir(buckets[i])
        process_files_serially(self, configurations[i], buckets[i], options, done);
      } else {
        // console.log("=================================================== EXECUTE PARALLEL")
        // console.dir(buckets[i])
        process_files(self, configurations[i], buckets[i], options, done);        
      }
    }


    // console.log("======================= DONE");
    // console.dir(configurations);
    // process.exit(0);
  });
}

TestSuite.prototype.execute = function(config_name, options, callback) {
  var self = this;
  // First run the the start part of the configuration
  var configuration = this.configuration.get(config_name);

  // Configuration start
  configuration.start(function() {
    if(options.execute_serially) {
      return process_files_serially(self, configuration, self.files, options, callback);
    } else {
      return process_files(self, configuration, self.files, options, callback);
    }
  });
}

var process_tests_serially = function(test_suite, tests, test_names, configuration, file_name, options, callback) {
  var test_name = test_names.pop();
  // Test control
  var test_control = new TestControl(configuration.name, file_name, test_name);
    
  // Done function
  var done_function = function(_test_control) {
    return function() {
      // Execute the tear down function
      configuration.teardown(function() {
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
            process_tests_serially(test_suite, tests, test_names, configuration, file_name, options, callback);
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
  configuration.setup(function() {
    // Execute the test
    tests[test_name].apply(tests, [configuration, test_control]);
  });
}

var runFile = function(test_suite, configuration, file_name, options, callback) {
  var test = require(process.cwd() + file_name);
  var keys = Object.keys(test);
  var number_of_tests = keys.length;

  // Execute serially
  if(options.execute_serially) {
    return process_tests_serially(test_suite, test, keys, configuration, file_name, options, callback);
  }


  // Iterate over all the functions
  for(var name in test) {    
    // Test control
    var test_control = new TestControl(configuration.name, file_name, name);
    
    // Done function
    var done_function = function(_test_control) {
      return function() {
        // Execute the tear down function
        configuration.teardown(function() {
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
        configuration.setup(function() {
          // Execute the test
          _test[_name].apply(_test, [configuration, _test_control]);          
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
exports.ParallelRunner = ParallelRunner;











