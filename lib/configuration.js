var Configuration = function() {  
  this.configurations = {};
}

Configuration.add = function(name, configurator) {  
  var configuration = new Configuration();
  var serverConfiguration = new ServerConfiguration();
  // Execute function
  configurator.apply(serverConfiguration)
  // Push the configuration
  configuration.configurations[name] = serverConfiguration;
  // Return the config object
  return configuration;
}

Configuration.prototype.get = function(name) {
  return this.configurations[name];
}

Configuration.prototype.add = function(name, configurator) {
  var serverConfiguration = new ServerConfiguration();
  // Execute function
  configurator.apply(serverConfiguration)
  // Push the configuration
  this.configurations[name] = serverConfiguration;
  // Return the config object
  return this;
}

var ServerConfiguration = function() {  
}

exports.Configuration = Configuration;