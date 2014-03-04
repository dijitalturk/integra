var debug = require('../utils').debug
	, f = require('util').format;

var Cover = function Cover() {	
	var logger = debug('Cover');

	this.filter = function(test) {
		// console.log("= Cover::filter");
		return false;
	}

	this.beforeStart = function(tests, callback) {
		console.log("= Cover::beforeStart");
		callback();
	}

	this.beforeExit = function(tests, callback) {
		console.log("= Cover::beforeExit");
		callback();
	}

	this.beforeTest = function(test, callback) {
		console.log("= Cover::beforeTest");
		callback();
	}

	this.afterTest = function(test, callback) {
		console.log("= Cover::afterTest");
		callback();
	}
}

module.exports = Cover;