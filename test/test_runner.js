var Configuration = require('../lib/configuration').Configuration
  , Runner = require('../lib/runner').Runner
  , Cover = require('../lib/coverage/cover').Cover;

// Set up a set of configurations we are going to use
var configurations = Configuration
  .add("empty", function() {
    this.start = function(callback) {
      callback();
    }

    this.setup = function(callback) {
      callback();
    }

    this.teardown = function(callback) {
      callback();      
    };

    this.stop = function(callback) {
      callback();
    };
  });

// Configure a Run of tests
var runner = Runner
  .configurations(configurations)
  .add("integra", [
    '/test/instrumentor_tests'
  ])
  // Generate coverage data
  // .cover()
  // .rcover()
  .plugin(new Cover())
  // .plugin(new RCover())
  // Runs all the suites
  .run("empty");














  