"use strict";

// Minified from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
Object.assign||Object.defineProperty(Object,"assign",{enumerable:!1,configurable:!0,writable:!0,value:function(a){"use strict";if(void 0===a||null===a)throw new TypeError("Cannot convert first argument to object");for(var c=Object(a),d=1;d<arguments.length;d++){var e=arguments[d];if(void 0!==e&&null!==e){e=Object(e);for(var f=Object.keys(Object(e)),g=0,h=f.length;h>g;g++){var i=f[g],j=Object.getOwnPropertyDescriptor(e,i);void 0!==j&&j.enumerable&&(c[i]=e[i])}}}return c}});

var fs = require("fs"),
	os = require("os"),
	path = require("path"),
	ft = require(path.join(__dirname,"..","..","lib","featuretests.js")),
	acorn = require("acorn/dist/acorn_loose"),
	walk = require("acorn/dist/walk"),

	parse_options = {
		ecmaVersion: 6,
		allowHashBang: true
	},
	walk_visitors = {},
	walk_handlers = Object.assign({},walk.base),

	orig_tests = Object.assign({},ft.es6),
	tests_needed,

	files_to_scan = [],

	OPTS,

	DIR_CWD = process.cwd(),
	DIR_HOME = (
		os.homedir ?
			os.homedir() :
			process.env[(process.platform == "win32") ? "USERPROFILE" : "HOME"]
	),

	CONCISE = "CONCISE",
	FUNC = "FUNC",
	METHOD = "METHOD",
	FNARGS = "FNARGS",
	DESTRU = "DESTRU"
;

setupParser();

// module exports
exports.scan = scan;

// ***********************************

function setupParser() {
	// setup AST walk visitors
	Object.keys(walk.base).forEach(function eacher(type){
		walk_visitors[type] = visitNode;
	});

	// setup AST walk handler overrides
	walk_handlers.Function = function $Function$(node,st,c) {
		if (!Array.isArray(st)) st = [];
		st.push(st[st.length-1] == CONCISE ? METHOD : FUNC);

		st.push(FNARGS);
		for (var i = 0; i < node.params.length; i++) {
			c(node.params[i], st, "Pattern");
		}
		st.pop();

		c(node.body, st, "ScopeBody");
		st.pop();
	};

	walk_handlers.ArrayPattern = function $ArrayPattern$(node,st,c) {
		if (!Array.isArray(st)) st = [];
		st.push(DESTRU);
		walk.base.ArrayPattern.call(this,node,st,c);
		st.pop();
	};

	walk_handlers.ObjectPattern = function $ObjectPattern$(node,st,c) {
		if (!Array.isArray(st)) st = [];
		st.push(DESTRU);
		walk.base.ObjectPattern.call(this,node,st,c);
		st.pop();
	};

	walk_handlers.Property = function $Property$(node,st,c) {
		if (!Array.isArray(st)) st = [];
		if (node.method || node.shorthand) st.push(CONCISE);
		walk.base.Property.call(this,node,st,c);
		if (node.method || node.shorthand) st.pop();
	};
}

function fileExists(filepath) {
	try {
		if (fs.existsSync(filepath)) {
			return true;
		}
	}
	catch (err) { }
	return false;
}

function isDirectory(filepath) {
	var stat = fs.statSync(filepath);
	return stat.isDirectory();
}

function isFile(filepath) {
	var stat = fs.statSync(filepath);
	return stat.isFile();
}

function isFileExcluded(filepath) {
	if (OPTS.excludes.length > 0) {
		return OPTS.excludes.some(function somer(exclude){
				return (new RegExp(exclude)).test(filepath);
			});
	}
	return false;
}

function handleMissingFile(filepath,err) {
	if (!OPTS.ignore.missing) {
		if (/^Not found:/.test(err.message)) {
			throw err;
		}
		else {
			throw new Error("Not found: " + filepath);
		}
	}
}

function handleInvalidFile(filepath,err) {
	if (!OPTS.ignore.invalid) {
		if (/^Invalid:/.test(err.message)) {
			throw err;
		}
		else {
			throw new Error("Invalid: " + filepath + "\n" + err.toString());
		}
	}
}

