var debug = require('../utils').debug
	, f = require('util').format;

var Cover = function Cover() {	
	var logger = debug('Cover');

	this.filter = function(test) {
		// console.log("= Cover::filter");
		return false;
	}

	this.beforeStart = function() {
		console.log("= Cover::beforeStart");
	}

	this.beforeExit = function() {
		console.log("= Cover::beforeExit");
	}

	this.beforeTestSuite = function() {
		console.log("= Cover::beforeTestSuite");
	}

	this.afterTestSuite = function() {
		console.log("= Cover::afterTestSuite");
	}

	this.beforeTest = function() {
		console.log("= Cover::beforeTest");
	}

	this.afterTest = function() {
		console.log("= Cover::afterTest");
	}
}

module.exports = Cover;