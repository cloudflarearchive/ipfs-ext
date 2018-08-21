"use strict";

var util = require('util');
var through = require('through');
var path = require('path');

function strictify(file, opts) {
  opts = opts || {};
  opts.exclude = ['json'].concat(opts.exclude||[]);

  var stream = through(write, end);
  var applied = false;

  var filetype = path.extname(file).replace('.', '');
  var excluded = (opts.exclude).some(function (excludedExt) {
    return filetype == excludedExt.replace('.', '');
  });

  return stream;

  function write(buf) {
    if (!applied && !excluded) {
      stream.queue('"use strict";\n');
      applied = true;
    }
    stream.queue(buf);
  }

  function end() {
    stream.queue(null);
  }
}

module.exports = strictify;
