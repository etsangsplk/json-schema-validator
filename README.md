# Hypermedia Schema validation

Requires node >= 0.12

Use [prmd](https://github.com/interagent/prmd)  or [schema-generator](https://hub.docker.com/r/shinydocker/schema-generator/) to generate JSON schemas (this package works for JSON schemas in general, not just for prmd's hypermedia schemas). Validation is done with the [z-schema library](https://github.com/zaggino/z-schema)

Schemas fetched from http uri's are cached to file if node has write permission to the `schemas` directory

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

### CLI
```
npm install -g hypermedia-validator
validate cars.json file://schema.json#definitions/car/definitions/cars

// Or
validate cars.json http://example.com/schemas/main#definitions/car/definitions/cars
```



## Development

### Testing
run `npm test`
