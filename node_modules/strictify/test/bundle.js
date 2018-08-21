"use strict";
var test = require('tap').test;
var browserify = require('browserify');

function bundle(file, opts, done) {
    var b = browserify();
    b.add(__dirname + file);
    b.transform(opts||{}, __dirname + '/..');
    b.bundle(done);
}

function hasUseStrict(src) {
    return src.match(/"use strict";/);
}

test("bundle transform applied to js", function (t) {
    t.plan(1);
    bundle('/../example/neat-module.js', {}, function (err, src) {
        if (err) t.fail(err);
        t.ok(hasUseStrict(src), "has strict mode statement");
    });
});

test("by default transform doesn't apply to json", function (t) {
    t.plan(1);
    bundle('/../example/stuff.json', {}, function (err, src) {
        if (err) t.fail(err);
        t.ok(!hasUseStrict(src), "doesn't have strict mode statement");
    });
});

test("transform respects 'exclude' opt", function (t) {
    t.plan(2);
    bundle('/../example/neat-module.jsx', {}, function (err, src) {
        if (err) t.fail(err);
        t.ok(hasUseStrict(src), "has strict mode statement");
    });
    bundle('/../example/neat-module.jsx', {exclude:['jsx']}, function (err, src) {
        if (err) t.fail(err);
        t.ok(!hasUseStrict(src), "doesn't have strict mode statement");
    });
});
