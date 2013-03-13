var assert = require('assert');

var TestControl = function(configuration, file_name, name) {
  this.configuration = configuration
  this.config_name = configuration.name;
  this.file_name = file_name;
  this.name = name;  
  // Add the basic stats  
  this.number_of_assertions = 0;
  this.number_of_failed_assertions = 0;
  this.number_of_successful_assertions = 0;
  this.start_time = null;
  this.end_time = null;
  // Caught errors
  this.assertions = [];
}

TestControl.prototype.ok = function(value, description) {
  this.number_of_assertions++;

  try {
    assert.ok(value, description);    
    this.number_of_successful_assertions++;
  } catch(err) {
    this.assertions.push(err);
    this.number_of_failed_assertions++;
  }
}

TestControl.prototype.equal = function(expected, value, description) {
  this.number_of_assertions++;

  try {
    assert.equal(expected, value, description);
    this.number_of_successful_assertions++;
  } catch(err) {
    this.assertions.push(err);
    this.number_of_failed_assertions++;
  }
}

TestControl.prototype.notEqual = function(expected, value, description) {
  this.number_of_assertions++;

  try {
    assert.notEqual(expected, value, description);
    this.number_of_successful_assertions++;
  } catch(err) {
    this.assertions.push(err);
    this.number_of_failed_assertions++;
  }
}

TestControl.prototype.deepEqual = function(expected, value, description) {
  this.number_of_assertions++;

  try {
    assert.deepEqual(expected, value, description);
    this.number_of_successful_assertions++;
  } catch(err) {
    this.assertions.push(err);
    this.number_of_failed_assertions++;
  }
}

TestControl.prototype.throws = function(block, error, message) {
  this.number_of_assertions++;

  try {
    assert.throws(block, error, message);
    this.number_of_successful_assertions++;
  } catch(err) {
    this.assertions.push(err);
    this.number_of_failed_assertions++;
  }
}

TestControl.prototype.strictEqual = function(expected, value, description) {
  this.number_of_assertions++;

  try {
    assert.strictEqual(expected, value, description);
    this.number_of_successful_assertions++;
  } catch(err) {
    this.assertions.push(err);
    this.number_of_failed_assertions++;
  }
}

exports.TestControl = TestControl;