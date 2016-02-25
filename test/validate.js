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

var car = require('./data/valid/car');
var coloredCar = require('./data/valid/colored-car');
var cars = require('./data/valid/cars');
var color = require('./data/valid/color');
var colors = require('./data/valid/colors');
var extraPropCar = require('./data/invalid/extra-prop-car');
var invalidColorCar = require('./data/invalid/invalid-color-car');
var invalidColor = require('./data/invalid/invalid-color');
var validJson = [
    {
      data: car,
      path: "#definitions.car"
    },
    {
      data: cars,
      path: "#definitions.car.definitions.cars"
    },
    {
      data: color,
      path: "#definitions.color"
    },
    {
      data: colors,
      path: "#definitions.color.definitions.colors"
    },
    {
      data: coloredCar,
      path: "#definitions.car"
    }
];
var invalidJson = [
    {
      data: invalidColorCar,
      path: "#definitions.car"
    },
    {
      data: invalidColor,
      path: "#definitions.color"
    },
    {
      data: extraPropCar,
      path: "#definitions.car"
    }
];

describe("Schema Validation", function validTests() {
  it("should detect valid data sets", function validateValid(done) {
    var json;
    var path;
    var schemaUrl = 'http://example.com/schemas/main';
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
    var schemaUrl = 'http://example.com/schemas/main';
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
