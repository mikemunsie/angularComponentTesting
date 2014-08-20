var gulp = require('gulp');
var walk = require('walk');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var compass = require('gulp-compass');
var gulpif = require('gulp-if');
var shell = require('gulp-shell');
var gulpUtil = require('gulp-util');
var browserSync = require('browser-sync');
var path =  require('path');
var minifyCSS = require('gulp-minify-css');
var spawn = require('child_process').spawn;
var node;

var config = {
  concat: {
    files: "./app/public/**/*",
    dest: "./app/public/packages/",
    prefix: "package-",
    packages: {
    }
  },
  browserSync: {
    files: [
      "./app/public/**/*",
      "./app/views/**/*"
    ],
    browsers: ['google chrome'],
    proxy: 'http://localhost:9000'
  },
  compass: {
    files: "./app/sass/**/*.sass",
    bundle_exec: true,
    style: "compressed",
    css: "./app/public/stylesheets",
    sass: "./app/sass",
    img: "./app/public/images",
    project: path.join(__dirname),
    relative: true,
    comments: false
  },
  compassComponents: {
    files: "./app/public/components/**/*.sass",
    bundle_exec: true,
    style: "compressed",
    css: "./app/public/components",
    sass: "./app/public/components",
    img: "./app/public/images",
    project: path.join(__dirname),
    relative: true,
    comments: false
  },
  uglify: {
    files: [
      "./app/public/**/*.js", 
      "!./app/public/javascripts-min/**/*",
      "!./app/public/vendor/**/*"
    ],
    dest: "./app/public/javascripts-min",
    mangle: false
  }
};

// Keep track of dev environment
var devEnvironment = false;

/**
 * Browser Sync Settings
 */
gulp.task('browserSync', function() {
  browserSync.init([], config.browserSync);
})

/**
 * Start and stop server
 */
gulp.task('server', function() {
  if (node) node.kill()
  node = spawn('node', ['app/bin/www'], {stdio: 'inherit'});
  setTimeout(function(){
    browserSync.reload();
  }, 1000);
})

/**
 * Compass Tasks
 */
gulp.task('compass', function(){
  return gulp.src(config.compass.files)
    .pipe(compass(config.compass));
});

/**
 * Compass Components Tasks
 */
gulp.task('compassComponents', function(){
  return gulp.src(config.compassComponents.files)
    .pipe(compass(config.compassComponents))
    .pipe(concat('components.css'))
    .pipe(minifyCSS({keepBreaks:true}))
    .pipe(gulp.dest(config.compass.css));
});

/**
 * Uglify Task
 */
gulp.task('uglify', [], function(){
  return gulp.src(config.uglify.files)
    .pipe(gulpif(!devEnvironment, uglify({
      mangle: config.uglify.mangle
    })))
    .pipe(gulp.dest(config.uglify.dest));
});

/**
 * Concat all components into one single file
 */
gulp.task('concatAllComponents', [], function(){
  var files = [];
  walk.walkSync("./app/public/components", {
    listeners: {
      names: function (root, nodeNamesArray) {
        nodeNamesArray.sort(function (a, b) {
          if (a > b) return -1;
          if (a < b) return 1;
          return 0;
        });
      }
    , directories: function (root, dirStatsArray, next) {
        next();
      }
    , file: function (root, stat, next) {
        if(stat.name.indexOf(".js") < 0) return next();
        files.push(root + '/' + stat.name);
      }
    , errors: function (root, nodeStatsArray, next) {
        next();
      }
    }
  });
  gulp.src(files)
    .pipe(concat('components-all.js'))
    .pipe(gulpif(!devEnvironment, uglify({
      mangle: false
    })))
    .pipe(gulp.dest('./app/public/javascripts-min/components/'));
});

/**
 * Concat Packages (these should be minified files, let Uglify finish first)
 */
gulp.task('concatPackages', ["uglify"], function(){
  var fileName = "";
  Object.keys(config.concat.packages).forEach(function(key) {
    fileName = config.concat.prefix + key + ".js";
    gulp.src(config.concat.packages[key])
      .pipe(concat(fileName))
      .pipe(gulp.dest(config.concat.dest));
  });
});

/**
 * Watch for file changes
 */
gulp.task('watch', function() {
  gulp.watch([
    "./app/public/**/*", 
    "!./app/public/vendor/**/*",
    "!./app/public/javascripts-min/**/*"
  ], ['uglify', 'concatAllComponents', 'concatPackages']);
  gulp.watch(config.compass.files, ['compass']);
  gulp.watch(config.compassComponents.files, ['compassComponents']);
  gulp.watch([
    "./app/views/**/*",
    "./app/routes/**/*"
  ], ['server']);
});

/**
 * Setup development environment
 */
gulp.task('setupDevEnvironment', function() {
  devEnvironment = true;
});

/**
 * Default (Production ready)
 */
gulp.task('default', [
  'uglify', 
  'concatAllComponents', 
  'concatPackages', 
  'compass', 
  'compassComponents'
]);

/**
 * Development task will watch files, automatically refresh, and more
 */
gulp.task('dev', [
  'setupDevEnvironment', 
  'server', 
  'browserSync', 
  'uglify', 
  'concatAllComponents', 
  'concatPackages', 
  'compass', 
  'compassComponents', 
  'watch'
]);