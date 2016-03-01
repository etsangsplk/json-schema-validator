/* eslint-env node, mocha */
/* eslint no-sync: 0 */
/* eslint max-nested-callbacks: 0 */
/* eslint no-unused-expressions: 0 */
"use strict";

// Include external dependencies
var util = require('util');
var async = require('async');
var chai = require("chai");
var expect = chai.expect;

// Setup
chai.config.includeStack = true;

var validator = require('../index.js');

var response = require('./data/valid/links');
var invalidResponse = require('./data/valid/links');
var validJson = [
    {
      data: response,
      path: "#definitions.response"
    }
];
var invalidJson = [
    {
      data: invalidResponse,
      path: "#definitions.response"
    }
];

describe("allOf Schema Validation", function validTests() {
  it.only("should detect valid data sets", function validateValid(done) {
    var json;
    var path;
    var schemaUrl = 'http://example.com/schemas/links';
    async.each(validJson, function validate(entry, callback) {
      json = entry.data;
      path = entry.path;
      validator.validate(json, schemaUrl + path, function onValidated(err) {
        if (err) {
          console.log(util.inspect(err, false, null));
        }
        callback(err);
      });
    }, function onAllComplete(err) {
      done(err);
    });
  });
  it("should detect invalid data sets", function validateValid(done) {
    var json;
    var path;
    var schemaUrl = 'http://example.com/schemas/links';
    async.each(invalidJson, function validate(entry, callback) {
      json = entry.data;
      path = entry.path;
      validator.validate(json, schemaUrl + path, function onValidated(err) {
        expect(err).to.be.an.instanceof(Error);
        callback();
      });
    }, function onAllComplete(err) {
      done(err);
    });
  });
});
