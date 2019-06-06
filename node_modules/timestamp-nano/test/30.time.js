#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TITLE = __filename.split("/").pop();

describe(TITLE, function() {
  var Timestamp = require("../timestamp");
  var DAY = 24 * 3600; // seconds per 1 day

  var SECONDS = [
    0,
    1,
    60,
    3600,
    DAY,
    31 * DAY // 1 month
  ];

  describe("timeT after epoch", function() {
    SECONDS.forEach(function(sec) {
      runTest(sec, 0);
    });

    for (var r = 28; r <= 32; r++) {
      var c = Math.pow(2, r);
      runTest(c - 1, 0);
      runTest(c, 0);
      runTest(c + 1, 0);
    }
  });

  describe("timeT before epoch", function() {
    SECONDS.forEach(function(sec) {
      if (!sec) return;
      runTest(-sec, 0);
    });

    for (var r = 28; r <= 31; r++) {
      var c = -Math.pow(2, r);
      runTest(c + 1, 0);
      runTest(c, 0);
      runTest(c - 1, 0);
    }
  });

  function runTest(time) {
    var title = pad8(time);

    var src = new Date(0);
    src.setTime(time * 1000);
    var year = src.getUTCFullYear();
    var json = src.toJSON();
    var nano = ((src % 1000 + 1000) % 1000) * 1000 * 1000;
    title += " " + json;

    it(title, function() {
      var ts = Timestamp.fromTimeT(time);
      assert.strictEqual(ts.toJSON(), json, "toJSON");
      assert.strictEqual(ts.getYear(), year, "getYear");
      assert.strictEqual(ts.getTimeT(), time, "getTimeT");
      assert.strictEqual(ts.getNano(), nano);

      var dt = ts.toDate();
      assert.strictEqual(dt.getUTCFullYear(), src.getUTCFullYear(), "getUTCFullYear");
      assert.strictEqual(dt.getUTCMonth(), src.getUTCMonth(), "getUTCMonth");
      assert.strictEqual(dt.getUTCDate(), src.getUTCDate(), "getUTCDate");
      assert.strictEqual(dt.getUTCDay(), src.getUTCDay(), "getUTCDay");
      assert.strictEqual(dt.getUTCHours(), src.getUTCHours(), "getUTCHours");
      assert.strictEqual(dt.getUTCMinutes(), src.getUTCMinutes(), "getUTCMinutes");
      assert.strictEqual(dt.getUTCSeconds(), src.getUTCSeconds(), "getUTCSeconds");
      assert.strictEqual(dt.getUTCMilliseconds(), src.getUTCMilliseconds(), "getUTCMilliseconds");
    });
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
});