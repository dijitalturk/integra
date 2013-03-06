var format = require('util').format;

var Configuration = function() {  
  this.configurations = {};
  this.configurators = {};
  this.children = {};
}

Configuration.add = function(name, configurator) {  
  var configuration = new Configuration();
  var serverConfiguration = new ServerConfiguration(name);
  // Execute function
  configurator.apply(serverConfiguration)
  // Push the configuration
  configuration.configurations[name] = serverConfiguration;
  configuration.configurators[name] = configurator;
  // Return the config object
  return configuration;
}

Configuration.prototype.get = function(name) {
  return this.configurations[name];
}

Configuration.prototype.all = function(name) {
  var configurations = [this.get(name)];

  if(Array.isArray(this.children[name])) {
    configurations = configurations.concat(this.children[name]);
  }

  return configurations;
}

Configuration.prototype.add = function(name, configurator) {
  var serverConfiguration = new ServerConfiguration(name);
  // Execute function
  configurator.apply(serverConfiguration)
  // Push the configuration
  this.configurations[name] = serverConfiguration;
  this.configurators[name] = configurator;
  // Return the config object
  return this;
}

Configuration.prototype.create = function(name) {
  if(typeof this.configurators[name] != 'function') {
    throw new Error(format("no configuration found for the name %s", name));
  }

  var configurator = this.configurators[name];
  var serverConfiguration = new ServerConfiguration();
  configurator.apply(serverConfiguration);
  if(!Array.isArray(this.children[name])) {
    this.children[name] = [];
  }
  this.children[name].push(serverConfiguration);
  return serverConfiguration;
}

Configuration.prototype.createAndStart = function(name, instances, callback) {
  if(typeof instances == 'function') {
    callback = instances;
    instances = 1;
  }

  var total_number_of_configurations = instances;
  var configurations = [];

  // We need to create some configurations and boot them up
  for(var i = 0; i < total_number_of_configurations; i++) {
    var start_config = function(_configuration) {
      _configuration.start(function(err) {      
        // Die fast
        if(err) throw err;
        
        // Adjust the number of configurations
        total_number_of_configurations = total_number_of_configurations - 1;
        // Add to list of configurations
        configurations.push(_configuration);

        // If done we can start executing tests
        if(total_number_of_configurations == 0) {
          // Execute tests
          callback(null, configurations);
        }
      });
    }

    // Start the configuration
    start_config(this.create(name));
  }

}

var ServerConfiguration = function(name) {  
  this.name = name;
}

exports.Configuration = Configuration;