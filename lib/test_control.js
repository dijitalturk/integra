var assert = require('assert');

var TestControl = function(config_name, file_name, name) {
  this.config_name = config_name;
  this.file_name = file_name;
  this.name = name;
  // Add the basic stats  
  this.number_of_assertions = 0;
  this.number_of_failed_assertions = 0;
  this.number_of_successful_assertions = 0;
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

exports.TestControl = TestControl;