var Instrumentor = require('./Instrumentor')
	, Module = require('module')
	, TreeSummarizer = require('./tree-summarizer')
	, utils = require('./object-utils')
	, path = require('path')
	, Html = require('./reporters/html')
	, fs = require('fs');

/**
 * Handles all the covering of files
 */
var Cover = function Cover(options) {
	// The current require resolver for .js
	var originalRequire = require.extensions['.js'];
	// Cover options
	var coverOptions = options || {
		includes: ["./lib"]
	};
	// Reporter
	var generator = new Html(options);
	// Coverage instrumentor
	var instrumentor = new Instrumentor();

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
							console.log(name);						
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
		console.log("++++++++++++++++++++++++++++++++ cover on onPreRun");
		// Get all the test files
		var files = runner.files;

		console.log("= flush require cache files");
		// Flush cache for all the includes we are interested in
		coverOptions.includes.forEach(function(include) {
			flushCache(include);
		});
		// console.dir(require.extensions)
		// console.dir(Object.keys(require.cache))

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
				console.log("== instrumenting :: " + filename);
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

	this.onExit = function() {
		console.log("++++++++++++++++++++++++++++++++ cover on exit");
		// Create an instance of the Tree Summarizer
		var summarizer = new TreeSummarizer();
		// Undefined __coverage__ ignore
		if(global.__coverage__ == undefined) __coverage__ = {};
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

module.exports = Cover;