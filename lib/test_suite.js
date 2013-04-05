var TestControl = require('./test_control').TestControl
  , timers = require('timers');

// Set processor, setImmediate if 0.10 otherwise nextTick
var processor = timers.setImmediate ? timers.setImmediate : process.nextTick;

//
// Wraps a test suite
//
var TestSuite = function(runner, formatter, configuration, name, files, options) {
  this.runner = runner;
  this.formatter = formatter;
  this.configuration = configuration;
  this.name = name;
  this.files = files.filter(function(file) { return typeof file == 'string' });
  this.options = options ? options : {};
  // Statistics
  this.test_controls = [];
}

var process_files_serially = function(test_suite, configuration, files, options, callback) {
  var file = files.pop();
  if(file == null) return callback(null, []);
  var test = require(process.cwd() + file);

  // If we are running a single test
  if(options.test) {
    if(typeof test[options.test] == 'function') {
      var new_test_object = {};
      new_test_object[options.test] = test[options.test];
      test = new_test_object;
    } else {
      test = {};
    }
  }

  // Run tests
  runTests(test_suite, configuration, file, test, options, function() {
    if(files.length > 0) {
      processor(function() {
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
    var test = require(process.cwd() + files[i]);

    // If we are running a single test
    if(options.test) {
      if(typeof test[options.test] == 'function') {
        var new_test_object = {};
        new_test_object[options.test] = test[options.test];
        test = new_test_object;
      } else {
        test = {};
      }
    }

    // Run tests
    runTests(test_suite, configuration, files[i], test, options, function() {
      number_of_files = number_of_files - 1;

      if(number_of_files == 0) {
        callback(null, []);
      }
    });
  }
}

var process_parallel_tests_serially = function(self, configuration, tests, options, callback) {
  var test = tests.pop();

  // Let's run the test
  // Done function
  var done_function = function(_test_control) {
    return function() {
      // Set test end time
      _test_control.end_time = new Date();
      // Execute the tear down function
      configuration.teardown(function() {
        // If we have no assertion errors print test name
        if(_test_control.number_of_failed_assertions == 0) {
          console.log('✔ ' + _test_control.name);
        } else {
          console.log(self.formatter.error('✖ ' + _test_control.name));
          // Assertions
          _test_control.assertions.forEach(function (a) {
            console.log('Assertion Message: ' + self.formatter.assertion_message(a.message));
            console.log(a.stack + '\n');
          });
        }

        // Emit the test statistics
        processor(function() {
          self.runner.emit("test_done", _test_control);
        })

        // If we have more tests execute them
        if(tests.length > 0) {
          processor(function() {
            process_parallel_tests_serially(self, configuration, tests, options, callback);
          })
        } else {
          callback(null, []);
        }
      });
    }
  }

  // Return
  if(test == null) return callback(null, []);

  // Test control
  var test_control = new TestControl(configuration, test.file, test.name);
  test_control.done = done_function(test_control); 
  // Execute configuration setup
  configuration.setup(function() {
    processor(function() {
      // Set test start time
      test_control.start_time = new Date();
      // Execute the test
      test.test[test.name].apply(test.test, [configuration, test_control]);                
    });
  });
}

TestSuite.prototype.execute_parallel = function(config_name, options, callback) {
  var self = this;
  var buckets = [];
  var tests = [];
  var number_of_contexts = options.number_of_contexts ? options.number_of_contexts : 1;
  var number_of_contexts_left = number_of_contexts;

  // Set up the context
  for(var i = 0; i < number_of_contexts; i++) buckets[i] = [];
  for(var i = 0; i < number_of_contexts; i++) tests[i] = [];

  // Start all the configurations
  this.configuration.createAndStart(config_name, number_of_contexts, function(err, configurations) {
    // If we have a file level, split files into buckets and run 
    // concurrently
    if(options.parallelize_level == 'file') {
      var index = 0;
      
      // Let's split files into x parallel buckets and distribute them
      for(var i = 0; i < self.files.length; i++) {
        buckets[index].push(self.files[i]);
        index = (index + 1) % number_of_contexts;
      }

      // Handle tests done
      var done = function(err) {
        number_of_contexts_left = number_of_contexts_left - 1;

        if(number_of_contexts_left == 0) {
          callback();
        }
      }

      // Run each bucket of files separately
      for(var i = 0; i < number_of_contexts; i++) {
        if(options.execute_serially) {
          process_files_serially(self, configurations[i], buckets[i], options, done);
        } else {
          process_files(self, configurations[i], buckets[i], options, done);        
        }
      }      
    } else if(options.parallelize_level == 'test') {
      var index = 0;

      // Handle tests done
      var done = function(err) {
        number_of_contexts_left = number_of_contexts_left - 1;

        if(number_of_contexts_left == 0) {
          callback();
        }
      }

      // If we have scheduler hints otherwise
      if(self.options.schedulerHints != null) {
        var test_hash = {};

        for(var i = 0; i < self.files.length; i++) {
          var test = require(process.cwd() + self.files[i]);

          // Create a hash so we can correctly reorder the tests
          for(var name in test) {
            if(options.test && options.test == name) {
              test_hash[self.files[i] + name] = {test:test, name:name, file:self.files[i]};
            } else if(options.test == null) {
              test_hash[self.files[i] + name] = {test:test, name:name, file:self.files[i]};              
            }
          }
        }

        // Guess total times for each context
        var calculated_times = [];
        for(var j = 0; j < tests.length; j++) calculated_times[j] = {index: j, time: 0};

        // Let's schedule from the top of the hints
        for(var j = 0; j < self.options.schedulerHints.length; j++) {
          var hint = self.options.schedulerHints[j];

          // Hint references existing file
          if(test_hash[hint.file + hint.test]) {
            // Push to the queue with least cumulative time
            tests[calculated_times[0].index].push(test_hash[hint.file + hint.test]);
            calculated_times[0].time += hint.time;
            // Sort according to minimum time (minimum execution time in slot 0)
            calculated_times = calculated_times.sort(function(a, b) { return a.time - b.time});


            // tests[index].push(test_hash[hint.file + hint.test]);
            // index = (index + 1) % number_of_contexts;
            delete test_hash[hint.file + hint.test];
          }
        }

        // Do we have any tests not covered by the hints
        for(name in test_hash) {
          tests[index].push(test_hash[name]);
          index = (index + 1) % number_of_contexts;
        }
      } else {
        // Let's build the test objects that will run in parallel
        for(var i = 0; i < self.files.length; i++) {

          var test = require(process.cwd() + self.files[i]);
          // Distribute the tests
          for(var name in test) {
            if(options.test && options.test == name) {
              tests[index].push({test:test, name:name, file: self.files[i]});
              index = (index + 1) % number_of_contexts;
            } else if(options.test == null) {
              tests[index].push({test:test, name:name, file: self.files[i]});
              index = (index + 1) % number_of_contexts;              
            }
          }
        }
      }

      // Sweet now run the tests serially
      for(var i = 0; i < number_of_contexts; i++) {
        process_parallel_tests_serially(self, configurations[i], tests[i], options, done);
      }
    } else {
      throw new Error("Parallelization level " + options.parallelize_level + " not valid");
    }
  });
}

TestSuite.prototype.execute = function(config_name, options, callback) {
  this.execute_parallel(config_name, options, callback);
}

var process_tests_serially = function(test_suite, tests, test_names, configuration, file_name, options, callback) {
  var test_name = test_names.pop();
  // Test control
  var test_control = new TestControl(configuration, file_name, test_name);
    
  // Done function
  var done_function = function(_test_control) {
    return function() {
      // Set test end time
      _test_control.end_time = new Date();
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

        // Emit the test statistics
        processor(function() {
          test_suite.runner.emit("test_done", _test_control);
        })

        if(test_names.length > 0) {
          processor(function() {
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
    // Set test start time
    test_control.start_time = new Date();
    try {
      // Execute the test
      tests[test_name].apply(tests, [configuration, test_control]);
    } catch(err) {
    }
  });
}

var runTests = function(test_suite, configuration, file_name, test, options, callback) {
  var keys = Object.keys(test);
  var number_of_tests = keys.length;
  if(number_of_tests == 0) return callback(null, null);

  // Execute serially
  if(options.execute_serially) {
    return process_tests_serially(test_suite, test, keys, configuration, file_name, options, callback);
  }

  // Iterate over all the functions
  for(var name in test) {    
    // Test control
    var test_control = new TestControl(configuration, file_name, name);
    
    // Done function
    var done_function = function(_test_control) {
      return function() {
        // Set test end time
        _test_control.end_time = new Date();
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

          // Emit the test statistics
          processor(function() {
            test_suite.runner.emit("test_done", _test_control);
          })

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
          // Set test start time
          _test_control.start_time = new Date();
          try {
            // Execute the test
            _test[_name].apply(_test, [configuration, _test_control]);          
          } catch(err) {
          }
        })
      }
    }

    // Set up the done function
    test_control.done = done_function(test_control); 
    // Execute it
    execute_function(test, name, test_control)();
  }  
}

exports.TestSuite = TestSuite;