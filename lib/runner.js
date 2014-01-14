var Formatter = require('./formatter').Formatter
  , TestSuite = require('./test_suite').TestSuite
  , EventEmitter = require('events').EventEmitter
  , readOnlyEnumerableProperty = require('./utils').readOnlyEnumerableProperty
  , cover = require('./coverage/cover').cover
  , transformCoverageData = require('./coverage/cover').transformCoverageData
  , inherits = require('util').inherits;

var Runner = function(configuration) {
  EventEmitter.call(this);

  var formatter = new Formatter();
  var configurations = [];
  var tests = {};
  var execute_serially = false;
  var number_of_contexts = 1;
  var scheduler_hints = null;

  // Filter classes
  var filters = [];
  // Coverage enabled
  var coverageOptions = null;
  var coverage = null;

  // Set read only property
  readOnlyEnumerableProperty(this, "configuration", configuration);
  readOnlyEnumerableProperty(this, "filters", filters);

  // Set up all the functions
  this.exeuteSerially = function(execute_serially) {
    execute_serially = execute_serially;
    return this;
  }

  this.parallelContexts = function(number_of_contexts) {
    number_of_contexts = number_of_contexts;
    return this;
  }

  this.schedulerHints = function(scheduler_hints) {
    scheduler_hints = scheduler_hints;
    return this;
  }

  this.addFilter = function(filter) {
    if(filter.afterConfigurationStart == null) {
      throw new Error("Filter must implement afterConfigurationStart method");
    }

    if(filter.filter == null) {
      throw new Error("Filter must implement filter method");      
    }

    // Add to list of filters
    filters.push(filter);    
    // Return for chaining
    return this;
  }

  /*
   * Add 
   */
  this.add = function(suite_name, test_files) {
    // Set up a test suite
    tests[suite_name] = new TestSuite(this, formatter, configuration, suite_name, test_files, {
      schedulerHints: scheduler_hints
    });

    // Return for chaining
    return this;
  }

  /*
   * Cover the code
   */
  this.cover = function(options) {
    coverageOptions = options || {};    
    return this;
  }

  /*
   *  Apply PRE Run operations
   */
  var applyPreRunOperations = function(callback) {
    if(coverageOptions == null)
      return callback(null, null);

    // We need to apply the coverage options
    coverage = cover(coverageOptions.regexp
      , coverageOptions.ignore
      , coverageOptions.debugDirectory);

    // Setup the on exit listener
    process.on("exit", 
       function() {
         coverage(function(coverageData) {
           // console.dir(coverageData)
           try {
             var transformed = transformCoverageData(coverageData);
             console.dir(transformed.files)
           } catch(e) {
             console.log(e.stack);
           }
         });
       });

    // Return
    callback(null, null);
  }

  /*
   * Run the actual tests against a specific configuration and with any
   * additional options
   */
  this.run = function(config_name, options) {  
    var self = this;
    var keys = Object.keys(tests);
    options = options ? options : {}

    //
    // Apply any pre run operations such as coverage etc
    applyPreRunOperations(function(err) {

      // No configuration passed in
      if(config_name == null) 
        throw new Error("The name of a configuration to run against must be provided");

      // If single test run single context
      if(options.test) number_of_contexts = 1;

      // Options
      var test_suite_options = {
          // Number of contexts we wish to run in parallel
          number_of_contexts: number_of_contexts
          // Execute all the files in a serial matter 
        , execute_serially: execute_serially
      }

      // Merge in any options
      for(var name in options) test_suite_options[name] = options[name];

      // Execute the test suites
      process_testsuites_serially(self, config_name, tests, keys, test_suite_options, function(err) {
        // Get keys again
        keys = Object.keys(tests);
        
        // All configurations we need to stop
        var configurations = [];
        
        // Execute the stop part of the configuration
        for(var i = 0; i < keys.length; i++) {
          var test_suite = tests[keys[i]];
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
    });
  }  
}

// Inherit from Event Emitter
inherits(Runner, EventEmitter);

// At what level to parallelize
Runner.TEST = 'test';
Runner.FILE = 'file';

// Set the available configurations for runners
Runner.configurations = function(configuration) {  
  return new Runner(configuration);
}

// Process the test suites in a serial manner
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

exports.Runner = Runner;