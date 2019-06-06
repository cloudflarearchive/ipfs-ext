#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TITLE = __filename.split("/").pop();

describe(TITLE, function() {
  var Timestamp = require("../timestamp");

  var AROUND_EPOCH = {
    0: "",
    1: "+1 msec",
    1000: "+1 sec",
    60000: "+1 min",
    3600000: "+1 hour",
    86400000: "+1 day",
    "-1": "-1 msec",
    "-1000": "-1 sec",
    "-60000": "-1 min",
    "-3600000": "-1 hour",
    "-86400000": "-1 day"
  };

  var AFTER_EPOCH = {
    1970: "epoch +0 year",
    1971: "epoch +1 year",
    1999: "",
    2000: "",
    2038: "nearly 31bit time_t",
    2039: "",
    2106: "nearly 32bit time_t",
    2107: "",
    9999: "",
    10000: "",
    10001: "",
    99999: "",
    100000: "",
    100001: "",
    275760: "most future year"
  };

  var BEFORE_EPOCH = {
    1969: "epoch -1 year",
    1000: "",
    999: "",
    171: "",
    170: "",
    169: "",
    2: "AD2",
    1: "AD1",
    0: "BC1",
    "-1": "BC2",
    "-999": "",
    "-1000": "",
    "-9999": "",
    "-10000": "",
    "-10001": "",
    "-99999": "",
    "-100000": "",
    "-100001": "",
    "-271820": "most past year"
  };

  describe("around epoch", function() {
    Object.keys(AROUND_EPOCH).forEach(function(msec) {
      var dt = new Date(0);
      dt.setTime(msec);
      runTest(dt, "epoch " + AROUND_EPOCH[msec]);
    });
  });

  describe("after epoch", function() {
    var time = Date.UTC(1970, 0, 2, 3, 4, 5, 678);
    Object.keys(AFTER_EPOCH).forEach(function(year) {
      var dt = new Date(time);
      dt.setUTCFullYear(year);
      runTest(dt, AFTER_EPOCH[year]);
    });
  });

  describe("before epoch", function() {
    var time = Date.UTC(1970, 0, 2, 3, 4, 5, 678);
    Object.keys(BEFORE_EPOCH).forEach(function(year) {
      var dt = new Date(time);
      dt.setUTCFullYear(year);
      runTest(dt, BEFORE_EPOCH[year]);
    });
  });

  describe("far from epoch", function() {
    [100000000, -100000000].forEach(function(day) {
      [-1, 0, 1].forEach(function(msec) {
        if (day * msec === 100000000) return;
        var dt = new Date(0);
        dt.setTime(Date.UTC(1970, 0, 1 + day) + msec);
        var title = day + "th day from epoch";
        runTest(dt, msec ? "" : title);
      });
    });
  });

  function runTest(src, mess) {
    var json = src.toJSON();
    var year = src.getUTCFullYear();
    var title = json;
    var nano = ((src % 1000 + 1000) % 1000) * 1000 * 1000;
    if (mess) title += " // " + mess;

    it(title, function() {
      var ts = Timestamp.fromDate(src);
      assert.strictEqual(ts.toJSON(), json, "toJSON");
      assert.strictEqual(ts.getYear(), year, "getYear");
      assert.strictEqual(ts.getNano(), nano);

      var dt = ts.toDate();
      assert.strictEqual(dt.getUTCFullYear(), src.getUTCFullYear(), "getUTCFullYear");
      assert.strictEqual(dt.getUTCMonth(), src.getUTCMonth(), "getUTCMonth");
      assert.strictEqual(dt.getUTCDate(), src.getUTCDate(), "getUTCDate");
      assert.strictEqual(dt.getUTCDay(), src.getUTCDay(), "getUTCDay");
      assert.strictEqual(dt.getUTCHours(), src.getUTCHours(), "getUTCHours");
      assert.strictEqual(dt.getUTCMinutes(), src.getUTCMinutes(), "getUTCMinutes");
      assert.strictEqual(dt.getUTCSeconds(), src.getUTCSeconds(), "getUTCSeconds");

      // round trip
      var ts2 = Timestamp.fromString(json);
      assert.strictEqual(ts2.toJSON(), ts.toJSON(), "toJSON");
      assert.strictEqual(ts2.getYear(), ts.getYear(), "getYear");
      assert.strictEqual(ts2.getTimeT(), ts.getTimeT(), "getTimeT");
      assert.strictEqual(ts2.getNano(), ts.getNano(), "getNano");
    });
  }
});