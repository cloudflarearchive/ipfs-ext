#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TITLE = __filename.split("/").pop();

describe(TITLE, function() {
  var Timestamp = require("../timestamp");
  var DEC3 = 1000;
  var DEC8 = 100000000;
  var DEC9 = 1000000000;
  var DATE_MAX = DEC8 * 24 * 3600 * DEC3;

  var AD0000 = new Date(Date.UTC(0, 0, 1));
  AD0000.setUTCFullYear(0);
  AD0000 -= 0;

  var TESTS = [
    ["1970-01-01T00:00:00.000Z", 0, 0, 0],
    ["1970-01-01T00:00:00.000000001Z", 0, 1, 0],
    ["1970-01-01T00:00:00.111111111Z", 0, 111111111, 0],
    ["1970-01-01T00:00:00.222222222Z", 222, 222222, 0],
    ["1970-01-01T00:00:00.333Z", 333, 0, 0],
    ["1970-01-01T00:00:00.444Z", -111, 555000000, 0],
    ["1970-01-01T00:00:00.555555555Z", -111, 666555555, 0],
    ["1970-01-01T00:00:00.666Z", 777, -111000000, 0],

    ["1969-12-31T23:59:59.999Z", -1, 0, 0],
    ["1969-12-31T23:59:59.999999999Z", 0, -1, 0],
    ["1969-12-31T23:59:59.888888888Z", 0, 888888888 - DEC9, 0],
    ["1969-12-31T23:59:59.777Z", 777 - DEC3, 0, 0],
    ["1969-12-31T23:59:59.666666666Z", 666 - DEC3, 666666, 0],
    ["1969-12-31T23:59:59.555Z", 666 - DEC3, -111000000, 0],

    ["2370-01-01T00:00:00.000Z", 0, 0, 400],
    ["2770-01-01T00:00:00.001Z", 1, 0, 800],
    ["3170-01-01T00:00:00.000000001Z", 0, 1, 1200],
    ["3569-12-31T23:59:59.999Z", -1, 0, 1600],
    ["3969-12-31T23:59:59.999999999Z", 0, -1, 2000],

    ["1570-01-01T00:00:00.000Z", 0, 0, -400],
    ["1170-01-01T00:00:00.001Z", 1, 0, -800],
    ["1169-12-31T23:59:59.999Z", -1, 0, -800],
    ["0770-01-01T00:00:00.000000001Z", 0, 1, -1200],
    ["0369-12-31T23:59:59.999999999Z", 0, -1, -1600],

    ["+275760-09-13T00:00:00.000Z", DATE_MAX, 0, 0],
    ["+275760-09-12T23:59:59.999999999Z", DATE_MAX, -1, 0],
    ["+275760-09-12T23:59:59.999Z", DATE_MAX - 1, 0, 0],
    ["+275760-09-12T23:59:59.888888888Z", DATE_MAX - 112, 888888, 0],

    ["-271821-04-20T00:00:00.000Z", -DATE_MAX, 0, 0],
    ["-271821-04-20T00:00:00.000000001Z", -DATE_MAX, 1, 0],
    ["-271821-04-20T00:00:00.001Z", -DATE_MAX + 1, 0, 0],
    ["-271821-04-20T00:00:00.222222222Z", -DATE_MAX + 222, 222222, 0],

    // Create Timestamp instance with time outside of Date range.
    // Both DATE_MAX+1 and -DATE_MAX-1 are incorrect time for Date.
    ["+275760-09-13T00:00:00.001000001Z", DATE_MAX + 1, 1, 0],
    ["+275760-09-13T00:00:00.001Z", DATE_MAX + 1, 0, 0],
    ["+275760-09-13T00:00:00.000000001Z", DATE_MAX, 1, 0],
    ["-271821-04-19T23:59:59.999999999Z", -DATE_MAX, -1, 0],
    ["-271821-04-19T23:59:59.999Z", -DATE_MAX - 1, 0, 0],
    ["-271821-04-19T23:59:59.998999999Z", -DATE_MAX - 1, -1, 0],

    ["0000-01-01T00:00:00.000Z", AD0000],
    ["-000001-12-31T23:59:59.999Z", AD0000 - 1],

    ["+010000-01-01T00:00:00.001Z", AD0000 + 1, 0, 10000],
    ["+100000-01-01T00:00:00.002Z", AD0000 + 2, 0, 100000],
    ["+1000000-01-01T00:00:00.003Z", AD0000 + 3, 0, 1000000],
    ["+10000000-01-01T00:00:00.004Z", AD0000 + 4, 0, 10000000],
    ["+100000000-01-01T00:00:00.005Z", AD0000 + 5, 0, 100000000],
    ["+1000000000-01-01T00:00:00.006Z", AD0000 + 6, 0, 1000000000],
    ["+10000000000-01-01T00:00:00.007Z", AD0000 + 7, 0, 10000000000],
    ["+100000000000-01-01T00:00:00.008Z", AD0000 + 8, 0, 100000000000],

    ["+200000000000-01-01T00:00:00.009Z", AD0000 + 9, 0, 200000000000],
    ["+292200000000-01-01T00:00:00.010Z", AD0000 + 10, 0, 292200000000],

    ["-010001-12-31T23:59:59.999Z", AD0000 - 1, 0, -10000],
    ["-100001-12-31T23:59:59.998Z", AD0000 - 2, 0, -100000],
    ["-1000001-12-31T23:59:59.997Z", AD0000 - 3, 0, -1000000],
    ["-10000001-12-31T23:59:59.996Z", AD0000 - 4, 0, -10000000],
    ["-100000001-12-31T23:59:59.995Z", AD0000 - 5, 0, -100000000],
    ["-1000000001-12-31T23:59:59.994Z", AD0000 - 6, 0, -1000000000],
    ["-10000000001-12-31T23:59:59.993Z", AD0000 - 7, 0, -10000000000],
    ["-100000000001-12-31T23:59:59.992Z", AD0000 - 8, 0, -100000000000],

    ["-200000000001-12-31T23:59:59.991Z", AD0000 - 9, 0, -200000000000],
    ["-292200000001-12-31T23:59:59.990Z", AD0000 - 10, 0, -292200000000]
  ];

  TESTS.forEach(function(test) {
    var json = test[0];

    it(json, function() {
      var ts = new Timestamp(test[1], test[2], test[3]);

      var year = ts.getYear();
      var nano = ts.getNano();

      assert.strictEqual(ts.toJSON(), json, "toJSON");

      var bigBE = ts.writeInt64BE();

      ts = Timestamp.fromInt64BE(bigBE).addNano(ts.getNano());
      assert.strictEqual(ts.getYear(), year, "fromInt64BE: getYear");
      assert.strictEqual(ts.getNano(), nano, "fromInt64BE: getNano");
      assert.strictEqual(ts.toJSON(), json, "fromInt64BE: toJSON");

      ts = Timestamp.fromString(json);
      assert.strictEqual(ts.getNano(), nano, "fromString: getNano");
      assert.strictEqual(ts.toJSON(), json, "fromString: toJSON");
      assert.strictEqual(ts.getYear(), year, "fromString: getYear");

      var bigLE = ts.writeInt64LE();
      ts = Timestamp.fromInt64LE(bigLE).addNano(ts.getNano());
      assert.strictEqual(ts.toJSON(), json, "fromInt64LE: toJSON");
      assert.strictEqual(ts.getYear(), year, "fromInt64LE: getYear");
      assert.strictEqual(ts.getNano(), nano, "fromInt64LE: getNano");
      assert.strictEqual(join(bigLE), join(bigBE.reverse()));
    });
  });

  function hex(v) {
    return (v > 15 ? "" : "0") + Math.floor(+v | 0).toString(16);
  }

  function join(array) {
    return array.map(hex).join("-").toUpperCase();
  }
});