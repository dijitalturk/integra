var Filters = function() {
  var filters = [];

  // Add filter to aggregated grouping
  this.add = function(filter) {
    if(filter.afterConfigurationStart == null) {
      throw new Error("Filter must implement afterConfigurationStart method");
    }

    if(filter.filter == null) {
      throw new Error("Filter must implement filter method");      
    }
    
    filters.push(filter);
  }

  // After configuration has started perform this action
  this.afterConfigurationStart = function(configuration, callback) {    
    var toGo = filters.length;
    var errors = [];

    // Execute all the after configuration start
    for(var i = 0; i < filters.length; i++) {
      if(!filters[i].afterConfigurationStart) {
        throw new Error("Filter " + i + " does not implement afterConfigurationStart");
      }

      // Execute filter
      filters[i].afterConfigurationStart(configuration, function(err, result) {
        toGo = toGo - 1;

        if(err != null) {
          errors.push(err);
        }

        if(toGo == 0) {
          callback(errors.length > 0 ? errors : null);
        }
      });
    }
  }

  // Filter individual tests
  this.filter = function(test) {    
    for(var i = 0; i < filters.length; i++) {
      if(filters[i].filter(test) == false) {
        return false;
      }
    }

    return true;
  }
}

exports.Filters = Filters;