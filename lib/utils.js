/*
 *  Set up a read-only property using a value
 */
var readOnlyEnumerableProperty = function(self, name, value) {
	Object.defineProperty(self, name, {
		get: function() {
			return value;
		},
		enumerable: true
	});
}

/*
 *  Set up a read-only property using a function
 */
var readOnlyEnumerablePropertyFunction = function(self, name, func) {
	Object.defineProperty(self, name, {
		get: func,
		enumerable: true
	});
}

/*
 *  Execute a plugin method
 */
var executePluginsEventMethod = function(plugins, functionName, params) {
  for(var i = 0; i < plugins.length; i++) {
    var plugin = plugins[i];

    if(typeof plugin[functionName] == 'function') {
      plugin[functionName].apply(plugin, params);
    }
  }    
}

exports.readOnlyEnumerableProperty = readOnlyEnumerableProperty;
exports.executePluginsEventMethod = executePluginsEventMethod;
exports.readOnlyEnumerablePropertyFunction = readOnlyEnumerablePropertyFunction;