#!/usr/bin/env mocha -R spec

var assert = require("assert");

var Int64BE = require("int64-buffer").Int64BE;

var TITLE = __filename.split("/").pop();

describe(TITLE, function() {
  var Timestamp = require("../timestamp");

  var BIT32 = 0x10000 * 0x10000;
  var DAY = 24 * 3600; // seconds per 1 day
  var YEAR400 = 365 * 400 + 97; // days per 400 years

  describe("Int64 after epoch", function() {
    for (var r = 0; r <= 31; r++) {
      var c = Math.pow(2, r);
      runTest(0xFFFFFFFF, c - 1);
      if (r < 31) {
        runTest(0, c);
        runTest(1, c);
      }
    }
  });

  describe("Int64 before epoch", function() {
    for (var r = 0; r <= 31; r++) {
      var c = -Math.pow(2, r);
      runTest(1, c);
      runTest(0, c);
      if (r < 31) {
        runTest(0xFFFFFFFF, c - 1);
      }
    }
  });

  function runTest(low, high) {
    var src, json;
    var time = (low + high * BIT32);

    var year = Math.floor(time / DAY / YEAR400 * 400 + 1970);
    var second = (((high % 3600) * BIT32 + low ) % 3600 + 3600) % 3600;
    var minute = Math.floor(second / 60);
    second = second % 60;

    if (high < 0) {
      high = BIT32 + high;
    }

    var title = pad8(high) + " " + pad8(low);

    // JavaScript Date class limits 100000000 days around epoch
    if (-270000 < year && year < 270000) {
      src = new Date(0);
      src.setTime(time * 1000);
      json = src.toJSON();
      title += " " + json;
    }

    title += " (" + year + " " + pad2(minute) + ":" + pad2(second) + ")";

    it(title, function() {
      var buf0 = new Array(8);
      Int64BE(buf0, 0, high, low);

      var ts1 = Timestamp.fromInt64BE(buf0);
      testIt(ts1);
      var buf1 = ts1.writeInt64BE();
      assert.strictEqual(join(buf1), join(buf0), "writeInt64BE");

      // round trip
      var ts2 = Timestamp.fromInt64LE(buf1.reverse());
      testIt(ts2);
      var buf2 = ts2.writeInt64LE().reverse();
      assert.strictEqual(join(buf2), join(buf0), "writeInt64LE");
    });

    function testIt(ts) {
      assert.strictEqual(ts.getYear(), year, "getYear");

      var dt = ts.toDate();

      // exact match until 100000000 days
      if (json) {
        assert.strictEqual(ts.toJSON(), json, "toJSON");
      }

      if (src) {
        assert.strictEqual(dt.getUTCMonth(), src.getUTCMonth(), "getUTCMonth");
        assert.strictEqual(dt.getUTCDate(), src.getUTCDate(), "getUTCDate");
        assert.strictEqual(dt.getUTCDay(), src.getUTCDay(), "getUTCDay");
        assert.strictEqual(dt.getUTCHours(), src.getUTCHours(), "getUTCHours");
        assert.strictEqual(dt.getUTCMinutes(), src.getUTCMinutes(), "getUTCMinutes");
        assert.strictEqual(dt.getUTCSeconds(), src.getUTCSeconds(), "getUTCSeconds");
        assert.strictEqual(dt.getUTCMilliseconds(), src.getUTCMilliseconds(), "getUTCMilliseconds");
      }

      assert.strictEqual(mod(dt.getUTCFullYear()), mod(year), "getUTCFullYear");
      assert.strictEqual(dt.getUTCMinutes(), minute, "getUTCMinutes");
      assert.strictEqual(dt.getUTCSeconds(), second, "getUTCSeconds");
      assert.strictEqual(dt.getUTCMilliseconds(), 0, "getUTCMilliseconds");
      assert.strictEqual(ts.getNano(), 0, "getNano");

      // allow minor error only caused by double precision
      var t = ts.getTimeT();
      if (Math.abs((t - time) / t) > 0.000001) {
        assert.strictEqual(t, time, "getTimeT");
      }
    }
  }

  function mod(y) {
    return ((y % 100) + 100) % 100;
  }

  function hex(v) {
    return (v > 15 ? "" : "0") + Math.floor(+v | 0).toString(16);
  }

  function pad2(v) {
    return (v > 9 ? "" : "0") + (v | 0);
  }

  function pad8(v) {
    var s = "";
    if (v < 0) {
      s = "-";
      v = -v;
    }
    v = v.toString(16);
    if (v.length < 8) {
      v = ("000000000" + v).substr(-8);
    }
    return s + v;
  }

  function join(array) {
    return array.map(hex).join("-");
  }
});