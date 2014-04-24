var TestNameFilter = function(name) {
  this.filter = function(test) {
    if(test.name.indexOf(name) != -1) {
      return true;
    }

    return false;
  }  
}

module.exports = TestNameFilter;