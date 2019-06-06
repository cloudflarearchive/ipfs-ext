#!/usr/bin/env mocha -R spec

var assert = require("assert");
var strftime = require("strftime");

var TITLE = __filename.split("/").pop();

describe(TITLE, function() {
  var Timestamp = require("../timestamp");
  strftime = strftime.localizeByIdentifier("en_US");

  describe("common strftime formats", function() {
    var FORMATS = {
      // ISO 8601 / W3C Date Time
      "%Y-%m-%dT%H:%M:%SZ": "2018-01-02T03:04:05Z",
      "%Y-%m-%dT%H:%M:%S.%LZ": "2018-01-02T03:04:05.006Z",
      "%Y-%m-%dT%H:%M:%S.%NZ": "2018-01-02T03:04:05.006000000Z",

      // SMTP
      "%a, %b %d %X %Y %z (%Z)": "Tue, Jan 02 03:04:05 2018 +0000 (GMT)",

      // Apache Log
      "%d/%b/%Y:%H:%M:%S %z": "02/Jan/2018:03:04:05 +0000"
    };

    Object.keys(FORMATS).forEach(function(format) {
      var utc = Date.UTC(2018, 0, 2, 3, 4, 5, 6);
      var ts = Timestamp.fromDate(utc);

      it(format, function() {
        assert.strictEqual(ts.toString(format), FORMATS[format], format);
      });
    });
  });

  describe("month day name", function() {
    // month name
    it("%b", function() {
      for (var i = 1; i <= 12; i++) {
        var dt = new Date(2020, i - 1, i);
        var utc = Date.UTC(2020, i - 1, i);
        var ts = Timestamp.fromDate(utc);
        var fmt = "%b";
        var str = strftime(fmt, dt);
        assert.strictEqual(ts.toString(fmt), str, fmt);
      }
    });

    // day name
    it("%a", function() {
      for (var i = 1; i <= 7; i++) {
        var dt = new Date(2020, 0, i);
        var utc = Date.UTC(2020, 0, i);
        var ts = Timestamp.fromDate(utc);
        var fmt = "%a";
        var str = strftime(fmt, dt);
        assert.strictEqual(ts.toString(fmt), str, fmt);
      }
    });
  });

  describe("strftime compatibility", function() {
    var YEARS = [2017, 2018, 2019, 2020];
    var MONTHS = [1, 12];
    var DAYS = [1, 31];
    var HOURS = [0, 12, 23];
    var MINUTES = [0, 59];
    var SECONDS = [0, 59];

    // not all patterns supported at Timestamp#toString
    var PATTERNS = [
      "%Y-%m-%dT%H:%M:%S",
      // "%a %b %d %X %Y %Z",
      "%%", // A literal '%' character.
      // "%+", // The date and time in date(1) format.
      "%a", // The abbreviated name of the day of the week according to the current locale.
      // "%A", // The full name of the day of the week according to the current locale.
      "%b", // The abbreviated month name according to the current locale.
      // "%B", // The full month name according to the current locale.
      // "%C", // The century number (year/100) as a 2-digit integer.
      // "%c", // The preferred date and time representation for the current locale.
      // "%D", // Equivalent to %m/%d/%y.
      "%d", // The day of the month as a decimal number (range 01 to 31).
      // "%E", // Modifier: use alternative format.
      "%e", // Like %d, the day of the month as a decimal number, but a leading zero is replaced by a space.
      "%F", // Equivalent to %Y-%m-%d (the ISO 8601 date format). (C99)
      // "%g", // Like %G, but without century, that is, with a 2-digit year (00–99).
      // "%G", // The ISO 8601 week-based year (see NOTES) with century as a decimal number. The 4-digit year corresponding to the ISO week number (see %V). This has the same format and value as %Y, except that if the ISO week number belongs to the previous or next year, that year is used instead.
      "%H", // The hour as a decimal number using a 24-hour clock (range 00 to 23).
      // "%h", // Equivalent to %b.
      // "%I", // The hour as a decimal number using a 12-hour clock (range 01 to 12).
      // "%j", // The day of the year as a decimal number (range 001 to 366).
      // "%k", // The hour (24-hour clock) as a decimal number (range 0 to 23); single digits are preceded by a blank. (See also %H.)
      // "%l", // The hour (12-hour clock) as a decimal number (range 1 to 12); single digits are preceded by a blank. (See also %I.)
      "%L", // the milliseconds, padded to 3 digits
      "%M", // The minute as a decimal number (range 00 to 59).
      "%m", // The month as a decimal number (range 01 to 12).
      "%n", // A newline character.
      // "%O", // Modifier: use alternative format.
      // "%p", // Either "AM" or "PM" according to the given time value, or the corresponding strings for the current locale. Noon is treated as "PM" and midnight as "AM".
      // "%P", // Like %p but in lowercase: "am" or "pm" or a corresponding string for the current locale.
      "%R", // The time in 24-hour notation (%H:%M). For a version including the seconds, see %T below.
      // "%r", // The time in a.m. or p.m. notation. In the POSIX locale this is equivalent to %I:%M:%S %p.
      // "%s", // The number of seconds since the Epoch, 1970-01-01 00:00:00 +0000 (UTC).
      "%S", // The second as a decimal number (range 00 to 60). (The range is up to 60 to allow for occasional leap seconds.)
      "%T", // The time in 24-hour notation (%H:%M:%S).
      "%t", // A tab character.
      // "%u", // The day of the week as a decimal, range 1 to 7, Monday being 1. See also %w.
      // "%U", // The week number of the current year as a decimal number, range 00 to 53, starting with the first Sunday as the first day of week 01. See also %V and %W.
      // "%V", // The ISO 8601 week number (see NOTES) of the current year as a decimal number, range 01 to 53, where week 1 is the first week that has at least 4 days in the new year. See also %U and %W.
      // "%w", // The day of the week as a decimal, range 0 to 6, Sunday being 0. See also %u.
      // "%W", // The week number of the current year as a decimal number, range 00 to 53, starting with the first Monday as the first day of week 01.
      // "%x", // The preferred date representation for the current locale without the time.
      // "%X", // The preferred time representation for the current locale without the date.
      "%Y", // The year as a decimal number including the century.
      // "%y", // The year as a decimal number without a century (range 00 to 99).
      // "%Z", // The timezone name or abbreviation.
      // "%z", // The +hhmm or -hhmm numeric timezone (that is, the hour and minute offset from UTC).
      null];

    YEARS.forEach(function(year) {
      it("" + year, function() {
        // this may take longer seconds at some environment
        this.timeout(10000);

        var cnt = 0;
        MONTHS.forEach(function(month) {
          DAYS.forEach(function(day) {
            HOURS.forEach(function(hour) {
              MINUTES.forEach(function(minute) {
                SECONDS.forEach(function(second) {
                  var dt = new Date(year, month - 1, day, hour, minute, second);
                  var utc = Date.UTC(year, month - 1, day, hour, minute, second);
                  var ts = new Timestamp(utc);
                  PATTERNS.forEach(function(fmt) {
                    if (!fmt) return;
                    assert.strictEqual(ts.toString(fmt), strftime(fmt, dt), fmt);
                    cnt++;
                  });
                });
              });
            });
          });
        });
        assert.ok(cnt);
      });
    });
  });

  describe("invalid specifier", function() {
    var ts = new Timestamp();
    it("% ", function() {
      assert.strictEqual(ts.toString("% "), "% ");
    });
    it("%\\n", function() {
      assert.strictEqual(ts.toString("%\n"), "%\n");
    });
  });
});