// adapted from: https://github.com/azer/expand-home-dir
function resolveHomeDir(filepath) {
	if (filepath == "~") return DIR_HOME;
	return path.join(DIR_HOME,filepath.slice(2));
}

function fixPath(pathStr) {
	if (!path.isAbsolute(pathStr)) {
		if (/^~/.test(pathStr)) {
			pathStr = resolveHomeDir(pathStr);
		}
		else if (!(new RegExp("^[" + path.sep + "]")).test(pathStr)) {
			pathStr = path.join(DIR_CWD,pathStr);
		}
	}
	return pathStr;
}

function validateOptions() {
	if (!(
			OPTS.files != null ||
			OPTS.dirs != null ||
			OPTS.content != null
	)) {
		throw new Error("Missing required option: 'files', 'dirs', or 'content'");
	}
	else if (
		OPTS.files != null &&
		(
			OPTS.files === "" ||
			(
				typeof OPTS.files != "string" &&
				!Array.isArray(OPTS.files)
			) ||
			(
				Array.isArray(OPTS.files) &&
				~OPTS.files.indexOf("")
			)
		)
	) {
		throw new Error("'files' option must specify a single non-empty value, or an array of non-empty values");
	}
	else if (
		OPTS.dirs != null &&
		(
			OPTS.dirs === "" ||
			(
				typeof OPTS.dirs != "string" &&
				!Array.isArray(OPTS.dirs)
			) ||
			(
				Array.isArray(OPTS.dirs) &&
				~OPTS.dirs.indexOf("")
			)
		)
	) {
		throw new Error("'dirs' option must specify a single non-empty value, or an array of non-empty values");
	}
	else if (
		OPTS.excludes != null &&
		(
			OPTS.excludes === "" ||
			(
				typeof OPTS.excludes != "string" &&
				!Array.isArray(OPTS.excludes)
			) ||
			(
				Array.isArray(OPTS.excludes) &&
				~OPTS.excludes.indexOf("")
			)
		)
	) {
		throw new Error("'excludes' option must specify a single non-empty value, or an array of non-empty values");
	}
	else if (
		OPTS.content != null &&
		(
			typeof OPTS.content != "string" ||
			OPTS.content.trim() === ""
		)
	) {
		throw new Error("'content' option must specify a single non-empty value");
	}
	else if (
		OPTS.output != null &&
		!~(["simple","json","babel","traceur"]).indexOf(OPTS.output)
	) {
		throw new Error("'output' option must be one of: 'simple', 'json', 'babel', or 'traceur'");
	}
	else if (
		OPTS.enabled != null &&
		(
			OPTS.enabled === "" ||
			(
				typeof OPTS.enabled != "string" &&
				!Array.isArray(OPTS.enabled)
			) ||
			(
				Array.isArray(OPTS.enabled) &&
				~OPTS.enabled.indexOf("")
			)
		)
	) {
		throw new Error("'enabled' option must specify a single non-empty value, or an array of non-empty values");
	}
	else if (
		OPTS.disabled != null &&
		(
			OPTS.disabled === "" ||
			(
				typeof OPTS.disabled != "string" &&
				!Array.isArray(OPTS.disabled)
			) ||
			(
				Array.isArray(OPTS.disabled) &&
				~OPTS.disabled.indexOf("")
			)
		)
	) {
		throw new Error("'disabled' option must specify a single non-empty value, or an array of non-empty values");
	}
	else if (
		OPTS.recursive != null &&
		typeof OPTS.recursive != "boolean"
	) {
		throw new Error("'recursive' option must be true/false");
	}
	else if (
		OPTS.ignore != null &&
		(
			typeof OPTS.ignore != "object" ||
			!(
				"missing" in OPTS.ignore ||
				"invalid" in OPTS.ignore
			)
		)
	) {
		throw new Error("'ignore' option must be be an object with 'missing' or 'invalid' specified");
	}
	else if (
		OPTS.ignore.missing != null &&
		typeof OPTS.ignore.missing != "boolean"
	) {
		throw new Error("'ignore.missing' option must be true/false");
	}
	else if (
		OPTS.ignore.missing != null &&
		typeof OPTS.ignore.missing != "boolean"
	) {
		throw new Error("'ignore.missing' option must be true/false");
	}
}

