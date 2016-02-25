# Hypermedia Schema validation

Requires node >= 0.12

Use [prmd](https://github.com/interagent/prmd)  or [schema-generator](https://hub.docker.com/r/shinydocker/schema-generator/) to generate JSON schemas (this package works for JSON schemas in general, not just for prmd's hypermedia schemas). Validation is done with the [z-schema library](https://github.com/zaggino/z-schema)


## Usage

`npm install --save hypermedia-validator`

```
var validator = require('hypermedia-validator');

var car = {
  id: 33,
  make: "Ford",
  model: "Taurus",
  color: "black"
};

validator.validate(car, 'http://example.com/schemas/main#definitions/car', function (err) {
  if (err) {
    // Validation details are stashed away in err.detail, not shown in console when thrown
    console.log("Error during validation", car, util.inspect(err, false, null));
    throw err;
  }
});
```


## Development

### Testing
run `npm test`
