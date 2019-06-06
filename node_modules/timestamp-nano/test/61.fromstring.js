#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TITLE = __filename.split("/").pop();

describe(TITLE, function() {
  var Timestamp = require("../timestamp");

  describe("https://www.w3.org/TR/NOTE-datetime", function() {
    // YYYY (eg 1997)
    test("1997", "1997-01-01T00:00:00.000Z");

    // YYYY-MM (eg 1997-07)
    test("1997-07", "1997-07-01T00:00:00.000Z");

    // YYYY-MM-DD (eg 1997-07-16)
    test("1997-07-16", "1997-07-16T00:00:00.000Z");

    // YYYY-MM-DDThh:mmTZD (eg 1997-07-16T19:20+01:00)
    test("1997-07-16T19:20+01:00", "1997-07-16T18:20:00.000Z");

    // YYYY-MM-DDThh:mm:ssTZD (eg 1997-07-16T19:20:30+01:00)
    test("1997-07-16T19:20:30+01:00", "1997-07-16T18:20:30.000Z");

    // YYYY-MM-DDThh:mm:ss.sTZD (eg 1997-07-16T19:20:30.45+01:00)
    test("1997-07-16T19:20:30.45+01:00", "1997-07-16T18:20:30.450Z");

    function test(src, exp) {
      it(src, function() {
        var ts = Timestamp.fromString(src);
        assert.strictEqual(ts.toJSON(), exp, src);
      });
    }
  });
});