function processOptions() {
	// normalize `OPTS.ignore`
	if (OPTS.ignore == null || OPTS.ignore === false) {
		OPTS.ignore = { missing: false, invalid: false };
	}
	else if (OPTS.ignore === true) {
		OPTS.ignore = { missing: true, invalid: true };
	}

	// verify CLI usage
	validateOptions();

	// normalize options
	if (!OPTS.excludes) {
		OPTS.excludes = [];
	}
	else if (!Array.isArray(OPTS.excludes)) {
		OPTS.excludes = [OPTS.excludes];
	}
	if (!OPTS.output) {
		OPTS.output = "json";
	}
	if (!OPTS.disabled) {
		OPTS.disabled = [];
	}
	else if (!Array.isArray(OPTS.disabled)) {
		OPTS.disabled = [OPTS.disabled];
	}
	if (!OPTS.enabled) {
		OPTS.enabled = [];
	}
	else if (!Array.isArray(OPTS.enabled)) {
		OPTS.enabled = [OPTS.enabled];
	}
	// now exclude disabled tests
	OPTS.enabled = OPTS.enabled.filter(function filterer(test){
		return !~OPTS.disabled.indexOf(test);
	});

	if (OPTS.files && !Array.isArray(OPTS.files)) {
		OPTS.files = [OPTS.files];
	}
	if (OPTS.dirs && !Array.isArray(OPTS.dirs)) {
		OPTS.dirs = [OPTS.dirs];
	}
	if (OPTS.content) {
		OPTS.content = OPTS.content.trim();
	}

	// include text content
	if (OPTS.content) {
		scanText(OPTS.content,"(STDIN)");
	}

	// include manually specified files
	if (OPTS.files) {
		processFilesOption();
	}

	// include files from any specified directories
	if (OPTS.dirs) {
		processDirsOption();
	}
}

function validateFile(filepath) {
	try {
		if (!isFileExcluded(filepath)) {
			if (fileExists(filepath)) {
				if (isDirectory(filepath)) {
					return;
				}
				return true;
			}
		}
		else return false;
	}
	catch (err) { }

	handleMissingFile(filepath,new Error("Not found: " + filepath));

	return false;
}

function processFilesOption() {
	files_to_scan = files_to_scan.concat(
		OPTS.files
			.map(fixPath)
			.filter(function filterer(filepath){
				var res = validateFile(filepath);
				if (res == null) {
					OPTS.dirs = OPTS.dirs || [];
					OPTS.dirs.push(filepath);
				}
				return res;
			})
	);
}

function processDirectory(filepath) {
	var files = [], dirs = [], res;

	try {
		res = fs.readdirSync(filepath)
			.map(function mapper(filename){
				return path.join(filepath,filename);
			})
			.forEach(function partition(filepath){
				var res = validateFile(filepath);
				if (res == null) {
					dirs.push(filepath);
				}
				else if (res) {
					files.push(filepath);
				}
				return res;
			});

		files_to_scan = files_to_scan.concat(files);

		// recurse into any sub-directories found
		if (OPTS.recursive) {
			dirs.forEach(processDirectory);
		}
	}
	catch (err) {
		handleMissingFile(filepath,err);
	}
}

function processDirsOption() {
	OPTS.dirs
		.map(fixPath)
		.forEach(processDirectory);
}


// adapted from: https://github.com/azer/expand-home-dir
function resolveHomeDir(filepath) {
	if (filepath == "~") return DIR_HOME;
	return path.join(DIR_HOME,filepath.slice(2));
}

function fixPath(pathStr) {
	if (!path.isAbsolute(pathStr)) {
		if (/^~/.test(pathStr)) {
			pathStr = resolveHomeDir(pathStr);
		}
		else if (!(new RegExp("^[" + path.sep + "]")).test(pathStr)) {
			pathStr = path.join(DIR_CWD,pathStr);
		}
	}
	return pathStr;
}

