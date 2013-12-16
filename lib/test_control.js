var assert = require('./assert/assert'),
  readOnlyEnumerableProperty = require('./utils').readOnlyEnumerableProperty;

var TestControl = function(configuration, file_name, name) {
  var config_name = configuration.name;
  // Add the basic stats  
  var number_of_assertions = 0;
  var number_of_failed_assertions = 0;
  var number_of_successful_assertions = 0;
  var start_time = null;
  var end_time = null;
  // Caught errors
  var assertions = [];

  // Make properties available
  readOnlyEnumerableProperty(this, "assertions", assertions);
  readOnlyEnumerableProperty(this, "name", name);
  readOnlyEnumerableProperty(this, "number_of_failed_assertions", number_of_failed_assertions);

  this.ok = function(value, description) {
    number_of_assertions++;

    try {
      assert.ok(value, description);    
      number_of_successful_assertions++;
    } catch(err) {
      assertions.push(err);
      number_of_failed_assertions++;
      throw err;
    }
  }

  this.equal = function(expected, value, description) {
    number_of_assertions++;

    try {
      assert.equal(value, expected, description);
      number_of_successful_assertions++;
    } catch(err) {
      assertions.push(err);
      number_of_failed_assertions++;
      throw err;
    }
  }

  this.notEqual = function(expected, value, description) {
    number_of_assertions++;

    try {
      assert.notEqual(value, expected, description);
      number_of_successful_assertions++;
    } catch(err) {
      assertions.push(err);
      number_of_failed_assertions++;
      throw err;
    }
  }

  this.deepEqual = function(expected, value, description) {
    number_of_assertions++;

    try {
      assert.deepEqual(value, expected, description);
      number_of_successful_assertions++;
    } catch(err) {
      assertions.push(err);
      number_of_failed_assertions++;
      throw err;
    }
  }

  this.throws = function(block, error, message) {
    number_of_assertions++;

    try {
      assert.throws(block, error, message);
      number_of_successful_assertions++;
    } catch(err) {
      assertions.push(err);
      number_of_failed_assertions++;
      throw err;
    }
  }

  this.strictEqual = function(expected, value, description) {
    number_of_assertions++;

    try {
      assert.strictEqual(value, expected, description);
      number_of_successful_assertions++;
    } catch(err) {
      assertions.push(err);
      number_of_failed_assertions++;
      throw err;
    }
  }
}

exports.TestControl = TestControl;