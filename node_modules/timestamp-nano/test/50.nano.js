#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TITLE = __filename.split("/").pop();

describe(TITLE, function() {
  var Timestamp = require("../timestamp");
  var DEC6 = 1000 * 1000;
  var DEC9 = 1000 * 1000 * 1000;

  var ADD_NANO = [
    Date.UTC(1969, 11, 31, 23, 59, 59, 999),
    Date.UTC(2017, 10, 25, 23, 59, 59, 999),
    Date.UTC(9999, 11, 31, 23, 59, 59, 999),
    Date.UTC(199999, 11, 31, 23, 59, 59, 999),
    Date.UTC(-19999, 11, 31, 23, 59, 59, 999),
    Date.UTC(-9999, 11, 31, 23, 59, 59, 999)
  ];

  var SUB_NANO = [
    Date.UTC(1970, 0, 1, 0, 0, 0, 1),
    Date.UTC(2017, 10, 26, 0, 0, 0, 1),
    Date.UTC(9999, 0, 1, 0, 0, 0, 1),
    Date.UTC(199999, 0, 1, 0, 0, 0, 1),
    Date.UTC(-199999, 0, 1, 0, 0, 0, 1),
    Date.UTC(-9999, 0, 1, 0, 0, 0, 1)
  ];

  var OFFSET = [0, 1, 100, 1000, 10000, 100000,
    DEC6, 10 * DEC6, 100 * DEC6, DEC9];

  describe("nano ascending", function() {
    ADD_NANO.forEach(function(msec) {
      runTest(msec, 1);
    });
  });

  describe("nano descending", function() {
    SUB_NANO.forEach(function(msec) {
      runTest(msec, -1);
    });
  });

  function runTest(msec, direction) {
    var dt0 = new Date();
    dt0.setTime(msec);
    var json = dt0.toJSON();

    it(json, function() {
      var ts = Timestamp.fromDate(dt0);
      var expSec = dt0.getUTCSeconds();
      var prev = (((msec % 1000) + 1000) % 1000) * DEC6;
      var nano = ts.getNano();
      assert.strictEqual(nano, prev, "getNano");

      OFFSET.forEach(function(offset) {
        offset *= direction;
        prev = nano;
        ts.addNano(offset);
        var dt1 = ts.toDate();
        var expNano = (prev + offset + DEC9) % DEC9;
        nano = ts.getNano();
        assert.strictEqual(nano, expNano, "getNano: " + offset);

        var next = prev + offset;
        if (next < 0 || DEC9 < next) {
          expSec = (expSec + direction + 60) % 60;
        }
        assert.strictEqual(dt1.getUTCSeconds(), expSec, "getUTCSeconds");
      });
    });
  }
});