var colors = ["#FFFAFA", "#F4C2C2", "#FF5C5C", "#FF0000", "#CE1620", "#A40000", "#800000"];
var colors = ["#F4C2C2", "#FF5C5C", "#FF0000", "#CE1620", "#A40000", "#800000"];

// Add handlers to the select and the heat button
document.getElementById("test").onchange = function() {
	var value = this.options[this.selectedIndex].value;

	// User picked a an existing test, show coverage
	// from the view of that test
	if(value != "") {
		applyCoverage(data[value]);
	}
}

// Show heat map of over coverage
document.getElementById("heat").onclick = function() {
	renderCoverageHeat(data);
}

/**
 * Render a coverage view of the source
 */
var applyCoverage = function(coverage) {
	for(var i = 0; i < coverage.structured.length; i++) {
		var structure = coverage.structured[i];
		var sourceLineRow = document.getElementById("" + i);
		var coverageCountCell = document.getElementById("" + i + "-coverage-count");
		// Default no coverage shown
		var color = "white";
		var coverageCount = '';

		// Line is covered, switch color
		if(structure.covered == 'yes') {
			coverageCount = 1;
			color = "lightgreen";
		}

		coverageCountCell.innerHTML = coverageCount;
		sourceLineRow.style.backgroundColor = color;
	}
}

/**
 * Render the coverage heat
 */
var renderCoverageHeat = function(data) {
	// sum up the heat for each line
	var lines = [];
	var maxValue = 0;

	// Iterate over all the data
	for(var name in data) {
		var coverage = data[name];
		// Iterate over all the structures
		for(var i = 0; i < coverage.structured.length; i++) {
			var structure = coverage.structured[i];
			if(structure.covered == 'yes') {
				lines[i] = typeof lines[i] == 'number' ? lines[i] + 1 : 1;
			} else {
				lines[i] = typeof lines[i] == 'number' ? lines[i] : 0;
			}

			if(lines[i] > maxValue) maxValue = lines[i];
		}
	}

	// Calculate heat step size
	var stepSize = maxValue / colors.length;

	// Render all covered lines
	for(var i = 0; i < lines.length; i++) {
		var sourceLineRow = document.getElementById("" + i);
		var coverageCountCell = document.getElementById("" + i + "-coverage-count");
		var color = "lightgreen";
		var coverageCount = '';

		if(lines[i] > 0) {
			coverageCount = lines[i];
			var colorIndex = Math.round(lines[i] * stepSize);
			sourceLineRow.style.backgroundColor = colors[colorIndex];
		}

		coverageCountCell.innerHTML = coverageCount;		
	}
}