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
      "./app/views/**/*"
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
    "./app/public/javascripts-min/angular-components-views-htmlToJS/angular-components.js",
    "./app/public/javascripts-min/angular-components-views-htmlToJS/views.js"
  ])
  .pipe(concat("all.js"))
  .pipe(gulpif(devEnvironment, uglify({
    mangle: false
  })))
  .pipe(gulp.dest("./app/public/javascripts-min/angular-components-views-htmlToJS"));
});

/**
 * Convert all angular angular-components into JS file
 */
gulp.task('angularComponentsHTMLToJS', function(){
  return gulp.src([
    "./app/public/angular-components/**/*.html"
  ])
  .pipe(minifyHtml({
    empty: true,
    spare: true,
    quotes: true
  }))
  .pipe(ngHtml2Js({
    moduleName: "componentsAndViewsHTMLToJS",
    prefix: "/public/angular-components/"
  }))
  .pipe(concat("angular-components.js"))
  .pipe(gulp.dest("./app/public/javascripts-min/angular-components-views-htmlToJS/"));
});

/**
 * Convert all angular views into JS file
 */
gulp.task("angularViewsHTMLToJS", function(){
  return gulp.src([
    "./app/public/angular-views/**/*.html"
  ])
  .pipe(minifyHtml({
    empty: true,
    spare: true,
    quotes: true
  }))
  .pipe(ngHtml2Js({
    moduleName: "componentsAndViewsHTMLToJS",
    prefix: "/public/angular-views/"
  }))
  .pipe(concat("views.js"))
  .pipe(gulp.dest("./app/public/javascripts-min/angular-components-views-htmlToJS"));
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
 * Compass angular-components Tasks
 */
gulp.task('compassAngularComponents', function(){
  return gulp.src("./app/public/angular-components/**/*.sass")
    .pipe(compass({
      "files": "./app/public/angular-components/**/*.sass",
      "bundle_exec": true,
      "style": "compressed",
      "css": "./app/public/angular-components/",
      "sass": "./app/public/angular-components/",
      "img": "./app/public/images/",
      "project": path.join(__dirname),
      "relative": true,
      "comments": false
    }))
    .pipe(concat('angular-components.css'))
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
 * Concat all angular-components into one single file
 */
gulp.task('concatAllAngularComponents', [], function(){
  var files = [];
  walk.walkSync("./app/public/angular-components/", {
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
    .pipe(concat('angular-components-all.js'))
    .pipe(gulpif(!devEnvironment, uglify({
      mangle: false
    })))
    .pipe(gulp.dest("./app/public/javascripts-min/angular-components"));
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
      "./app/public/javascripts-min/angular-components/angular-components-all.js",
      "./app/public/javascripts-min/angular-components-views-htmlToJS/all.js",
      "./app/public/javascripts-min/angular-views/index/index-controller.js",
      "./app/public/javascripts-min/angular-views/dashboard/dashboard-controller.js",
      "./app/public/javascripts-min/angular-apps/index-app.js"
    ]
  };
  var fileName = "";
  Object.keys(packages).forEach(function(key) {
    fileName = package_prefix + key + ".js";
    gulp.src(packages[key])
      .pipe(concat(fileName))
      .pipe(gulp.dest("./app/public/javascripts-min/packages/"));
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
  ], ['uglify', 'concatAllAngularComponents', 'concatPackages']);
  gulp.watch([
    "./app/public/angular-components/" + "**/*.html",
    "./app/public/angular-views/**/*.html"
  ], ['combineAngularViewsAndComponentsHTMLToJS']);
  gulp.watch("./app/sass/**/*.sass", ['compass']);
  gulp.watch("./app/public/angular-components/**/*.sass", ['compassAngularComponents']);
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

// ========================================
// Gulp Runtime Config
// ========================================

/**
 * Default (Production ready)
 */
gulp.task('default', [
  'uglify',
  'concatAllAngularComponents',
  'combineAngularViewsAndComponentsHTMLToJS',
  'concatPackages',
  'compass',
  'compassAngularComponents'
]);

/**
 * Development task will watch files, automatically refresh, and more
 */
gulp.task('dev', [
  'setupDevEnvironment',
  'server',
  'browserSync',
  'uglify',
  'concatAllAngularComponents',
  'combineAngularViewsAndComponentsHTMLToJS',
  'concatPackages',
  'compass',
  'compassAngularComponents',
  'watch'
]);