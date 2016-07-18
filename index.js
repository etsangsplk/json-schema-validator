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
var interagentSchema = require('./schemas/interagent.github.io/interagent-hyper-schema');
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
          cb();
        }
      });
    },
    // Read cached schema, as it should exist if this line is reached
    function readSchema(cb) {
      readCachedSchema(filename, cb);
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
  async.waterfall([
    // Make directory, recursively
    function makeDir(cb) {
      mkdirp(directory, cb);
    },
    // Fetch schema from URL
    function fetchSchema(createdDir, cb) {
      var urlParts = url.parse(schemaUri);
      console.log({urlParts});
      if (urlParts.protocol === "file:") {
        fs.readFile(path.join(urlParts.host, urlParts.path), function onRead(err, data) {
          if (err) {
            cb(err);
          } else {
            cb(null, data);
          }
        });
      } else {
        http.get(schemaUri, function onGet(response) {
          cb(null, response);
        }).on('error', function onError(e) {
          cb(e);
        });
      }
    },
    // Write/pipe schema to file
    function writeFile(response, cb) {
      var writeStream = fs.createWriteStream(filename);
      console.log({response});
      if (Buffer.isBuffer(response)) {
        streamifier.createReadStream(response).pipe(writeStream);
      } else {
        response.pipe(writeStream);
      }
      writeStream.on('finish', function onWrite() {
        cb(null, writeStream);
      });
    },
    // Close write stream
    function closeFile(writeStream, cb) {
      writeStream.close(cb);
    }
  ], function onWaterfallComplete(err) {
    return callback(err);
  });
}
