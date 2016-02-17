# Hypermedia Schema validation

Use [prmd](https://github.com/interagent/prmd) to generate JSON schemas (this package works for JSON schemas in general, not just for prmd's hypermedia schemas). Validation is done with the [z-schema library](https://github.com/zaggino/z-schema)


## Usage

`npm install --save hypermedia-validator`

```
var validator = require('hypermedia-validator');

var car = getCarObjectFromRequest();

validator.validate(car, 'example.com/schemas/main#definitions/car', function (err) {
  if (err) {
    // Validation details are stashed away in err.detail, not shown in console when thrown
    console.log("Error during validation", car, util.inspect(err, false, null));
    throw err;
  }
});
```
