"use strict";
const fs = require("fs");
const path = require("path");

const corePath = path.join(__dirname, "..", "node_modules", "@sentry", "core", "build", "cjs");
const instrumentPath = path.join(corePath, "instrument");

if (!fs.existsSync(corePath)) return;
if (fs.existsSync(instrumentPath)) return;

fs.mkdirSync(instrumentPath, { recursive: true });

const handlersStandaloneJs = `"use strict";
const debugBuild = require('../debug-build.js');
const debugLogger = require('../utils/debug-logger.js');
const handlers = {};
const instrumented = {};
function addHandler(type, handler) {
  handlers[type] = handlers[type] || [];
  handlers[type].push(handler);
}
function resetInstrumentationHandlers() {
  Object.keys(handlers).forEach(function(k) { handlers[k] = undefined; });
}
function maybeInstrument(type, instrumentFn) {
  if (!instrumented[type]) {
    instrumented[type] = true;
    try { instrumentFn(); } catch (e) {
      if (debugBuild.DEBUG_BUILD) debugLogger.debug.log('Error while instrumenting ' + type, e);
    }
  }
}
function triggerHandlers(type, data) {
  const typeHandlers = type && handlers[type];
  if (!typeHandlers) return;
  for (let i = 0; i < typeHandlers.length; i++) {
    try { typeHandlers[i](data); } catch (e) {
      if (debugBuild.DEBUG_BUILD) debugLogger.debug.log('Error while triggering ' + type, e);
    }
  }
}
exports.addHandler = addHandler;
exports.maybeInstrument = maybeInstrument;
exports.resetInstrumentationHandlers = resetInstrumentationHandlers;
exports.triggerHandlers = triggerHandlers;
`;

const globalErrorStandaloneJs = `"use strict";
const worldwide = require('../utils/worldwide.js');
const handlers = require('./handlers.js');
let _oldOnErrorHandler = null;
function addGlobalErrorInstrumentationHandler(handler) {
  handlers.addHandler('error', handler);
  handlers.maybeInstrument('error', instrumentError);
}
function instrumentError() {
  _oldOnErrorHandler = worldwide.GLOBAL_OBJ.onerror;
  worldwide.GLOBAL_OBJ.onerror = function(msg, url, line, column, error) {
    handlers.triggerHandlers('error', { column, error, line, msg, url });
    if (_oldOnErrorHandler) return _oldOnErrorHandler.apply(this, arguments);
    return false;
  };
  if (worldwide.GLOBAL_OBJ.onerror) worldwide.GLOBAL_OBJ.onerror.__SENTRY_INSTRUMENTED__ = true;
}
exports.addGlobalErrorInstrumentationHandler = addGlobalErrorInstrumentationHandler;
`;

const globalUnhandledRejectionStandaloneJs = `"use strict";
const worldwide = require('../utils/worldwide.js');
const handlers = require('./handlers.js');
let _oldOnUnhandledRejectionHandler = null;
function addGlobalUnhandledRejectionInstrumentationHandler(handler) {
  handlers.addHandler('unhandledrejection', handler);
  handlers.maybeInstrument('unhandledrejection', instrumentUnhandledRejection);
}
function instrumentUnhandledRejection() {
  _oldOnUnhandledRejectionHandler = worldwide.GLOBAL_OBJ.onunhandledrejection;
  worldwide.GLOBAL_OBJ.onunhandledrejection = function(e) {
    handlers.triggerHandlers('unhandledrejection', e);
    if (_oldOnUnhandledRejectionHandler) return _oldOnUnhandledRejectionHandler.apply(this, arguments);
    return true;
  };
  if (worldwide.GLOBAL_OBJ.onunhandledrejection) worldwide.GLOBAL_OBJ.onunhandledrejection.__SENTRY_INSTRUMENTED__ = true;
}
exports.addGlobalUnhandledRejectionInstrumentationHandler = addGlobalUnhandledRejectionInstrumentationHandler;
`;

const consoleJs = `"use strict";
const handlers = require('./handlers.js');
function addConsoleInstrumentationHandler(handler) {
  handlers.addHandler('console', handler);
  handlers.maybeInstrument('console', function() {});
}
exports.addConsoleInstrumentationHandler = addConsoleInstrumentationHandler;
`;

const fetchJs = `"use strict";
const handlers = require('./handlers.js');
function addFetchInstrumentationHandler(handler) {
  handlers.addHandler('fetch', handler);
  handlers.maybeInstrument('fetch', function() {});
}
exports.addFetchInstrumentationHandler = addFetchInstrumentationHandler;
`;

const files = [
  ["handlers.js", handlersStandaloneJs],
  ["globalError.js", globalErrorStandaloneJs],
  ["globalUnhandledRejection.js", globalUnhandledRejectionStandaloneJs],
  ["console.js", consoleJs],
  ["fetch.js", fetchJs],
];

for (const [name, content] of files) {
  fs.writeFileSync(path.join(instrumentPath, name), content, "utf8");
}

console.log("[patch-sentry-cjs] Created missing @sentry/core build/cjs/instrument/*.js");
