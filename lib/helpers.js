/*
* Helpers for various tasks
*
*/

// Dependencies
const crypto = require('crypto');
const config = require('./config');
const https = require('https')
const querystring = require('querystring');

// Container for all the helpers
const helpers = {};


// Create a SHA256 hash
helpers.hash = function(str){
  if(typeof(str)=='string' && str.length > 0){
    const hash = crypto.createHmac('sha256',config.hashingSecret).update(str).digest('hex');
    return hash;
  }else{
    return false;
  }
};

// PArse a JSON string to an object in all cases, without throwing
helpers.parseJsonObject = function(str){
  try{
    const obj = JSON.parse(str);
    return obj;
  }catch(e){
    return {};
  }
}


//Create a string of random alphanumeric characters, of a given lenght
helpers.createRandomString = function(strLength){
  strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength :false;
  if(strLength){
    //Define all the possible characters that could go into a string
    const possibleCharacters = 'qwertyuiopahjlksfdgzvxcbnm123456789';

    //start the final string;
    let str ='';
    for(i=1;i<=strLength;i++){
      // Get the random character from the possibleCharacters string
      const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
      //Append this character to the final string
      str+=randomCharacter;
    }
    //Retrun the final String
    return str;
  }else{
    return false;
  }
};

  // Send an SMS message via twilio
  helpers.sendTwilioSms = function(phone,msg,callback){
    //validate parameters
   phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
   msg = typeof(msg) =='string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
  if(phone && msg){
    // Configure the requrest payload
    const payload = {
      'From' : config.twilio.fromPhone,
      'To' : '+91'+phone,
      'Body' : msg
    };

    //stringify the payload
    const stringPayload = querystring.stringify(payload);

    // Configure the request details
    const requrestDetails = {
      'protocol' : 'https:',
      'hostname' : 'api.twilio.com',
      'method' : 'POST',
      'path': '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
      'auth' : config.twilio.accountSid +'/'+ config.twilio.authToken,
      'headers': {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length' : Buffer.byteLength(stringPayload)
      }
    };

    //Instantiatre the requrest object
    const req = https.request(requrestDetails,function(res){
      // Grab the status of the sent requrest
      const status = res.statusCode;
      // Callback successfully if the request went through
      if(status == 200 || status == 201){
        callback(false);
      }else{
        callback('Status code returned was' +status);
      }
    });

    // Bind to the error event so it does't get thrown
    req.on('error',function(e){
      callback(e);
    });

    // Add the payload
    req.write(stringPayload);

    // End the request
    req.end();

  }else{
    callback('Giving parameters were missing or invalid');
  }
}





// Export the module
module.exports = helpers;
