#!/usr/bin/env mocha -R spec

var assert = require("assert");

var TITLE = __filename.split("/").pop();

describe(TITLE, function() {
  var Timestamp = require("../timestamp");

  var TZ = {
    UTC: "Z",
    GMT: "+00:00",
    PST: "-08:00",
    JST: "+09:00",
    NST: "-03:30",
    IST: "+05:30"
  };

  var TIME = [
    // epoch
    "1970-01-01T00:00:00.001Z",
    "1969-12-31T23:59:59.999Z",

    // leap year
    "2020-02-28T23:59:59.999Z",
    "2020-02-29T00:00:00.001Z",

    // BC1
    "0000-01-01T00:00:00.001Z",

    // far future
    "+099999-12-31T23:59:59.999Z",
    "+100000-01-01T00:00:00.001Z"
  ];

  var hasDateBug = checkDateBug();

  Object.keys(TZ).forEach(function(name) {
    var tz = TZ[name];
    var title = getJSON(TIME[0], tz) + " (" + name + ")";

    it(title, function() {
      TIME.forEach(function(time) {
        var json = getJSON(time, tz);
        var dt = new Date(json);
        test(json, +dt);

        var nocollon = json.replace(/:(\d+)$/, "$1");
        test(nocollon, +dt);
      });
    });
  });

  function test(str, dt) {
    var ts = Timestamp.fromString(str);
    var time = +ts.toDate();

    // ignore 1 millisecond difference on Safari
    if (hasDateBug && Math.abs(time - dt) === 1) return;

    assert.strictEqual(time, dt, str);
  }

  /**
   * Safari has a bug on parsing Date when both its time and timezone are negative value.
   */

  function checkDateBug() {
    var date = +new Date("1969-12-31T23:59:59.999-01:00");
    return date % 1000 !== 999;
  }

  function getJSON(time, tz) {
    return time.replace(/Z$/, tz);
  }
});