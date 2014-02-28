var Instrumentor = require('./Instrumentor')
	, Module = require('module')
	, TreeSummarizer = require('./tree-summarizer')
	, utils = require('./object-utils')
	, path = require('path')
	, Html = require('./cover_reporters/html')
	, fs = require('fs')
	, rimraf = require('rimraf');

/**
 * Handles all the covering of files
 */
var RCover = function RCover(options) {
	// The current require resolver for .js
	var originalRequire = require.extensions['.js'];
	// Cover options
	var coverOptions = options || {
		includes: ["./lib"]
	};

	// Set default options if none passed in
	options = options || {
		outputDirectory: "./out"
	}

	// Holds the current generator
	var generator = null;

	// Counting index for all the coverage variables
	var index = 0;
	// Set up empty __coverage__ variable
	__coverage__ = [];

	this.setOptions = function(options) {
		coverOptions = options || {};
	}

	var flushCache = function(dir) {
		fs.readdirSync(dir).forEach(function(file) {
			var stat = fs.statSync(dir + "/" + file);
			if(stat.isDirectory()) {
				flushCache(dir + "/" + file);
			} else {
				for(var name in require.cache) {
					if(name.indexOf(file) != -1 
						&& name.indexOf('node_module') == -1) {
							// console.log(name);						
							delete require.cache[name];
					}
				}
			}
		});
	}

	var reloadModules = function(dir) {
		fs.readdirSync(dir).forEach(function(file) {
			var stat = fs.statSync(dir + "/" + file);
			if(stat.isDirectory()) {
				reloadModules(dir + "/" + file);
			} else {
				require(process.cwd() + "/" + dir + "/" + file);
			}
		});		
	}

	this.onPreRun = function(runner) {
		rimraf.sync(options.outputDirectory);
		// console.log("++++++++++++++++++++++++++++++++ cover on onPreRun");		
	}

	this.onExit = function() {
		// // console.log("++++++++++++++++++++++++++++++++ cover on exit");
		// // Create an instance of the Tree Summarizer
		// var summarizer = new TreeSummarizer();
		// // For each file in coverage, let's generate
		// for(var filename in __coverage__) {
		// 	// Get the coverage
		// 	var coverage = __coverage__[filename];
			
		// 	// Add content to summarizer
		// 	summarizer.addFileCoverageSummary(filename, utils.summarizeFileCoverage(coverage));
		// }

		// // Get the tree summary
		// var tree = summarizer.getTreeSummary();
		// // Execute generation of html page
		// generator.generate(tree.root, __coverage__);
	}

	this.onTestStart = function(test, runner) {
		// console.log("++++++++++++++++++++++++++++++++ cover on testStart");
		// Get all the test files
		var files = runner.files;
		var instrumentor = new Instrumentor({
      debug: false,
      walkDebug: false,
      coverageVariable: '__coverage__[' + index + ']',
      codeGenerationOptions: undefined,
      noAutoWrap: false,
      noCompact: false,
      embedSource: false,
      preserveComments: false
    });

		var htmlOptions = options || {};
		// Add the current test name as the report name
		htmlOptions.reportSubDirectory = "" + index;
		htmlOptions.noDelete = true;
		// Generate a new html report
		generator = new Html(htmlOptions);

		// console.log("= flush require cache files");
		// Flush cache for all the includes we are interested in
		coverOptions.includes.forEach(function(include) {
			flushCache(include);
		});

		// Override with our own
		require.extensions['.js'] = function(module, filename) {
			// console.dir(module.parent.parent.parent.parent)
			// Are we going to instrument it
			var instrument = true;
			// Check if we need to instrument the file
			for(var i = 0; i < files.length; i++) {
				// Get the test file
				var testFile = path.basename(files[i]);
				// Don't instrument the file if it's a test file
				if(filename.indexOf(testFile) != -1) {
					instrument = false;
				}
			}

			// Check if it's in a node_module, and don't instrument if it is
			if(filename.indexOf('node_modules/') != -1) {
				instrument = false;
			}

			// The file is not on the passed in list, instrument it
			if(instrument) {
				// console.log("== instrumenting :: " + filename);
				// Otherwise instrument it
				var file = fs.readFileSync(filename).toString();			
				// Instrument the code
				var instrumentedCode = instrumentor.instrumentSync(file, filename);
				// Return the compiled module
				return module._compile(instrumentedCode, filename);
			}

			// Return the original module
			return originalRequire(module, filename);
		}		

		coverOptions.includes.forEach(function(include) {
			reloadModules(include);
		});
	}

	this.onTestEnd = function() {
		console.log("++++++++++++++++++++++++++++++++ cover on testEnd");
		// console.dir(__coverage__[index]);

		// console.log("++++++++++++++++++++++++++++++++ cover on exit");
		// Create an instance of the Tree Summarizer
		var summarizer = new TreeSummarizer();
		// For each file in coverage, let's generate
		for(var filename in __coverage__[index]) {
			// Get the coverage
			var coverage = __coverage__[index][filename];
			
			// Add content to summarizer
			summarizer.addFileCoverageSummary(filename, utils.summarizeFileCoverage(coverage));
		}

		// Get the tree summary
		var tree = summarizer.getTreeSummary();
		// Execute generation of html page
		generator.generate(tree.root, __coverage__[index]);

		// Update index variable
		index = index + 1;
	}

	this.onTestSuiteStart = function(configurations) {
		// console.log("++++++++++++++++++++++++++++++++ cover on testSuiteStart");
	}

	this.onTestSuiteEnd = function() {
		// console.log("++++++++++++++++++++++++++++++++ cover on testSuiteEnd");
	}
}

module.exports = RCover;