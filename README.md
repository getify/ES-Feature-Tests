# ES Feature Tests

Feature Tests for JavaScript. This is the library used by the [FeatureTests.io](https://featuretests.io) service.

**If you're looking for the repository for the site itself, not this library, [go here instead](http://github.com/getify/featuretests.io).**

## Why

Load the library, request feature test results for the current browser, use those results to determine what code to deliver for your application!

If all the JavaScript features/syntax your code uses are supported natively by the browser, why would you load up the ugly transpiled code? Why would you load **dozens of kb** of polyfills/shims if all (or most of) those APIs are already built-in?

Just use the original authored ES6+ code in newest browsers! Only use transpiled code and polyfills/shims for browsers which are missing the features/syntax you need.

Don't rely on stale caniuse data baked into build tools that matches a browser based on brittle UserAgent string parsing. **Feature Test!** That's the most reliable and sensible approach.

For much more detail about the *why* motivations and sanity checking the risks/concerns about scalability/reliability, see [ES6: Features By Testing](http://davidwalsh.name/es6-features-testing).

## Documentation

The updated and detailed documentation for how this library works and what test results are available can be found on [FeatureTests.io/details](https://featuretests.io/details).

## Hosting vs. Hosted

Hosting this package locally on your server is mostly useful if you want to use the feature tests in your Node/iojs programs (see "Node/iojs" below).

You *can* install this package locally and web host your own copy of the library files if you prefer. You'll need to modify the URLs ("https://featuretests.io") in several places to get them to load correctly. Hosting the files also means the test results won't be shareable with other sites, which puts more testing burden on users' machines.

Another concern that only applies if you're self-hosting and running your own tests is that all of the syntax-realted tests require using `new Function(..)` (or, ugh, `eval(..)`). If your site has a restrictive [CSP](https://developer.mozilla.org/en-US/docs/Web/Security/CSP), you will not be able to run those tests unless you relax it to allow `unsafe-eval`. By allowing the service to run the tests, that CSP policy is contained to the "featuretests.io" domain instead of polluting your site's domain.

It's probably a much better idea to use the "https://featuretests.io" service's hosted versions of the files for web usage.

## Web

Using this library on the web:

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

Using this library in Node/iojs:

```
npm install es-feature-tests
```

Then:

```js
var ReflectSupports = require("es-feature-tests");

ReflectSupports( "all", function(results,timestamp){
	console.log( results );
	// {
	//    ..
	// }
});
```

## GitHub

If you install this package from GitHub instead of npm, you won't have the `deploy/*` files for deployment. Run these commands from the main repo directory to build them:

```
npm install
npm run build
```

## License

The code and all the documentation are all (c) 2015 Kyle Simpson and released under the MIT license.

http://getify.mit-license.org/
