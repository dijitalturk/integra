var FileFilter = function(file) {	

	this.filter = function(test) {
		if(test.file.indexOf(file) != -1) {
			return true;
		}

		return false;
	}
}

module.exports = FileFilter;