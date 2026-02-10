var gulp = require('gulp');
var sass = require('gulp-sass');
var rename = require('gulp-rename');
var watcher = require('gulp-watch');
var changed = require('gulp-changed');

var postcss = require('gulp-postcss');
var pxtorem = require('postcss-pxtransform');

gulp.task(
  'default',
  gulp.series(function () {
    watcher(['./**/*.scss', '!node_modules/**/*.scss', '!miniprogram_npm/**/*.scss'], function () {
      miniSass();
    });
  })
);

//手动编译
gulp.task('sass', function (done) {
  miniSass();
  done();
});

function miniSass() {
  return gulp
    .src(['./**/*.scss', '!node_modules/**/*.scss', '!miniprogram_npm/**/*.scss']) //需要编译的文件
    .pipe(
      sass({
        outputStyle: 'expanded', //展开输出方式 expanded
        // 嵌套输出方式 nested
        // 展开输出方式 expanded
        // 紧凑输出方式 compact
        // 压缩输出方式 compressed
      })
    )
    .pipe(
      postcss([
        pxtorem({
          platform: 'weapp', //weapp 或 h5 或 rn
          designWidth: 750, //640 或 750 或 828
          minPixelValue: 2,
        }),
      ])
    )
    .pipe(
      rename((path) => {
        path.extname = '.wxss';
      })
    )
    .pipe(changed('./')) //只编译改动的文件

    .pipe(gulp.dest('./')) //编译
    .pipe(
      rename((path) => {
        console.log('编译完成文件：' + '\\' + path.dirname + '\\' + path.basename + '.scss');
      })
    );
}
