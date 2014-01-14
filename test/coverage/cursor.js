var Cursor = function(items) {
	this.next = function() {
		return items.shift();
	}	

	this.length = function() {
		return items.length;
	}
}

exports.Cursor = Cursor;