// Handle onchange event
var onChangeEventHandler = function(renderTo) {
  return function() {
    var value = this.options[this.selectedIndex].value;

    // User picked a an existing test, show coverage
    // from the view of that test
    if(value != "") {
      applyCoverage(renderTo, value);
    }
  } 
}

// Render all the tests
var left = document.getElementById("left");
var right = document.getElementById("right");

// Clean out the html
left.innerHTML = '';

// Render all the elements
for(var name in data.tests) {
	left.innerHTML = left.innerHTML 
		+ "<input type='checkbox' checked value='"
		+ name + "'/>"
		+ name + "<br/>"
}

// All files currently filtered out
var filtered = {};

// Apply handler to all the test selectors
var list = document.getElementsByTagName("input");
for(var i = 0; i < list.length; i++) {
	list[i].onchange = function() {
		if(this.checked == false) {
			filtered[this.value] = 1;
		} else {
			delete filtered[this.value];
		}

		// Diff the data
		var filteredOut = createTotalCoverageModel(data.coverage, {
			filters: Object.keys(filtered)
		});

		// Do we have any keys (any diff at all)
		if(Object.keys(filteredOut).length > 0) {
			renderDiff(right, data, diffCoverage(totalCoverage, filteredOut));
		}
	}
}

// Render the difference
var renderDiff = function(right, data, diff) {
	console.log("============= render diff")
	console.log(diff)

	// Content
	var content = [];

	// Clear out the HTML
	right.innerHTML = '';

	// Render all the diffs found
	for(var name in diff) {
		content.push("<h3>");
		content.push(name.split("/").pop());
		content.push("</h3>");

		// Locate the source for this file
		var sourceLines = data.source[name];

		// Get all the diffs
		var diffs = diff[name];
		for(var _name in diffs) {
			// Get a specific diff
			var change = JSON.parse(_name);
			// Unpack the diff
			var line = change[0];
			var covered = change[1] == 1 ? true : false;
			var consumeBlanks = change[2] == 1 ? true : false;
			var startPos = change[3];
			var endPos = change[4];
			var origLength = change[5];
			var offsets = change.length == 7 ? change[6] : [];

			// // console.log("=================================")
			// console.log(change)
			content.push(sourceLines[line]);


			// content.push(_name);
		}

		// render the diff
	}

	right.innerHTML = content.join("<br/>");
}

// Calculate total coverage and create a data model we can compare against
var createTotalCoverageModel = function(coverage, options) {
	var coverageByFile = {};
	options = options	|| {};
	var filters = options.filters || [];

	for(var testname in coverage) {
		var skip = false;
		filters.forEach(function(filter) {
			if(testname == filter) skip = true;
		})

		// Don't skip the coverage
		if(!skip) {
			var c = coverage[testname];
			for(var filename in c) {
				// Create an entry for the coverage file
				coverageByFile[filename] = coverageByFile[filename] ? coverageByFile[filename] : {};
				// Generate a coverage hash based on the data entries
				c[filename].s.forEach(function(s) {
					coverageByFile[filename][JSON.stringify(s)] = 1;
				});
			}			
		}
	}

	return coverageByFile;
}

var diffCoverage = function(toaltCoverage, modifiedCoverage) {
	var diff = {};

	for(var filename in toaltCoverage) {
		var totalFileCoverage = totalCoverage[filename];
		var modifiedFileCoverage = modifiedCoverage[filename];

		// Go through all the coverage
		Object.keys(totalFileCoverage).forEach(function(key) {
			if(modifiedFileCoverage[key] == null) {
				diff[filename] = diff[filename] != null ? diff[filename] : {};
				diff[filename][key] = 1;
			}
		});
	}

	return diff;
}

// Create total coverage model we will use for diffs
var totalCoverage = createTotalCoverageModel(data.coverage);
// // Var create coverage with specific test filtered out
// var filteredOut = createTotalCoverageModel(data.coverage, {
// 	filters: ["Should correctly use aggregation as a cursor"]
// });

// // Diff the two objects
// var diffed = diffCoverage(totalCoverage, filteredOut);


// console.log(hashedCoverage)

// // Add handlers to the select and the heat button
// document.getElementById("test1").onchange = onChangeEventHandler("left")
// document.getElementById("test2").onchange = onChangeEventHandler("right")

// // Render all the coverage
// var applyCoverage = function(renderTo, testName) {
//   var renderTd = document.getElementById(renderTo);
//   var renderHtml = [];
//   var regex = /(<([^>]+)>)/ig;

//   for(var fileName in data) {
//     // Get the coverage for this file for a specific test
//     var coverage = data[fileName][testName];
//     // Get any covered lines
//     var lines = [];
//     // Iterate over all the structures
//     for(var i = 0; i < coverage.structured.length; i++) {
//       var structure = coverage.structured[i];

//       if(structure.covered == "yes") {
//         lines.push(structure);
//       }
//     }

//     if(lines.length > 0) {
//       var filename = fileName.split("/");     
//       renderHtml.push("<h3>" + filename.pop() + "</h3>");
//       renderHtml.push("<table width='100%'>");

//       // Render the lines
//       for(var i = 0; i < lines.length; i++) {
//         var line = lines[i].text.text;
//         renderHtml.push("<tr>");
//         renderHtml.push("<td>");
//         renderHtml.push(lines[i].line);       
//         renderHtml.push("</td>");
//         renderHtml.push("<td width='100%'>");
//         renderHtml.push("<textarea cols='80' rows='1' width='100%'>")
//         renderHtml.push(customEscape(line).replace(regex, ""));
//         renderHtml.push("</textarea>")        
//         renderHtml.push("</td>");
//         renderHtml.push("</tr>");
//       }
  
//       renderHtml.push("</table>");
//     }
//   }

//   // Set the inner html
//   renderTd.innerHTML = renderHtml.join("");
// }

var lt = '\u0001',
    gt = '\u0002',
    RE_LT = /</g,
    RE_GT = />/g,
    RE_AMP = /&/g,
    RE_lt = /\u0001/g,
    RE_gt = /\u0002/g;

function customEscape(text) {
  text = text.toString();
  return text.replace(RE_AMP, '&amp;')
      .replace(RE_LT, '&lt;')
      .replace(RE_GT, '&gt;')
      .replace(RE_lt, '<')
      .replace(RE_gt, '>');
}