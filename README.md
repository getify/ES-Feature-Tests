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

## Testify CLI

This package also includes a `testify` CLI tool, which scans files for ES6 features and produces the code for a JS function called `checkFeatureTests(..)`. For example:

```js
function checkFeatureTests(testResults){return testResults.letConst&&testResults.templateString}
```

As shown, `checkFeatureTests(..)` receives the feature test results (as provided by this *es-feature-tests* library), and returns `true` or `false` indicating if the test results are sufficient or not. This test tells you if your ES6-authored files can be loaded directly into the environment in question, or if you need to load the transpiled version of your code.

In the preceding example, both the `letConst` test result and the `templateString` test result must pass for `checkFeatureTests(..)` to pass.

By letting `testify` scan your files, you won't need to manually maintain a list of checks for your code base. Just simply run `testify` during your build process, and include the code it produces (like shown above) into your initial bootstrapped code that will run the feature tests. Use the generated `checkFeatureTests(..)` with the *es-feature-tests* library like so:

```js
var supports = window["Reflect.supports"];

// or in Node:
// var supports = require("es-feature-tests");

supports( "all", function(results){
	if (checkFeatureTests(results)) {
		// load ES6 code
	}
	else {
		// load transpiled code instead
	}
});
```

The `testify` CLI tool has the following options:

```
usage: testify [--file|--dir]=path [opt ...]

options:
--help                    show this help

--file=file               scan a single file
--dir=directory           scan all files in a directory
--exclude=pattern         exclude any included paths that match pattern (JS regex)
-C, --input               scan file contents from STDIN

--output=[simple|json|babel|traceur]
                          control output format (see docs)
                          (default: simple)
--enable=test-name        force inclusion of a test by name
--disable=test-name       force exclusion of a test by name

-R, --recursive           directory scan is recursive
                          (default: off)
-M, --ignore-missing      ignore missing dependency files
                          (default: off)
-I, --ignore-invalid      ignore JS parsing issues
                          (default: off)
```

Specify file(s) to scan by using one or more `--file` and/or `--dir` flags, and/or import text contents via `STDIN` by specifying `--input (-C)`.

If you use `--dir`, that directory's contents will be examined (non-recursively), and all found JS files will be scanned. Use `--recursive (-R)` to recursively examine sub-directories. To exclude any files/paths from this processing, use one or more `--exclude` flags, specifying a JS-style regular expression to match for exclusion (note: to avoid shell escaping issues, surround your regex in ' ' quotes).

The default (`--output=simple`) output of the `testify` CLI tool is the code for the `checkFeatureTests(..)` function, as described above. If you'd prefer to receive a JSON string holding the array of tests needed by name, specify `--output=json`. If you want to produce a [Babel](https://babeljs.io) config with tests needed mapped to the [`whitelist` option](https://babeljs.io/docs/usage/options/), use `--output=babel`. To produce the configuration for Traceur, use `--output=traceur`.

To force the inclusion of a specific test check, use `--enable` and specify the name (matching the test result name from this *es-feature-tests* library). To exclude a specific test check, use `--disable` and specify the matching name.

Suppress errors for missing scan files with `--ignore-missing` and for invalid files (failure to parse the JS) with `--ignore-invalid`.

### Testify Library

`testify` can also be used programmatically in JS:

```js
var testify = require("es-feature-tests/testify"),
	code = testify.scan({ ..options.. });

// (Optional) To use the function inside Node:
var checkFeatureTests = new Function(
	"res",
	code + ";return checkFeatureTests(res)"
);
```

The options correspond similarly to the CLI parameters described above:

* `files` (`string`, `array`): specifies file(s) to scan
* `dirs` (`string`, `array`): specifies director(ies) of file(s) to scan
* `excludes` (`string`, `array`): specifies exclusion pattern(s)
* `content` (`string`): specifies text to scan as if it was already read from a file
* `output` (`string`: `"simple"`, `"json"`, `"babel"`, `"traceur"`): controls the output formatting of the list of tests needed

   **Note:** The CLI `--output` option defaults to `"simple"` (the code for `checkFeatureTests(..)`), but the default value for the library option is `"json"`, which *actually produces the array object itself, since that will likely be more useful when used programmatically.
* `enabled` (`string`, `array`): specifies test(s) that should always be included
* `disabled` (`string`, `array`): specifies test(s) that should never be included
* `recursive` (`boolean`, default: `false`): make directory scans recursive
* `ignore` (`object`, `boolean`): if `true`/`false`, will set all sub-properties accordingly; otherwise, should be an object with one or more of these:
  - `ignore.missing` (`boolean`): ignore files or directories not found
  - `ignore.invalid` (`boolean`): ignore files where the scan fails

**Note:** `files`, `dirs`, and `excludes` all have the -`s` suffix, and `enabled` and `disabled` both have the -`d` suffix. However, the associated CLI parameter names do not have these suffixes.

## GitHub

If you install this package from GitHub instead of npm, you won't have the `deploy/*` files for deployment. Run these commands from the main repo directory to build them:

```
npm install
npm run build
```

## License

The code and all the documentation are all (c) 2015 Kyle Simpson and released under the MIT license.

http://getify.mit-license.org/
