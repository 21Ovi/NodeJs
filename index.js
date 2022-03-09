/*
*primary file for the API
*
*/

// Dependencies
const server = require('./lib/server');
//const workers = require('./lib/workers');

// Declare the app
const app = {};

//Init function
app.init = function(){
  //start the Server
  server.init();

  // start the workers
//  workers.init();
};

// Execute
app.init();


// Export the app
module.exports = app;
