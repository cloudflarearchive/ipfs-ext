#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TITLE = __filename.split("/").pop();

describe(TITLE, function() {
  var Timestamp, ts;

  it("require", function() {
    Timestamp = require("../timestamp");
  });

  it("constructor", function() {
    // constructor
    assert.strictEqual(typeof Timestamp, "function");

    // static methods
    assert.strictEqual(typeof Timestamp.fromDate, "function");
    assert.strictEqual(typeof Timestamp.fromInt64BE, "function");
    assert.strictEqual(typeof Timestamp.fromInt64LE, "function");
    assert.strictEqual(typeof Timestamp.fromString, "function");
    assert.strictEqual(typeof Timestamp.fromTimeT, "function");

    // call constructor with new
    ts = new Timestamp();
    assert.ok(ts instanceof Timestamp);

    // call constructor without new
    ts = Timestamp();
    assert.ok(ts instanceof Timestamp);
  });

  it("methods", function() {
    // instance methods
    assert.strictEqual(typeof ts.addNano, "function");
    assert.strictEqual(typeof ts.getNano, "function");
    assert.strictEqual(typeof ts.getTimeT, "function");
    assert.strictEqual(typeof ts.getYear, "function");
    assert.strictEqual(typeof ts.toDate, "function");
    assert.strictEqual(typeof ts.toJSON, "function");
    assert.strictEqual(typeof ts.toString, "function");
    assert.strictEqual(typeof ts.writeInt64BE, "function");
    assert.strictEqual(typeof ts.writeInt64LE, "function");

    // return value type
    assert.strictEqual(typeof ts.addNano(0), "object");
    assert.strictEqual(typeof ts.getNano(), "number");
    assert.strictEqual(typeof ts.getTimeT(), "number");
    assert.strictEqual(typeof ts.getYear(), "number");
    assert.strictEqual(typeof ts.toDate(), "object");
    assert.strictEqual(typeof ts.toJSON(), "string");
    assert.strictEqual(typeof ts.toString(), "string");
    assert.strictEqual(typeof ts.writeInt64BE(), "object");
    assert.strictEqual(typeof ts.writeInt64LE(), "object");

    assert.ok(ts.addNano(0) instanceof Timestamp);
    assert.ok(ts.toDate() instanceof Date);
  });
});