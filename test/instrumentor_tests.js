var Cursor = require('./coverage/cursor').Cursor;

exports['Exercise the cursor code'] = function(configuration, test) {
	new Cursor([1, 2, 3]).length();
	// var cursor = new Cursor([1, 2, 3, 4]);
	// test.equal(4, cursor.length());
	// test.equal(1, cursor.next());
	test.done();
}

// exports['Exercise the cursor code again'] = function(configuration, test) {
// 	// var cursor = new Cursor([1, 2, 3, 4]);
// 	// test.equal(4, cursor.length());
// 	// test.equal(1, cursor.next());
// 	test.done();
// }