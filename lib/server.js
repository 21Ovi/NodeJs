
/*
* Serevr related tasks
*
*/

//dependecies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');

//Instantiate the server module
const server = {};

helpers.sendTwilioSms('8511397395','Hello!',function(err){
//  console.log('This was the error ', err);
});

// Instatiate the HTTP server
  server.httpServer = http.createServer(function(req,res){
    server.unifiedServer(req,res);
});



//Instatiate the HTTPS server
 server.httpsServerOptions = {
  'key': fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
  'cert':fs.readFileSync(path.join(__dirname,'/../https/cert.pe'))
};
server.httpsServer = http.createServer(server.httpsServerOptions,function(req,res){
  server.unifiedServer(req,res);
});

//All the server logic for http and https server
server.unifiedServer = function(req,res){
  //Get the URL and parse in
  const parsedUrl = url.parse(req.url,true);

  //get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  //Get the query string as an object
  const queryStringObject = parsedUrl.query;

  //get the HTTP method
  const method = req.method.toLowerCase();

  //Get the headers as an object
  const headers = req.headers;

  //Get the payload if any
  const decoder = new StringDecoder('utf-8');
  let buffer ='';
  req.on('data',function(data){
    buffer += decoder.write(data);
  });
  req.on('end',function(){
    buffer += decoder.end();

    //choose the handler this requrest should go to. if one is not found, use the notfound handler
    const chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    //construct the data object to send to the handler
    const data = {
      'trimmedPath' : trimmedPath,
      'queryStringObject':queryStringObject,
      'method': method,
      'headers' : headers,
      'payload' : helpers.parseJsonObject(buffer)
    };

    //route the request to the hadnler specified in this router
    chosenHandler(data,function(statusCode,payload){
      //Use the status code called back by thge handler, or default to 200
      statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

      //use the payload called back by the handler, or default to an empty object
      payload = typeof(payload)=='object' ? payload : {};

      //convert the payload to a string_decoder
      const payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader('Content-Type','application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      //log the requrest path
      console.log('Return this response : ',statusCode,payloadString);
    });
  });
};

// Defining a requrest router

server.router ={
  'ping':handlers.ping,
  'users':handlers.users,
  'tokens':handlers.tokens,
  'checks':handlers.checks
};

// Init script
server.init = function(){
  //start the http Server
  server.httpServer.listen(config.httpPort,function(){
    console.log("the Server is Listening on port "+config.httpPort+" in "+config.envName+" now");
  });

  //start the HTTPS server
   server.httpsServer.listen(config.httpsPort,function(){
    console.log("the Server is Listening on port "+config.httpsPort+" in "+config.envName+" now");
  });
}

// Export the module
module.exports= server;
