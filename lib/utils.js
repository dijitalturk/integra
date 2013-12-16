var readOnlyEnumerableProperty = function(self, name, value) {
	Object.defineProperty(self, name, {
		get: function() {
			return value;
		},
		enumerable: true
	})
}

exports.readOnlyEnumerableProperty = readOnlyEnumerableProperty;