# ES Feature Tests

Feature Tests for JavaScript. This is the library used by the [FeatureTests.io](https://featuretests.io) service.

## Basics

```html
<script src="https://featuretests.io/rs.js"></script>
<script>
window["Reflect.supports"]( "all", function(results,timestamp){
	console.log( results );
	// {
	//    ..
	// }
});
</script>
```

## Node/iojs

```
npm install es-feature-tests
```

Then in your code:

```js
var ReflectSupports = require("es-feature-tests");

ReflectSupports( "all", function(results,timestamp){
	console.log( results );
	// {
	//    ..
	// }
});
```

## Hosting vs. Hosted

Hosting this package locally on your server is mostly useful if you want to use the feature tests in your Node/iojs programs (see above).

If you install from GitHub instead of npm, you'll want to run this command from the main repo directory to get the `deploy/*` files:

```
npm install
```

You *can* install this package locally and web host your own copy of the library files if you prefer, but you'll need to modify the URLs in several places to get them to work correctly. It's probably a much better idea to use the service's hosted versions of the files.

## Detailed Documentation

The updated and detailed documentation for how this library works and what test results are available can be found on [featuretests.io/details](https://featuretests.io/details).

## Builds

The core library files can be re-built (minified) to the `deploy/` directory with an included utility:

```
./bin/build
```

However, the recommended way to invoke this utility is via npm:

```
npm run-script build
```

## License

The code and all the documentation are released under the MIT license.

http://getify.mit-license.org/
