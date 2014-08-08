﻿var assert = require('assert');
var asyncBuilder = require('../asyncBuilder');
var awaitBuilder = require('../awaitBuilder');
var _ = require('../util');

/** TODO */
exports.mod = {
    name: 'callbacks',
    overrideProtocol: function (base, options) {
        return ({
            startup: function () {
                base.startup();
                require('../async').cps = exports.createAsyncBuilder();
                require('../await').cps = exports.createAwaitBuilder();
            },
            shutdown: function () {
                delete require('../async').cps;
                delete require('../await').cps;
                base.shutdown();
            }
        });
    },
    defaultOptions: {}
};


/** Provides an async builder for producing suspendable functions accept node-style callbacks. */
exports.createAsyncBuilder = function () {
    return asyncBuilder.mod({
        /** Used for diagnostic purposes. */
        name: 'cps',
        /** Used only for automatic type interence at TypeScript compile time. */
        type: null,
        /** Provides appropriate handling for callback-accepting suspendable functions. */
        overrideProtocol: function (base, options) {
            return ({
                /** Remembers the given callback and synchronously returns nothing. */
                begin: function (fi, callback) {
                    assert(_.isFunction(callback), 'Expected final argument to be a callback');
                    fi.context = callback;
                    fi.resume();
                },
                /** Invokes the callback with a result or an error, depending on whether the function returned or threw. */
                end: function (fi, error, value) {
                    if (error)
                        fi.context(error);
                    else
                        fi.context(null, value);
                }
            });
        }
    });
};

//TODO:...
exports.createAwaitBuilder = function () {
    var result = awaitBuilder.mod({
        name: 'cps',
        type: null,
        overrideHandlers: function (base, options) {
            return ({
                singular: function (fi, arg) {
                    if (arg !== void 0)
                        return _.notHandled;

                    if (fi.awaiting.length !== 1) {
                        // TODO: mismatch here - raise an error
                        fi.resume(null, new Error('222'));
                    }

                    fi.awaiting[0] = function (err, res) {
                        fi.awaiting = [];
                        fi.resume(err, res);
                    };
                },
                variadic: function (fi, args) {
                    if (args[0] !== void 0)
                        return _.notHandled;
                },
                elements: function (values, result) {
                    // TODO: temp testing...
                    var k = 0, fi = _.currentFiber();
                    values.forEach(function (value, i) {
                        if (i in values && values[i] === void 0) {
                            fi.awaiting[k++] = function (err, res) {
                                if (err)
                                    return result(err, null, i);
                                return result(null, res, i);
                            };
                        }
                    });
                    if (k !== fi.awaiting.length) {
                        // TODO: mismatch here - raise an error
                        result(new Error('111'));
                    }
                    return k;
                }
            });
        }
    });

    //TODO: is jointProtocol the right place for this?
    result.continuation = _.createContinuation;
    return result;
};
//# sourceMappingURL=callbacks.js.map
