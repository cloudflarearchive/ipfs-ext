#!/usr/bin/env mocha -R spec

var assert = require("assert");
var Int64BE = require("int64-buffer").Int64BE;

var TITLE = __filename.split("/").pop();

describe(TITLE, function() {
  var Timestamp = require("../timestamp");
  var SEC_PER_YEAR = 24 * 3600 * (365 * 400 + 97) / 400; // second per average year

  describe("year", function() {
    var TESTS = {
      "1969": Int64BE(Date.UTC(1969, 0, 1) / 1000),
      "1970": Int64BE(Date.UTC(1970, 0, 1) / 1000),
      "1971": Int64BE(Date.UTC(1971, 0, 1) / 1000),
      "9999": Int64BE(Date.UTC(9999, 0, 1) / 1000),

      "-000001": Int64BE(Date.UTC(-1, 0, 1) / 1000),
      "0000": Int64BE(Date.UTC(-1, 11, 31) / 1000 + 24 * 3600),
      "-009999": Int64BE(Date.UTC(-9999, 0, 1) / 1000),
      "+010000": Int64BE(Date.UTC(10000, 0, 1) / 1000),
      "-010000": Int64BE(Date.UTC(-10000, 0, 1) / 1000),

      // the first & last day of Date
      "-271821": Int64BE(Date.UTC(1970, 0, 1 - 10000 * 10000) / 1000),
      "+275760": Int64BE(Date.UTC(1970, 0, 1 + 10000 * 10000) / 1000),

      // the first & last day of 32bit time_t
      "1901": Int64BE(-0x80000000),
      "2038": Int64BE(0x7FFFFFFF),
      "2106": Int64BE(0xFFFFFFFF),

      // the first & last day of 64bit time_t
      "-292277022657": Int64BE([128, 0, 0, 0, 0, 0, 0, 0]),
      "+292277026596": Int64BE([127, 255, 255, 255, 255, 255, 255, 255]),

      // other years
      "-99999998030": int64ForYear(-100000000000),
      "-9999998030": int64ForYear(-10000000000),
      "-999998030": int64ForYear(-1000000000),
      "-99998030": int64ForYear(-100000000),
      "-9998030": int64ForYear(-10000000),
      "-998030": int64ForYear(-1000000),
      "-098030": int64ForYear(-100000),
      "-008030": int64ForYear(-10000),
      "+011970": int64ForYear(10000),
      "+101970": int64ForYear(100000),
      "+1001970": int64ForYear(1000000),
      "+10001970": int64ForYear(10000000),
      "+100001970": int64ForYear(100000000),
      "+1000001970": int64ForYear(1000000000),
      "+10000001970": int64ForYear(10000000000),
      "+100000001970": int64ForYear(100000000000)
    };

    Object.keys(TESTS).sort(sorter).forEach(function(year) {
      var array = TESTS[year].toArray();
      var title = array.map(hex).join("-").toUpperCase() + " (" + year + ")";
      it(title, function() {
        // build from Int64BE array
        var ts = Timestamp.fromInt64BE(array);
        assert.strictEqual(ts.getYear(), +year, "getYear");
        assert.strictEqual(ts.toString("%Y"), year, "toString");

        // round trip for confirmation
        ts = Timestamp.fromString(ts.toString());
        assert.strictEqual(ts.getYear(), +year, "getYear");
        assert.strictEqual(ts.toString("%Y"), year, "toString");
      });
    });

    function hex(v) {
      return (v > 15 ? "" : "0") + v.toString(16);
    }

    function sorter(a, b) {
      return a - b;
    }

    function int64ForYear(year) {
      // add offset of half year to avoid less precision
      return Int64BE((+year + 0.5) * SEC_PER_YEAR);
    }
  });
});