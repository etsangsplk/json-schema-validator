/* eslint-env node */
"use strict";

// Include external dependencies
var util = require('util');
var fs = require('fs');
var url = require('url');
var mkdirp = require('mkdirp');
var path = require('path');
var async = require('async');
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
    getSchemaFromUri(schemaUri, (err, schema) => {
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
    (cb) => {
      // Check that file exists. If not, fetch and cache it
      fs.stat(filename, (err, stats) => {
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
    (cb) => {
      readCachedSchema(filename, cb);
    }
  ], (err, schema) => {
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
  fs.readFile(filename, (error, data) => {
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
    (cb) => {
      mkdirp(directory, cb);
    },
    // Fetch schema from URL
    (createdDir, cb) => {
      http.get(schemaUri, (response) => {
        cb(null, response);
      }).on('error', (e) => {
        cb(e);
      });
    },
    // Write/pipe schema to file
    (response, cb) => {
      var writeStream = fs.createWriteStream(filename);
      response.pipe(writeStream);
      writeStream.on('finish', () => {
        cb(null, writeStream);
      });
    },
    // Close write stream
    (writeStream, cb) => {
      writeStream.close(cb);
    }
  ], (err) => {
    return callback(err);
  });
}
