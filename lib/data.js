/*
*Library for storing and editing data
*
*/

//dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

//Container for the module (to be exported)
const lib ={};

// Base directory for the data folder
lib.baseDir = path.join(__dirname,'/../.data/')

// Write data to a file
lib.create = function(dir,file,data,callback){
  // Open the file for writing
  fs.open(lib.baseDir+dir+'/'+file+'.json','wx',function(err,fileDescriptor){
    if(!err && fileDescriptor){
      // Conver data to string
      const stringData = JSON.stringify(data);

      //write to file and close it
       fs.writeFile(fileDescriptor,stringData,function(err){
        if(!err){
          fs.close(fileDescriptor,function(err){
            if(!err){
              callback(false);
            }else{
              callback('Error closing new file');
            }
          })
        }else{
          callback("Error writing to new file");
        }
      });
    }else{
      callback('Could not create new file, it may already exist');
    }
  });
};

// Read data from a file
lib.read = function(dir,file,callback){
  fs.readFile(lib.baseDir+dir+'/'+file+'.json', 'utf8', function(err,data){
    if(!err && data){
      const parsedData = helpers.parseJsonObject(data);
      callback(false,parsedData);
    }else{
      callback(err,data);
    }
  });
};


//update data inside a file
lib.update = function(dir,file,data,callback){
  //Open the file for writing
  fs.open(lib.baseDir+dir+'/'+file+'.json','r+',function(err,fileDescriptor){
    if(!err && fileDescriptor){
      // Conver data to string
      const stringData = JSON.stringify(data);

      //truncate the file
      fs.truncate(fileDescriptor,function(err){
        if(!err){
          // Write to the file and close it
          fs.writeFile(fileDescriptor,stringData,function(err){
            if(!err){
              fs.close(fileDescriptor,function(err){
                if(!err){
                  callback(false);
                }else{
                  callback('error closing the file');
                }
              });
            }else{
              console.log('Error writing to exisiting file');
            }
          });

        }else{
          callback('Error truncating the file')
        }
      });

    }else{
      callback('Could not open the file for updating, it may not exist yet');
    }
  });
};

// Delete a file
lib.delete = function(dir,file,callback){
  //unlink the file
  fs.unlink(lib.baseDir+dir+'/'+file+'.json',function(err){
    if(!err){
      callback(false);
    }else{
      callback('Error deleting file');
    }
  });
};

//List all the items in the directory
lib.list = function(dir,callback){
  fs.readdir(lib.baseDir+'dir'+'/',function(err,data){
    if(!err){
      const trimmedFilesNames =[];
      data.forEach(function(fileName){
        trimmedFilesNames.push(fileName.replace('.json',''))
      });
      callback(faklse,trimmedFilesNames);
    }else{
      callback(err,data);
    }
  });
};





//Export the module
module.exports = lib;
