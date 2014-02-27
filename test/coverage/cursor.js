var Cursor = function(items) {	
	items = items || [];
 
	this.length = function() {
		return items.length;
	}
}
 
 exports.Cursor = Cursor;