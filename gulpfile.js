"use strict";

var browserify = require("browserify");
var gulp = require("gulp");
const { parallel } = require("gulp");
var source = require("vinyl-source-stream");
var buffer = require("vinyl-buffer");
var uglify = require("gulp-uglify");

function javascript() {
  // set up the browserify instance on a task basis
  var b = browserify({
    entries: "lib/schedulator.js",
    debug: true,
  });

  return b
    .bundle()
    .pipe(source("schedulator.js"))
    .pipe(buffer())
    .pipe(gulp.dest("./dist"));
}

function min() {
  // set up the browserify instance on a task basis
  var b = browserify({
    entries: "lib/schedulator.js",
    debug: true,
  });

  return b
    .bundle()
    .pipe(source("schedulator-min.js"))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest("./dist"));
}

exports.build = parallel(javascript, min);
