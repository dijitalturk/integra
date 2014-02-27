var Instrumentor = require('./Instrumentor')
	, Module = require('module')
	, TreeSummarizer = require('./tree-summarizer')
	, utils = require('./object-utils')
	, Html = require('./reporters/html')
	, fs = require('fs');

/**
 * Handles all the covering of files
 */
var Cover = function Cover(options) {
	// The current require resolver for .js
	var originalRequire = require.extensions['.js'];
	// Cover options
	var coverOptions = options || {};
	// Reporter
	var generator = new Html(options);
	// Coverage instrumentor
	var instrumentor = new Instrumentor();

	this.setOptions = function(options) {
		coverOptions = options || {};
	}

	this.onPreRun = function(runner) {
		// Get all the test files
		var files = runner.files;

		// Override with our own
		Module._extensions['.js'] = function(module, filename) {
			// Check if we need to instrument the file
			for(var i = 0; i < files.length; i++) {
				// Get the test file
				var testFile = files[i];
				// Don't instrument the file if it's a test file
				if(filename.indexOf(testFile) != -1) break;
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
	}

	this.onExit = function() {
		console.log("++++++++++++++++++++++++++++++++ cover on exit");
		// Create an instance of the Tree Summarizer
		var summarizer = new TreeSummarizer();
		// For each file in coverage, let's generate
		for(var filename in __coverage__) {
			// Get the coverage
			var coverage = __coverage__[filename];
			
			// Add content to summarizer
			summarizer.addFileCoverageSummary(filename, utils.summarizeFileCoverage(coverage));
		}

		// Get the tree summary
		var tree = summarizer.getTreeSummary();
		// Execute generation of html page
		generator.generate(tree.root, __coverage__);
	}

	this.onTestStart = function() {
		console.log("++++++++++++++++++++++++++++++++ cover on testStart");
	}

	this.onTestEnd = function() {
		console.log("++++++++++++++++++++++++++++++++ cover on testEnd");
	}

	this.onTestSuiteStart = function(configurations) {
		console.log("++++++++++++++++++++++++++++++++ cover on testSuiteStart");
	}

	this.onTestSuiteEnd = function() {
		console.log("++++++++++++++++++++++++++++++++ cover on testSuiteEnd");
	}
}

exports.Cover = Cover;