var fs = require('fs')
	, debug = require('./utils').debug
	, f = require('util').format
	, utils = require('./utils')
	, LocalScheduler = require('./schedulers/local_scheduler')
	, Test = require('./test')
	, EventEmitter = require('events').EventEmitter
	, inherits = require('util').inherits;	

var Runner = function(options) {	
	// Options
	options = options || {};

	// Add event emitter to the runner
	EventEmitter.call(this);

	var logger = debug('Runner');
	// Internal state
	var configuration;
	var plugins = [];
	var testFiles = [];
	var runners = options.runners || 1;
	var configurations = [];
	var globalContext = {};
	// All test suites
	var tests = [];
	
	// Only accept a scheduler that is a function
	if(options.scheduler && typeof options.scheduler != 'function')
		throw new Error("Schedulers must be a function")

	// Load Scheduler
	var scheduler = typeof options.scheduler == 'function' 
		? new options.scheduler(options) 
		: new LocalScheduler(options);

	/**
	 * Add test plugin to the runner
	 */
	this.plugin = function(_plugin) {
		plugins.push(_plugin);
		return this;
	}

	/**
	 * Set the number of parallel context to run, default is 1
	 */
	this.runners = function(_runners) {
		if(typeof _runners != 'number')
			throw new Error("runners must be a number");
		runners = _runners;
	}

	/**
	 * Add tests
	 */
	this.add = function(_file) {
		testFiles.push(_file);
	}

	/**
	 * Run the test suite
	 */
	this.run = function(_configuration, callback) {
		if(typeof _configuration != 'function') 
			throw new Error("Must pass in a configuration function");
		var self = this;
		// Save reference to configuration
		configuration = _configuration;
		// Execute Before Start plugin methods
		utils.executeAllPlugins(plugins, "beforeInitialize", testFiles, function() {
			// Load all the tests up
			loadTests();
			// Initiate contexts
			initiateContexts();
			// Add any plugins to the scheduler
			scheduler.addPlugins(plugins);
			// Boot up contexts
			startContexts(function(errors) {
				// Execute Before Start plugin methods
				utils.executeAllPlugins(plugins, "beforeStart", tests, function() {
					// Run the tests
					scheduler.run(tests, configurations, function(errors, results) {
						utils.executeAllPlugins(plugins, "beforeExit", tests, function() {
							if(typeof callback == 'function') callback(errors, results);
							// Emit the exit event
							self.emit('exit', errors, results);
						});
					});
				});
			});
		});
	}

	/**
	 * Star all the new contexts
	 */
	var startContexts = function(callback) {
		var totalContexts = configurations.length;

		for(var i = 0; i < configurations.length; i++) {
			configurations[i].start(function(err) {
				if(err) throw err;

				totalContexts = totalContexts - 1;
				if(totalContexts == 0) {
					callback();
				}
			});
		}
	}

	/**
	 * Initiate the number of needed context
	 */
	var initiateContexts = function() {
		for(var i = 0; i < runners; i++) {
			configurations.push(configuration(globalContext));
		}
	}

	/**
	 * Load all the test modules
	 */
	var loadTests = function() {
		// Load all the modules
		testFiles.forEach(function(file) {
			logger(options.logLevel, 'info', f("loading module %s", file));
			// Get the test module
			var module = require(process.cwd() + file);

			// Index tests by name
			for(var testName in module) {
				logger(options.logLevel, 'info', f("found test [%s]", testName));
				// Add a new test to the list of executable tests
				tests.push(new Test(testName, file, module));
			}
		});
	}
}

inherits(Runner, EventEmitter);

module.exports = Runner;