var gulp =        require('gulp'),
    walk =        require('walk'),
    concat =      require('gulp-concat'),
    uglify =      require('gulp-uglify'),
    compass =     require('gulp-compass'),
    gulpif =      require('gulp-if'),
    shell =       require('gulp-shell'),
    gulpUtil =    require('gulp-util'),
    browserSync = require('browser-sync'),
    path =        require('path'),
    minifyCSS =   require('gulp-minify-css'),
    spawn =       require('child_process').spawn,
    ngHtml2Js  =  require('gulp-ng-html2js'),
    minifyHtml =  require('gulp-minify-html'),
    node;

var devEnvironment = false;
  
/**
 * Browser Sync Settings
 */
gulp.task('browserSync', function() {
  browserSync.init([], {
    "files": [
      "./app/public/**/*",
      "./app/public/views/**/*"
    ],
    "browsers": ['google chrome'],
    "proxy": "http://localhost:9000"
  });
});

/**
 * Merge angular views into one compressed JS file
 */
gulp.task("combineAngularViewsAndComponentsHTMLToJS", [
  "angularComponentsHTMLToJS",
  "angularViewsHTMLToJS"
], function(){
  return gulp.src([
    "./app/public/javascripts-min/components-views-htmlToJS/components.js",
    "./app/public/javascripts-min/components-views-htmlToJS/views.js"
  ])
  .pipe(concat("all.js"))
  .pipe(gulpif(devEnvironment, uglify({
    mangle: false
  })))
  .pipe(gulp.dest("./app/public/javascripts-min/components-views-htmlToJS"));
});

/**
 * Convert all angular components into JS file
 */
gulp.task('angularComponentsHTMLToJS', function(){
  return gulp.src([
    "./app/public/components/**/*.html"
  ])
  .pipe(minifyHtml({
    empty: true,
    spare: true,
    quotes: true
  }))
  .pipe(ngHtml2Js({
    moduleName: "componentsAndViewsHTMLToJS",
    prefix: "/public/components/"
  }))
  .pipe(concat("components.js"))
  .pipe(gulp.dest("./app/public/javascripts-min/components-views-htmlToJS/"));
});

/**
 * Convert all angular views into JS file
 */
gulp.task("angularViewsHTMLToJS", function(){
  return gulp.src([
    "./app/public/views/**/*.html"
  ])
  .pipe(minifyHtml({
    empty: true,
    spare: true,
    quotes: true
  }))
  .pipe(ngHtml2Js({
    moduleName: "componentsAndViewsHTMLToJS",
    prefix: "/public/views/"
  }))
  .pipe(concat("views.js"))
  .pipe(gulp.dest("./app/public/javascripts-min/components-views-htmlToJS"));
});

/**
 * Start and stop server
 */
gulp.task('server', function() {
  if (node) node.kill();
  node = spawn('node', ['app/bin/www'], {stdio: 'inherit'});
  setTimeout(function(){
    browserSync.reload();
  }, 1000);
});

/**
 * Compass Tasks
 */
gulp.task('compass', function(){
  return gulp.src("./app/sass/**/*.sass")
    .pipe(compass({
      "bundle_exec": true,
      "style": "compressed",
      "css":  "./app/public/stylesheets/",
      "sass": "./app/sass/",
      "img": "./app/public/images/",
      "project": path.join(__dirname),
      "relative": true,
      "comments": false
    }));
});

/**
 * Compass Components Tasks
 */
gulp.task('compassComponents', function(){
  return gulp.src("./app/public/components/**/*.sass")
    .pipe(compass({
      "files": "./app/public/components/**/*.sass",
      "bundle_exec": true,
      "style": "compressed",
      "css": "./app/public/components/",
      "sass": "./app/public/components/",
      "img": "./app/public/images/",
      "project": path.join(__dirname),
      "relative": true,
      "comments": false
    }))
    .pipe(concat('components.css'))
    .pipe(minifyCSS({
      keepBreaks:true
    }))
    .pipe(gulp.dest("./app/public/stylesheets/"));
});

/**
 * Uglify Task
 */
gulp.task('uglify', [], function(){
  return gulp.src([
      "./app/public/**/*.js",
      "!./app/public/javascripts-min/" + "/**/*",
      "!./app/public/vendor/**/*"
    ])
    .pipe(gulpif(!devEnvironment, uglify({
      mangle: false
    })))
    .pipe(gulp.dest("./app/public/javascripts-min/"));
});

/**
 * Concat all components into one single file
 */
gulp.task('concatAllComponents', [], function(){
  var files = [];
  walk.walkSync("./app/public/components/", {
    listeners: {
      names: function (root, nodeNamesArray) {
        nodeNamesArray.sort(function (a, b) {
          if (a > b) return -1;
          if (a < b) return 1;
          return 0;
        });
      },
      directories: function (root, dirStatsArray, next) {
        next();
      },
      file: function (root, stat, next) {
        if(stat.name.indexOf(".js") < 0) return next();
        files.push(root + '/' + stat.name);
      },
      errors: function (root, nodeStatsArray, next) {
        next();
      }
    }
  });
  gulp.src(files)
    .pipe(concat('components-all.js'))
    .pipe(gulpif(!devEnvironment, uglify({
      mangle: false
    })))
    .pipe(gulp.dest("./app/public/javascripts-min/components"));
});

/**
 * Concat Packages (these should be minified files, let Uglify finish first)
 */
gulp.task('concatPackages', [
  "uglify"
], function(){
  var package_prefix = "package-";
  var packages = {
    "index-app": [
      "./app/public/vendor/angularjs/angular.min.js",
      "./app/public/vendor/angular-route/angular-route.min.js",
      "./app/public/vendor/angular-local-storage/angular-local-storage.min.js",
      "./app/public/javascripts-min/components/components-all.js",
      "./app/public/javascripts-min/components-views-htmlToJS/all.js",
      "./app/public/javascripts-min/views/index/index-controller.js",
      "./app/public/javascripts-min/views/dashboard/dashboard-controller.js",
      "./app/public/javascripts-min/index-app.js"
    ]
  };
  var fileName = "";
  Object.keys(packages).forEach(function(key) {
    fileName = package_prefix + key + ".js";
    gulp.src(packages[key])
      .pipe(concat(fileName))
      .pipe(gulp.dest("./app/public/packages/"));
  });
});

/**
 * Watch for file changes
 */
gulp.task('watch', function() {
  gulp.watch([
    "./app/public/**/*",
    "!" + "./app/public/vendor**/*",
    "!" + "./app/public/javascripts-min/" + "**/*"
  ], ['uglify', 'concatAllComponents', 'concatPackages']);
  gulp.watch([
    "./app/public/components/" + "**/*.html",
    "./app/public/views/**/*.html"
  ], ['combineAngularViewsAndComponentsHTMLToJS']);
  gulp.watch("./app/sass/**/*.sass", ['compass']);
  gulp.watch("./app/public/components/**/*.sass", ['compassComponents']);
  gulp.watch([
    "./app/public/views/**/*",
    "./app/routes/**/*"
  ], ['server']);
});

/**
 * Setup development environment
 */
gulp.task('setupDevEnvironment', function() {
  devEnvironment = true;
});

// ========================================
// Gulp Runtime Config
// ========================================

/**
 * Default (Production ready)
 */
gulp.task('default', [
  'uglify',
  'concatAllComponents',
  'combineAngularViewsAndComponentsHTMLToJS',
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
  'combineAngularViewsAndComponentsHTMLToJS',
  'concatPackages',
  'compass',
  'compassComponents',
  'watch'
]);