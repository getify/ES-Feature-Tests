/*! es-feature-tests
    v0.3.0 (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/

(function UMD(name,context,definition){
	// special form of UMD for polyfilling across evironments
	context[name] = context[name] || definition(name,context);
	if (typeof define == "function" && define.amd) { define(function $AMD$(){ return context[name]; }); }
	else if (typeof module != "undefined" && module.exports) { module.exports = context[name]; }
})("Reflect.supports",(new Function("return this;"))(),function DEF(name,context){
	"use strict";

	function defineSendMsgFn(fn) {
		sendMsg = fn;
		while (send_queue.length > 0) {
			sendMsg(send_queue.shift());
		}
	}

	function messageFrom(evt) {
		var msg, now = Date.now();

		if (evt.origin === origin) {
			msg = JSON.parse(evt.data);

			if (
				use_local_cache &&
				msg.req == "all"
			) {
				try {
					localStorage.setItem(origin,JSON.stringify({
						expires: msg.expires || (now + expiration),
						version: version,
						results: msg.res
					}));
				}
				catch (err) {}
			}

			if (requests[msg.id]) {
				if (msg.req == "api") {
					requests[msg.id](msg.res);
				}
				else {
					requests[msg.id](msg.res,(msg.expires - expiration) || now);
				}
				requests[msg.id] = null;
			}
		}
	}

	function messageTo(data,cb) {
		var id;

		do { id = "x" + Math.random(); } while (requests[id]);
		requests[id] = cb;

		data = JSON.stringify({
			id: id,
			req: data
		});

		if (sendMsg) {
			sendMsg(data);
		}
		else {
			send_queue.push(data);
		}
	}

	function expireLocalCache() {
		if (local_storage_available) {
			localStorage.removeItem(origin);
		}
	}

	function supports(req,cb) {
		var tmp, now = Date.now();

		req = "all";
		cb = cb || function(){};

		if (!supports.disabled) {
			if (
				req == "all" &&
				use_local_cache &&
				(tmp = localStorage.getItem(origin))
			) {
				try {
					tmp = JSON.parse(tmp);
					tmp.expires = tmp.expires || (now + expiration);
					if (now < tmp.expires && tmp.version && tmp.version == version) {
						// send cached results
						setTimeout(function timer(){
							cb(tmp.results,(tmp.expires - expiration));
						},0);
						return;
					}
					else {
						expireLocalCache();
					}
				}
				catch (err) {}
			}

			initIframe();
			messageTo(req,cb);
		}
	}

	supports.disableLocalCache = function disableLocalCache() {
		use_local_cache = false;
		expireLocalCache();
	};

	supports.clearLocalSiteCache = expireLocalCache;

	supports.api = function api(req,cb) {
		req = "api";
		cb = cb || function(){};

		if (!supports.disabled) {
			initIframe();
			messageTo(req,cb);
		}
	};

	function initIframe() {
		if (!iframe && "postMessage" in context && "document" in context) {
			iframe = context.document.createElement("iframe");
			iframe.style.display = "none";
			iframe.src = origin + "/featuretests.html?cache=" + (use_local_cache ? "yes" : "no") + "&v=" + version;
			context.document.body.appendChild(iframe);
			listen_context = context;
			send_context = (iframe.contentWindow && iframe.contentWindow.postMessage) ?
				iframe.contentWindow :
				iframe;

			listen_context.addEventListener("message",messageFrom,false);
			iframe.addEventListener("load",function onload(){
				defineSendMsgFn(function sendMsg(data) {
					send_context.postMessage(data,origin);
				});
			},false);
		}
	}

	var public_api, sendMsg,
		listen_context, send_context,
		send_queue = [], receive_queue = [],
		use_local_cache, iframe,
		origin = "https://featuretests.io",
		version = 1030, requests = {},
		local_storage_available,
		expiration = 14 * 1000 * 60 * 60 * 24;

	// polyfill Date.now
	if (!Date.now) {
		Date.now = function DateNow() {
			return Number(new Date());
		};
	}

	// feature test for localStorage
	use_local_cache = local_storage_available = (function testLS(test) {
		try {
			localStorage.setItem(test, test);
			localStorage.removeItem(test);
			return true;
		}
		catch (err) {
			return false;
		}
	})("storage:featuretests.io");

	// use node require(..)?
	if (typeof module != "undefined" && module.exports) {
		listen_context = {
			addEventListener: function fakeAddEventListener(_,cb) {
				defineSendMsgFn(function sendMsg(data) {
					setTimeout(function timer(){
						cb({ data: data });
					},0);
				});
			}
		};
		send_context = {
			postMessage: function fakePostMessage(data) {
				setTimeout(function timer(){
					messageFrom({
						origin: origin,
						data: data
					});
				},0);
			}
		};

		require("./featuretests.js").setup(listen_context,send_context);
	}
	else if (!("postMessage" in context && "document" in context)) {
		supports.disabled = true;
	}

	return supports;
});
