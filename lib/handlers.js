/*
 * Request handlers
 *
 */

// Dependencies
const _data = require("./data");
const helpers = require("./helpers");
const config = require("./config");

//Define the handlers
const handlers = {};

// users
handlers.users = function (data, callback) {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the user submethods
handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function (data, callback) {
  // Check that all required fields are filled out
  const firstName =typeof data.payload.firstName == "string" &&data.payload.firstName.trim().length > 0? data.payload.firstName.trim(): false;
  const lastName =typeof data.payload.lastName == "string" &&data.payload.lastName.trim().length > 0? data.payload.lastName.trim(): false;
  const phone =typeof data.payload.phone == "string" &&data.payload.phone.trim().length == 10? data.payload.phone.trim(): false;
  const password = typeof data.payload.password == "string" && data.payload.password.trim().length > 0? data.payload.password.trim(): false;
  const tosAgreement = typeof data.payload.tosAgreement == "boolean" && data.payload.tosAgreement == true ? true: false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure the user doesnt already exist
    _data.read("users", phone, function (err, data) {
      if (err) {
        // Hash the password
        var hashedPassword = helpers.hash(password);

        // Create the user object
        if (hashedPassword) {
          var userObject = {
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            hashedPassword: hashedPassword,
            tosAgreement: true,
          };

          // Store the user
          _data.create("users", phone, userObject, function (err) {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { 'Error': "Could not create the new user" });
            }
          });
        } else {
          callback(500, { 'Error': "Could not hash the user's password." });
        }
      } else {
        // User alread exists
        callback(400, {
          'Error': "A user with that phone number already exists",
        });
      }
    });
  } else {
    callback(400, { 'Error': "Missing required fields" });
  }
};

//user - get
//Required data:phone
// Optional data:environmentToExport
// @TODO Only let an authenticated user access their object. Don't let them access anyone's object
handlers._users.get = function (data, callback) {
  // Check that phone number is valid
  const phone =typeof data.queryStringObject.phone == "string" &&data.queryStringObject.phone.trim().length == 10? data.queryStringObject.phone.trim(): false;
  if (phone) {

    //Get the token from the headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
      if(tokenIsValid){
        // Lookup the user
        _data.read('users', phone, function (err, data) {
          if (!err && data) {
            // Remove the hashed password from the user user object before returning it to the requester
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      }else{
        callback(403,{'Error':'Missing required token in header, or token is invalid'});
      }
    });
  } else {
    callback(400, { 'Error': "Missing required field" });
  }
};

//user - put
// require data: phone
//optional data; firstName,lastName,password(atleast one must be specified)
handlers._users.put = function (data, callback) {
  // Check for the required field
  const phone =typeof data.payload.phone == "string" &&data.payload.phone.trim().length == 10? data.payload.phone.trim(): false;

  //check for the optional field
  const firstName =typeof data.payload.firstName == "string" &&data.payload.firstName.trim().length > 0? data.payload.firstName.trim(): false;
  const lastName =typeof data.payload.lastName == "string" &&data.payload.lastName.trim().length > 0? data.payload.lastName.trim(): false;
  const password =typeof data.payload.password == "string" &&data.payload.password.trim().length > 0? data.payload.password.trim(): false;

  //'Error' if the phone is invalid
  if (phone) {
    //'Error' if  nothing is sent to update
    if (firstName || lastName || password) {

      //Get the token from the headers
      const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

      // Verify that the given token is valid for the phone number
      handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
        if(tokenIsValid){
          // lookup User
          _data.read("users", phone, function (err, userData) {
            if (!err && userData) {
              // Update the fields necessary
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.firstName = lastName;
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }
              //Store the new updates
              _data.update("users", phone, userData, function (err) {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { 'Error': "Could not update the user" });
                }
              });
            } else {
              console.log(err);
              callback(400, { 'Error': "the specified user does not exists" });
            }
          });
        }else{
          callback(403,{'Error':'Missing required token in header, or token is invalid'});
        }
      });


    } else {
      callback(400, { 'Error': "Missing fields to update" });
    }
  } else {
    callback(400, { 'Error': "Missing required field" });
  }
};

