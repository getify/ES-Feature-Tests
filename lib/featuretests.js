/*! es-feature-tests
    v0.3.0 (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/

var results = {}, es6, setup;
global = (typeof global != "undefined") ? global : runIt("return this");

function runIt(code) {
	return (new Function(code))();
}

setup = (function IIFE(){
	"use strict";

	es6 = {
		// syntax
		letConst: { passes: "'use strict'; let a; const b = 2;" },
		letLoop: { passes: "'use strict'; for(let i in {}){}; for(let i=0;;){break}" },
		constLoop: { passes: "'use strict'; for(const i in {}){}; for (const i=0;;){break}" },
		defaultParameter: { passes: "'use strict'; function a(b=2){}" },
		spreadRest: { passes: "'use strict'; var a = [1,2]; +function b(...c){}(...a);" },
		destructuring: { passes: "'use strict'; var a = [1,2], [b,c] = a, d = {e:1,f:2}, {e:E,f} = d;" },
		parameterDestructuring: { passes: "'use strict'; function a({b,c}){}" },
		templateString: { passes: "'use strict'; var a = 1, b = `c${a}d`;" },
		forOf: { passes: "'use strict'; for (var a of [1]) {}" },
		arrow: { passes: "'use strict'; var a = () => {};" },
		generator: { passes: "'use strict'; function *a(){ yield; }" },
		conciseMethodProperty: { passes: "'use strict'; var a = 1, b = { c(){}, a };" },
		computedProperty: { passes: "'use strict'; var a = 1, b = { ['x'+a]: 2 };" },
		moduleExport: { passes: "'use strict'; export var a = 1;" },
		moduleImport: { passes: "'use strict'; import {a} from 'b';" },
		classes: { passes: "'use strict'; class Foo {}; class Bar extends Foo {};" },
		numericLiteral: { passes: "'use strict'; var a = 0o1, b = 0b10;" },
		oldOctalLiteral: { passes: "var a = 01;" },
		symbol: { passes: "'use strict'; var a = Symbol('b');" },
		unicodeEscape: { passes: "'use strict'; var a = '\\u{20BB7}';" },
		unicodeIdentifier: { passes: "'use strict'; var \\u{20BB7};" },
		unicodeRegExp: { passes: "'use strict'; var a = /\\u{20BB7}/u;" },
		stickyRegExp: { passes: "'use strict'; var a = /b/y;" }
	};

	assign(es6,{
		// aliases
		"class": es6.classes,

		// semantics
		letTDZ: { dependencies: ["letConst"], fails: "'use strict'; a = 1; let a;" },
		letLoopScope: { dependencies: ["letLoop","forOf"], passes: "'use strict'; var x=[],i=0;for(let i=2;i<3;i++){x.push(function(){return i})};for(let i in {3:0}){x.push(function(){return i})};for(let i of [4]){x.push(function(){return i})};if(x[0]()*x[1]()*x[2]()!=24) throw 0;" },
		constRedef: { dependencies: ["letConst"], fails: "'use strict'; const a = 1; a = 2;" },
		objectProto: { passes: "'use strict'; var a = { b: 2 }, c = { __proto__: a }; if (c.b !== 2) throw 0;" },
		objectSuper: { passes: "'use strict'; var a = { b: 2 }, c = { d() { return super.b; } }; Object.setPrototypeOf(c,a); if (c.d() !== 2) throw 0;" },
		extendNatives: { dependencies: ["class"], passes: "'use strict'; class Foo extends Array { }; var a = new Foo(); a.push(1,2,3); if (a.length !== 3) throw 0;" },
		TCO: { passes: "'use strict'; +function a(b){ if (b<6E4) a(b+1); }(0);" },
		symbolImplicitCoercion: { fails: "'use strict'; var a = Symbol('a'); a + '';" },
		functionNameInference: { passes: "'use strict'; var a = { b: function(){} }; if (a.name != 'b') throw 0;" },

		// APIs
		ObjectStatics: { is: "'use strict'; return ('getOwnPropertySymbols' in Object) && ('assign' in Object) && ('is' in Object);" },
		ArrayStatics: { is: "'use strict'; return ('from' in Array) && ('of' in Array);" },
		ArrayMethods: { is: "'use strict'; return ('fill' in Array.prototype) && ('find' in Array.prototype) && ('findIndex' in Array.prototype) && ('entries' in Array.prototype) && ('keys' in Array.prototype) && ('values' in Array.prototype);" },
		TypedArrays: { is: "'use strict'; return ('ArrayBuffer' in global) && ('Int8Array' in global) && ('Uint8Array' in global) && ('Int32Array' in global) && ('Float64Array' in global);" },
		TypedArrayStatics: { dependencies: ["TypedArrays"], is: "use strict'; return ('from' in Uint32Array) && ('of' in Uint32Array);" },
		TypedArrayMethods: { dependencies: ["TypedArrays"], is: "'use strict'; var x = new Int8Array(1); return ('slice' in x) && ('join' in x) && ('map' in x) && ('forEach' in x);" },
		StringMethods: { is: "'use strict'; return ('includes' in String.prototype) && ('repeat' in String.prototype);" },
		NumberStatics: { is: "'use strict'; return ('isNaN' in Number) && ('isInteger' in Number);" },
		MathStatics: { is: "'use strict'; return ('hypot' in Math) && ('acosh' in Math) && ('imul' in Math);" },
		collections: { is: "'use strict'; return ('Map' in global) && ('Set' in global) && ('WeakMap' in global) && ('WeakSet' in global);" },
		Proxy: { is: "'use strict'; return ('Proxy' in global);" },
		Promise: { is: "'use strict'; return ('Promise' in global);" }
	});

	function assign(target,source) {
		Object.keys(source).forEach(function eacher(key){
			target[key] = source[key];
		});
	}

	function tryPassFail(code) {
		try {
			runIt(code);
			return true;
		}
		catch (err) {
			return false;
		}
	}

	function tryReturn(code) {
		try {
			return runIt(code);
		}
		catch (err) {
			return false;
		}
	}

	function runTests(tests) {
		var res = {}, all_passed = true;

		// run the tests
		Object.keys(tests).forEach(function eacher(key){
			if (tests[key].passes) {
				res[key] = tryPassFail(tests[key].passes);
			}
			else if (tests[key].fails) {
				res[key] = !tryPassFail(tests[key].fails);
			}
			else if (tests[key].is) {
				res[key] = tryReturn(tests[key].is);
			}
			else if (tests[key].not) {
				res[key] = !tryReturn(tests[key].not);
			}
		});

		// re-run to check for dependency failures
		Object.keys(tests).forEach(function eacher(key){
			if (tests[key].dependencies) {
				// did any of the listed dependencies already fail?
				if (!tests[key].dependencies.reduce(
					function reducer(prev,curr){
						return prev && tests[curr];
					},
					true
				)) {
					res[key] = false;
				}
			}

			if (!res[key]) all_passed = false;
		});

		res.everything = all_passed;

		return res;
	}

	function setup(source,target) {

		function messageFrom(evt) {
			var msg = JSON.parse(evt.data),
				id = msg.id;

			target = target || evt.source;

			if (msg.req == "all") {
				assign(results,runTests(es6));
				msg.res = results;
				messageTo(JSON.stringify(msg));
			}
			else if (msg.req == "api") {
				msg.res = es6;
				messageTo(JSON.stringify(msg));
			}
		}

		function messageTo(data) {
			target.postMessage(data);
		}

		source.addEventListener("message",messageFrom,false);
	}

	function connect(evt) {
		var port = evt.ports[0];
		setup(port,port);
		port.start();
	}

	function start(evt) {
		if (evt.data === "start") {
			self.removeEventListener("message",start);
			setup(self,self);
		}
	}

	// node?
	if (typeof module != "undefined" && module.exports) {
		module.exports.setup = setup;
		module.exports.es6 = es6;
		module.exports.results = results;
	}
	// shared worker?
	else if ("onconnect" in self) {
		self.addEventListener("connect",connect);
	}
	// assume regular worker
	else if (typeof window === "undefined") {
		self.addEventListener("message",start);
	}
	else {
		return setup;
	}
})();
