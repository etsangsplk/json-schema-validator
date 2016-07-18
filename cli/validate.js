#!/usr/bin/env node
/* eslint-env node */
/* eslint no-sync: 0 */

// Require external modules
var program = require('commander');
var util = require('util');
var fs = require('fs');

// Require local modules
var validator = require('..');
var packageJson = require(__dirname + '/../package');


var fileName;
var schemaUri;
// Parse command line arguments
program
  .version(packageJson.version)
  //.arguments('[options] <fileName>')
  .usage('[options] <fileName> <schemaUri>')
  .action(function doAction(f, s) {
    fileName = f;
    schemaUri = s;
  })
  .parse(process.argv);

if (program.args.length === 0) {
  console.error("No fileName arg specified");
  program.outputHelp();
  process.exit(1);
}

if (program.args.length === 1) {
  console.error("No schemaUri arg specified");
  program.outputHelp();
  process.exit(1);
}

var data = JSON.parse(fs.readFileSync(fileName).toString());
validator.validate(data, schemaUri, onValidated);

function onValidated(err) {
  if (err) {
    console.error(util.inspect(err, false, null));
    process.exit(1);
  }
  console.log("success");
  process.exit(0);
}