function scanFile(filepath) {
	var contents;

	try {
		if (!(
			fileExists(filepath) &&
			isFile(filepath)
		)) {
			throw new Error("Not found: " + filepath);
		}
	}
	catch (err) {
		handleMissingFile(filepath,err);
	}

	contents = fs.readFileSync(filepath,{ encoding: "utf8" });

	scanText(contents);
}

function scanText(contents,filepath) {
	var ast;

	try {
		ast = acorn.parse_dammit(contents,parse_options);

		walk.simple(ast,walk_visitors,walk_handlers);
	}
	catch (err) {
		handleInvalidFile(filepath,err);
	}
}

function visitNode(node,state) {
	if (!tests_needed.letConst &&
		node.type == "VariableDeclaration" &&
		(
			node.kind == "let" ||
			node.kind == "const"
		)
	) {
		tests_needed.letConst = true;
	}
	else if (!tests_needed.templateString &&
		(
			node.type == "TemplateLiteral" ||
			node.type == "TaggedTemplateExpression"
		)
	) {
		tests_needed.templateString = true;
	}
	else if (!tests_needed.forOf &&
		node.type == "ForOfStatement"
	) {
		tests_needed.forOf = true;
	}
	else if (!tests_needed.arrow &&
		node.type == "ArrowFunctionExpression"
	) {
		tests_needed.arrow = true;
	}
	else if (!tests_needed.generator &&
		(
			node.type == "FunctionDeclaration" ||
			node.type == "FunctionExpression" ||
			node.type == "MethodExpression"
		) &&
		node.generator
	) {
		tests_needed.generator = true;
	}
	else if (!tests_needed["class"] &&
		(
			node.type == "ClassDeclaration" ||
			node.type == "ClassExpression"
		)
	) {
		tests_needed["class"] = true;
	}
	else if (!tests_needed.spreadRest &&
		(
			node.type == "SpreadElement" ||
			node.type == "RestElement"
		)
	) {
		tests_needed.spreadRest = true;
	}
	else if (!tests_needed.symbol &&
		node.type == "Identifier" &&
		node.name == "Symbol"
	) {
		tests_needed.symbol = true;
	}
	else if (!tests_needed.moduleExport &&
		(
			node.type == "ExportNamedDeclaration" ||
			node.type == "ExportDefaultDeclaration" ||
			node.type == "ExportAllDeclaration"
		)
	) {
		tests_needed.moduleExport = true;
	}
	else if (!tests_needed.moduleImport &&
		node.type == "ImportDeclaration"
	) {
		tests_needed.moduleImport = true;
	}
	else if (!tests_needed.computedProperty &&
		node.type == "Property" &&
		node.computed
	) {
		tests_needed.computedProperty = true;
	}
	else if (!tests_needed.conciseMethodProperty &&
		node.type == "Property" &&
		(
			node.shorthand ||
			node.method
		)
	) {
		tests_needed.conciseMethodProperty = true;
	}
	else if (!tests_needed.defaultParameter &&
		node.type == "AssignmentPattern" &&
		Array.isArray(state) &&
		state[state.length-1] == FNARGS
	) {
		tests_needed.defaultParameter = true;
	}
	else if (
		node.type == "ObjectPattern" ||
		node.type == "ArrayPattern"
	) {
		if (Array.isArray(state) &&
			state[state.length-1] == FNARGS
		) {
			tests_needed.parameterDestructuring = true;
		}
		else {
			tests_needed.destructuring = true;
		}
	}
	else if (!tests_needed.numericLiteral &&
		node.type == "Literal" &&
		typeof node.raw == "string" &&
		/^0[oObBxX]/.test(node.raw)
	) {
		tests_needed.numericLiteral = true;
	}
	else if (!tests_needed.oldOctalLiteral &&
		node.type == "Literal" &&
		typeof node.raw == "string" &&
		/^0\d/.test(node.raw)
	) {
		tests_needed.oldOctalLiteral = true;
	}
	else if (!tests_needed.unicodeRegExp &&
		node.type == "Literal" &&
		node.regex &&
		typeof node.regex.flags == "string" &&
		~node.regex.flags.indexOf("u")
	) {
		tests_needed.unicodeRegExp = true;
	}
	else if (!tests_needed.stickyRegExp &&
		node.type == "Literal" &&
		node.regex &&
		typeof node.regex.flags == "string" &&
		~node.regex.flags.indexOf("y")
	) {
		tests_needed.stickyRegExp = true;
	}
	else if (!tests_needed.unicodeEscape &&
		node.type == "Literal" &&
		/(["']).*\\u\{[0-9a-f]+\}.*\1/i.test(node.raw)
	) {
		tests_needed.unicodeEscape = true;
	}
	else if (!tests_needed.objectSuper &&
		node.type == "Super" &&
		Array.isArray(state) &&
		state[state.length-1] == METHOD
	) {
		tests_needed.objectSuper = true;
	}
	else if (!tests_needed.objectProto &&
		node.type == "Property" &&
		node.key &&
		(
			node.key.name == "__proto__" ||
			node.key.value == "__proto__"
		)
	) {
		tests_needed.objectProto = true;
	}

	// TODO: add more ES6 checks
}

function babelWhitelist(tests) {
	var mappings = {
			"es6.arrowFunctions": ["arrow"],
			"es6.blockScoping": ["letConst","letLoop","constLoop"],
			"es6.classes": ["classes"],
			"es6.constants": ["letConst","constLoop"],
			"es6.destructuring": ["destructuring","paramDestructuring"],
			"es6.modules": ["moduleExport","moduleImport"],
			"es6.objectSuper": ["objectSuper"],
			"es6.parameters.default": ["defaultParameter"],
			"es6.parameters.rest": ["spreadRest"],
			"es6.properties.computed": ["computedProperty"],
			"es6.properties.shorthand": ["conciseMethodProperty"],
			"es6.regex.sticky": ["stickyRegExp"],
			"es6.regex.unicode": ["unicodeRegExp"],
			"es6.spec.blockScoping": ["letTDZ","letLoopScope"],
			"es6.spec.symbols": ["symbolImplicitCoercion"],
			"es6.spec.templateLiterals": ["templateString"],
			"es6.spread": ["spreadRest"],
			"es6.tailCall": ["TCO"],
			"es6.templateLiterals": ["templateString"],
			"regenerator": ["generator"]
		};

	return {
		whitelist: Object.keys(mappings)
			.filter(function filterer(transformer){
				return mappings[transformer].some(function somer(test){
					return ~tests.indexOf(test);
				});
			})
	};
}

function scan(opts) {
	var output = "";

	// (re)initialize all global state
	files_to_scan.length = 0;
	tests_needed = Object.assign({},orig_tests);
	Object.keys(tests_needed).forEach(function eacher(test){
		tests_needed[test] = false;
	});

	// make a copy of specified options
	OPTS = Object.assign({},opts);

	processOptions();

	// set required tests
	OPTS.enabled.forEach(function eacher(test){
		if (tests_needed.hasOwnProperty(test)) {
			tests_needed[test] = true;
		}
	});

	// scan all files for ES6+ features
	files_to_scan.forEach(scanFile);

	// filter out any tests not needed
	tests_needed = Object.keys(tests_needed)
		.filter(function filterer(test){
			return (
				// keep only tests that already passed...
				tests_needed[test] &&
				// ...but exclude any explicitly disabled tests
				!~OPTS.disabled.indexOf(test)
			);
		});

	// populate output
	if (tests_needed.length > 0) {
		if (OPTS.output == "simple") {
			output += "function checkFeatureTests(testResults){return ";
			tests_needed.forEach(function eacher(test,idx){
				output += (idx > 0 ? "&&" : "");
				if (test == "class") output += "testResults[\"" + test + "\"]";
				else output += "testResults." + test;
			});
			output += "}";
		}
		else if (OPTS.output == "json") {
			output = tests_needed;
		}
		else if (OPTS.output == "babel") {
			output = babelWhitelist(tests_needed);
		}
	}
	else {
		if (OPTS.output == "simple") {
			output = "function checkFeatureTests(){return true}";
		}
		else {
			output = [];
		}
	}

	return output;
}
