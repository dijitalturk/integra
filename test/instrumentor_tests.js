// var Instrumentor = require('../lib/coverage/Instrumentor').Instrumentor;
// var cover = require('../lib/coverage/cover').cover
//   , saveCoverageData = require('../lib/coverage/cover').saveCoverageData
//   , Module = require('module').Module;
var Cursor = require('./coverage/cursor').Cursor;

exports['Exercise the cursor code'] = function(configuration, test) {
	var cursor = new Cursor([1, 2, 3, 4]);
	test.equal(4, cursor.length());
	test.equal(1, cursor.next());
	test.done();

// var testClass = function(){/*
// 	var Cursor = function() {
// 		this.next = function() {
// 		}
// 	}
// */}.toString().slice(14,-3)
// 	var config = {
// 	    debugDirectory: null
// 	  , ignore: {}
// 	  , regexp: null
// 	  , dataDirectory: ".coverage_data"
// 	  , prefix: "rcover_"
// 	}
	
// 	var coverage = cover(config.regexp, config.ignore, config.debugDirectory);
// 	var file = "./test/coverage/cursor.js"

// 	process.nextTick(function() {
// 	  try {
// 	    // Load up the new argv
// 	    var options = [];
// 	    process.argv = ["node", file].concat(options)
// 	    // Load the file as the main module
// 	    Module.runMain(file, null, true)
// 	  } catch(ex) {
// 	    console.log(ex.stack);
// 	  }
// 	});

// 	// Setup the on exit listener
// 	process.on(
// 	    "exit", 
// 	    function() {
// 	      coverage(function(coverageData) {
// 	      	console.dir(coverageData)
// 	        // try {
// 	        //   saveCoverageData(coverageData, config);
// 	        // } catch(e) {
// 	        //   console.log(e.stack);
// 	        // }
// 	      });
// 	    });


// 	// var instrumentor = new Instrumentor(testClass);
// 	// console.log(testClass)
// 	// test.done();
}