/* eslint-env node */
"use strict";

// Include external dependencies
var util = require('util');
var fs = require('fs');
var url = require('url');
var mkdirp = require('mkdirp');
var path = require('path');
var async = require('async');
var streamifier = require('streamifier');
var http = require('http');
var ZSchema = require('z-schema');
//var fs = require('fs');

// Custom error
function SchemaValidationError(message, errors) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.name = "SchemaValidationError";
  this.message = message;
  this.statusCode = 422;
  this.detail = {
    errors: errors
  };
}
util.inherits(SchemaValidationError, Error);


// Set up the validator
var options = {};
var validator = new ZSchema(options);
var interagentSchema = require(__dirname + '/schemas/interagent.github.io/interagent-hyper-schema');
validator.setRemoteReference('http://interagent.github.io/interagent-hyper-schema', interagentSchema);

// Public
module.exports = {
  validate: function validate(data, schemaUri, callback) {
    var schemaPath = getSchemaPath(schemaUri);
    getSchemaFromUri(schemaUri, function onGetSchema(err, schema) {
      if (err) {
        return callback(err);
      }
      var valid;
      valid = validator.validate(data, schema, {schemaPath: schemaPath});
      if (valid !== true) {
        err = new SchemaValidationError("Data not valid against schema", validator.getLastErrors());
      }
      return callback(err);
    });
  }
};

/**
 * Get schema by fetching it from the specified URI
 *
 * @param {string} schemaUri
 * @param {function} callback On complete, callback(err, jsonSchemaObject)
 */
function getSchemaFromUri(schemaUri, callback) {
  var urlParts = url.parse(schemaUri);
  var filename = path.join(__dirname, "/schemas", urlParts.host, urlParts.pathname);
  async.waterfall([
    function checkCache(cb) {
      // Check that file exists. If not, fetch and cache it
      fs.stat(filename, function onStat(err, stats) {
        if (err && err.code === "ENOENT") {
          cacheSchema(schemaUri, filename, cb);
        } else if (err) {
          cb(err);
        } else {
          cb(null, null);
        }
      });
    },
    // Read cached schema, as it should exist if this line is reached
    function readSchema(response, cb) {
      if (response) {
        cb(null, JSON.parse(response));
      } else {
        readCachedSchema(filename, cb);
      }
    }
  ], function onWaterfallComplete(err, schema) {
    return callback(err, schema);
  });
}

/**
 * Read schema from file. Assumes file already exists
 *
 * @param {string} filename
 * @param {function} callback On complete, callback(err, jsonSchemaObject)
 */
function readCachedSchema(filename, callback) {
  // File exists, read it
  fs.readFile(filename, function onFileRead(error, data) {
    if (error) {
      return callback(error);
    }
    var schema;
    try {
      schema = JSON.parse(data);
    } catch (e) {
      return callback(e);
    }
    return callback(null, schema);
  });
}

/**
 * Get the subschema to validate against. Based on the URL part after the hash
 *
 * @param {string} schemaUri
 *
 * @returns {string}
 */
function getSchemaPath(schemaUri) {
  var urlParts = url.parse(schemaUri);
  var hash = urlParts.hash;
  if (hash === null || hash.length === 1) {
    return undefined;
  }
  var schemaPath = hash.substring(1).replace(/\//g, ".");
  return schemaPath;
}

/**
 * Fetch the schema from the specified url and save it to file
 *
 * @param {string} schemaUri
 * @param {string} filename  Location to cache schema file to
 * @param {function} callback On complete, callback(err)
 */
function cacheSchema(schemaUri, filename, callback) {
  var pathParts = path.parse(filename);
  var directory = pathParts.dir;
  var schemaData;
  var isFile;

  // Fetch schema from file or http uri
  var urlParts = url.parse(schemaUri);
  if (urlParts.protocol === "file:") {
    // Already a local file, read it, no need to cache
    var filePath = path.join(urlParts.host, urlParts.path);
    fs.readFile(filePath, function onRead(err, data) {
      if (err) {
        callback(err);
      } else {
        schemaData = data.toString();
        callback(null, schemaData);
      }
    });
  } else {
    // Get from http and cache to file
    http.get(schemaUri, function onGet(response) {
      var data = '';
      response.on('data', function onData(d) {
        data += d;
      });
      response.on('end', function onEnd(d) {
        schemaData = data;
        writeCache();
      });
    }).on('error', function onError(e) {
      return callback(e);
    });
  }

  function writeCache() {
    async.waterfall([
      // Fetch schema from URL
      // Make directory, recursively
      function makeDir(cb) {
        mkdirp(directory, cb);
      },
      // Write/pipe schema to file
      function writeFile(createdDir, cb) {
        var writeStream;
        var skipClose = false;
        if (isFile) {
          cb(null, null);
        } else {
          writeStream = fs.createWriteStream(filename);
          streamifier.createReadStream(schemaData).pipe(writeStream);
          writeStream.on('error', function onWriteError(err) {
            skipClose = true;
            cb(err);
          });
          writeStream.on('finish', function onWrite(a, b) {
            if (skipClose === false) {
              cb(null, writeStream);
            }
          });
        }
      },
      // Close write stream
      function closeFile(writeStream, cb) {
        if (writeStream) {
          writeStream.close(function onCloseStream(err) {
            cb(err);
          });
        } else {
          cb(null);
        }
      }
    ], function onWaterfallComplete(err) {
      if (err && schemaData !== undefined) {
        // We weren't able to cache it, but schema was read, so, success, kind of
        return callback(null, schemaData);
      }
      return callback(err, schemaData);
    });
  }
}