//user - delete
// Required Field : phone
//@TODO Only let an authenticated user delete their own object. Don't let them access anyone's object
handlers._users.delete = function(data,callback){
  // Check that phone number is valid
  const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(phone){

    // Get token from headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
      if(tokenIsValid){
        // Lookup the user
        _data.read('users',phone,function(err,userData){
          if(!err && userData){
            // Delete the user's data
            _data.delete('users',phone,function(err){
              if(!err){
                // Delete each of the checks associated with the user
                let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                let checksToDelete = userChecks.length;
                if(checksToDelete > 0){
                  const checksDeleted = 0;
                  const deletionErrors = false;
                  // Loop through the checks
                  userChecks.forEach(function(checkId){
                    // Delete the check
                    _data.delete('checks',checkId,function(err){
                      if(err){
                        deletionErrors = true;
                      }
                      checksDeleted++;
                      if(checksDeleted == checksToDelete){
                        if(!deletionErrors){
                          callback(200);
                        } else {
                          callback(500,{'Error' : "Errors encountered while attempting to delete all of the user's checks. All checks may not have been deleted from the system successfully."})
                        }
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500,{'Error' : 'Could not delete the specified user'});
              }
            });
          } else {
            callback(400,{'Error' : 'Could not find the specified user.'});
          }
        });
      } else {
        callback(403,{"Error" : "Missing required token in header, or token is invalid."});
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field'})
  }
};

//Tokens
handlers.tokens = function (data, callback) {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

//container for all the token methods
handlers._tokens = {};

//tokens - post
// Required data: phone, password
//optional data: none
handlers._tokens.post = function (data, callback) {
  const phone =typeof data.payload.phone == "string" &&data.payload.phone.trim().length == 10? data.payload.phone.trim(): false;
  const password =typeof data.payload.password == "string" &&data.payload.password.trim().length > 0? data.payload.password.trim(): false;
  if (phone && password) {
    //Lookup the user who match that phone number
    _data.read("users", phone, function (err, userData) {
      if (!err && userData) {
        // Hash the sent password, and compare it to the passwortd stored in the user object
        const hashedPassword = helpers.hash(password);
        if (hashedPassword === userData.hashedPassword) {
          //if valid create a new token with a random name. set expirating date 1 hour in future
          const tokenId = helpers.createRandomString(20);

          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone: phone,
            id: tokenId,
            expires: expires,
          };

          //Store the token
          _data.create("tokens", tokenId, tokenObject, function (err) {
            if (!err) {
              callback(200, tokenObject);
            } else {
              console.log(err);
              callback(500, { 'Error': "Could not create the new token" });
            }
          });
        } else {
          callback(400, {
            'Error':
              "Password did not match the specified user's stored password",
          });
        }
      } else {
        callback(400, { 'Error': "could not find the specified user" });
      }
    });
  } else {
    callback(400, { 'Error': "Missing required fields" });
  }
};

//tokens - get
// Required data : ID
//optionaldata : none
handlers._tokens.get = function (data, callback) {
  //check that the ID is valid
  const id =typeof data.queryStringObject.id == "string" && data.queryStringObject.id.trim().length == 20? data.queryStringObject.id.trim(): false;
  if (id) {
    // Lookup the Token
    _data.read("tokens", id, function (err, tokenData) {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { 'Error': "Missing required field" });
  }
};

//tokens - put
//required Field : id,extend
// Optional data: none
handlers._tokens.put = function (data, callback) {
  const id =typeof data.payload.id == "string" &&data.payload.id.trim().length == 20? data.payload.id.trim(): false;
  const extend =typeof data.payload.extend == "boolean" && data.payload.extend ==true ? true : false;
  if(id && extend){
    //lookup the token
    _data.read('tokens',id,function(err,tokenData){
      if(!err && tokenData){
        // Check tothe make sure the token isn't already expired
        if(tokenData.expires > Date.now()){
          // Set the expiration an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          //Store the new updates
          _data.update('tokens',id,tokenData,function(err){
            if(!err){
              callback(200);
            }else{
              callback(500,{'Error':'Could not update the token\'s expiration '});
            }
          })
        }else{
          callback(400,{'Error':'The token has already expired and cannot be extended'});
        }
      }else{
        callback(400,{'Error':'Specified token does not exists'});
      }
    });

  }else{
    callback(400,{'Error':'Missing required Fields or field are invalid'});
  }

};

//tokens - delete
//Required data: id
// optional data: none
handlers._tokens.delete = function (data, callback) {
  //Check that the id is valid
  const id =typeof data.queryStringObject.id == "string" &&data.queryStringObject.id.trim().length == 20? data.queryStringObject.id.trim(): false;
  if (id) {
    // Lookup the token
    _data.read("tokens", id, function (err, data) {
      if (!err && data) {
        _data.delete("tokens", id, function (err) {
          if (!err) {
            callback(200);
          } else {
            callback(500, { 'Error': "Could not delete the specified token" });
          }
        });
      } else {
        callback(400, { 'Error': "Could not find the specified token" });
      }
    });
  } else {
    callback(400, { 'Error': "Missing required field" });
  }
};

// verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id,phone,callback){
  //Look up the token
  _data.read('tokens',id,function(err,tokenData){
    if(!err && tokenData){
      // Check that the token is for the given user and not expired
      if(tokenData.phone == phone && tokenData.expires > Date.now()){
        callback(true);
      }else{
        callback(false);
      }
    }else{
      callback(false);
    }
  });
};

//Checks
handlers.checks = function (data, callback) {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

// container for all the checks methods
handlers._checks ={};

// Check-post
// Required data: protocol, url,method,successCodes,timeoutSecond
//Optional data: none

handlers._checks.post = function(data,callback){
  // Validate inputs
  const protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  const url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  const method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  const successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  const timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
  if(protocol && url && method && successCodes && timeoutSeconds){

    // Get token from headers
    const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Lookup the user phone by reading the token
    _data.read('tokens',token,function(err,tokenData){
      if(!err && tokenData){
        var userPhone = tokenData.phone;

        // Lookup the user data
        _data.read('users',userPhone,function(err,userData){
          if(!err && userData){
            const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
            // Verify that user has less than the number of max-checks per user
            if(userChecks.length < config.maxChecks){
              // Create random id for check
              const checkId = helpers.createRandomString(20);

              // Create check object including userPhone
              const checkObject = {
                'id' : checkId,
                'userPhone' : userPhone,
                'protocol' : protocol,
                'url' : url,
                'method' : method,
                'successCodes' : successCodes,
                'timeoutSeconds' : timeoutSeconds
              };

              // Save the object
              _data.create('checks',checkId,checkObject,function(err){
                if(!err){
                  // Add check id to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // Save the new user data
                  _data.update('users',userPhone,userData,function(err){
                    if(!err){
                      // Return the data about the new check
                      callback(200,checkObject);
                    } else {
                      callback(500,{'Error' : 'Could not update the user with the new check.'});
                    }
                  });
                } else {
                  callback(500,{'Error' : 'Could not create the new check'});
                }
              });
            } else {
              callback(400,{'Error' : 'The user already has the maximum number of checks ('+config.maxChecks+').'})
            }
          } else {
            callback(403);
          }
        });
      } else {
        callback(403);
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required inputs, or inputs are invalid'});
  }
};

// checks - post
// Required data: id
// Optional data: none
handlers._checks.get = function(data,callback){
  // Check that id is valid
  const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
    // Lookup the check
    _data.read('checks',id,function(err,checkData){
      if(!err && checkData){
        // Get the token that sent the request
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid and belongs to the user who created the check
        console.log("This is check data",checkData);
        handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
          if(tokenIsValid){
            // Return check data
            callback(200,checkData);
          } else {
            callback(403);
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(400,{'Error' : 'Missing required field, or field invalid'})
  }
};

//Check - put
//Required data:id
//Optional data: protocol,url,method,successCodes,timeoutSeconds (one must be selected)
handlers._checks.put = function(data,callback){
  // Check for required field
  const id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20  ? data.payload.id.trim() : false;

  // Check for optional fields
  const protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  const url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  const method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  const successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.lenght > 0 ? data.payload.successCodes : false;
  const timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  // Error if id is invalid
  if(id){
    //Error if nothing is sent to update
    if(protocol || url || method || successCodes || timeoutSeconds){
      //Look up the check
      _data.read('checks',id,function(err,checkData){
        if(!err && checkData){
          //get the token that sent the requrest
          const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
          //verify that the given toke is valid and belong to the user who created the check
          handlers._tokens.verifyToken(token,checkData.userPhone, function(tokenIsValid){
            if(tokenIsValid){
              // Update check data when necessary
              if(protocol){
                checkData.protocol = protocol;
              }
              if(url){
                checkData.url = url;
              }
              if(method){
                checkData.method = method;
              }
              if(successCodes){
                checkData.successCodes = successCodes;
              }
              if(timeoutSeconds){
                checkData.timeoutSeconds = timeoutSeconds;
              }

              //Store the new updates
              _data.update('checks',id,checkData,function(err){
                if(!err){
                  callback(200);
                }else{
                  callback(500,{'Error':'Could not update the check'});
                }
              });

            }else{
              callback(403);
            }
          });
        }else{
          callback(400,{'Error':'check ID did not exist'});
        }
      });
    }else{
      callback(400,{'Error':'Missing field to update'});
    }
  }else{
    callback(400,{'Error':'Missing required field'});
  }
};

// Checks - Delete
// required data : id
// optional data :none

handlers._checks.delete = function(data,callback){
  // Check that id is valid
  const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
    // Lookup the check
    _data.read('checks',id,function(err,checkData){
      if(!err && checkData){
        // Get the token that sent the request
        const token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
        // Verify that the given token is valid and belongs to the user who created the check
        handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
          if(tokenIsValid){

            // Delete the check data
            _data.delete('checks',id,function(err){
              if(!err){
                // Lookup the user's object to get all their checks
                _data.read('users',checkData.userPhone,function(err,userData){
                  if(!err){
                    const userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                    // Remove the deleted check from their list of checks
                    const checkPosition = userChecks.indexOf(id);
                    if(checkPosition > -1){
                      userChecks.splice(checkPosition,1);
                      // Re-save the user's data
                      userData.checks = userChecks;
                      _data.update('users',checkData.userPhone,userData,function(err){
                        if(!err){
                          callback(200);
                        }else{
                          callback(500,{"Error":"could not update the user"});
                        }
                      });
                    }else{
                      callback(500,{"Error":"Could not find the check on the user's object, So could not remove it"});
                    }
                    }else{
                      callback(500,{"Error":"could not find the user who created the check, so could not remove the check from the list of checks on their user object"});
                    }
                  });
                }else{
                  callback(500,{"Error":"Could not delete the check data"});
                }
              });
            }else{
              callback(403);
            }
          });
      }else{
        callback(400,{"Error":"The Check ID specified could not be found"});
      }
    });
  }else{
      callback(400,{"Error":"Missing the calid ID"});
  }
};

//ping handlers
handlers.ping = function (data, callback) {
  callback(200);
};

//Not found Handler
handlers.notFound = function (data, callback) {
  callback(404);
};

// Export the module
module.exports = handlers;
