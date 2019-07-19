const { src, dest } = require('gulp');
const browserify = require('gulp-browserify');
const minify = require('gulp-minify');

exports.default = function() {
  return src('lib/schedulator.js')
    .pipe(browserify({
      insertGlobals : true,
      debug : true
    }))
    .pipe(minify())
    .pipe(dest('dist'));
}