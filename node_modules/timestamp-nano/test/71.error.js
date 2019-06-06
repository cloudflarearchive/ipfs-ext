#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TITLE = __filename.split("/").pop();

describe(TITLE, function() {
  var Timestamp = require("../timestamp");

  it("TypeError: fromTime()", function() {
    var error;
    try {
      Timestamp.fromTime();
    } catch (e) {
      error = e;
    }
    assert.ok(error instanceof TypeError);
  });

  it("TypeError: fromTime('')", function() {
    var error;
    try {
      Timestamp.fromTime('');
    } catch (e) {
      error = e;
    }
    assert.ok(error instanceof TypeError);
  });

  it("TypeError: fromInt64BE()", function() {
    var error;
    try {
      Timestamp.fromInt64BE();
    } catch (e) {
      error = e;
    }
    assert.ok(error instanceof TypeError);
  });

  it("TypeError: fromInt64LE({})", function() {
    var error;
    try {
      Timestamp.fromInt64LE({});
    } catch (e) {
      error = e;
    }
    assert.ok(error instanceof TypeError);
  });

  it("RangeError: fromInt64BE([])", function() {
    var error;
    try {
      Timestamp.fromInt64BE([]);
    } catch (e) {
      error = e;
    }
    assert.ok(error instanceof RangeError);
  });

  it("RangeError: fromInt64LE(...)", function() {
    var error;
    try {
      Timestamp.fromInt64LE(new Array(8), 8);
    } catch (e) {
      error = e;
    }
    assert.ok(error instanceof RangeError);
  });

  it("TypeError: writeInt64LE({})", function() {
    var error;
    try {
      new Timestamp().writeInt64LE({});
    } catch (e) {
      error = e;
    }
    assert.ok(error instanceof TypeError);
  });

  it("RangeError: writeInt64BE([])", function() {
    var error;
    try {
      new Timestamp().writeInt64BE([]);
    } catch (e) {
      error = e;
    }
    assert.ok(error instanceof RangeError);
  });

  it("RangeError: writeInt64LE(...)", function() {
    var error;
    try {
      new Timestamp().writeInt64LE(new Array(8), 8);
    } catch (e) {
      error = e;
    }
    assert.ok(error instanceof RangeError);
  });
});
