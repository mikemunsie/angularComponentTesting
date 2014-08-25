// Somewhat clean-ish file

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

// ========================================
// Configuration
// ========================================

function getAppFolder(folder){
  if(folder === undefined) return folders.app.base;
  return folders.app.base + "/" + folders.app[folder];
}

function getPublicFolder(folder){
  if(folder === undefined) return folders.app.base + "/" + folders.public.base;
  return folders.app.base + "/" + folders.public.base + "/" + folders.public[folder];
}

function getPublicMinFolder(folder){
  if(folder === undefined) return folders.app.base + "/" + folders.public.base + "/" + folders.public.jsMin;
  return folders.app.base + "/" + folders.public.base + "/" + folders.public.jsMin + "/" + folders.public[folder];
}

// Server Information
var server_address = "http://localhost:9000";

// Folder Setup
var folders = {
  "app": {
    "base": "./app",
    "views": "views",
    "sass": "sass"
  },
  "public": {
    "base": "public",
    "bowerComponents": "vendor",
    "css": "stylesheets",
    "js": "javascripts",
    "jsMin": "javascripts-min",
    "images": "images",
    "angularViews": "views",
    "angularComponents": "components",
    "angularViewsAndComponentsHTML": "components-views-htmlToJS",
    "packages": "packages"
  }
};

// Gulp Config
var config = {

  "browserSync": {
    "files": [
      getPublicFolder() + "/**/*",
      getPublicFolder("views") + "/**/*"
    ],
    "browsers": ['google chrome'],
    "proxy": server_address
  },

  "compass": {
    "files": getAppFolder("sass") + "/**/*.sass",
    "bundle_exec": true,
    "style": "compressed",
    "css":  getPublicFolder("css"),
    "sass": getAppFolder("sass"),
    "img": getPublicFolder("images"),
    "project": path.join(__dirname),
    "relative": true,
    "comments": false
  },

  "compass_components": {
    "files": getPublicFolder("angularComponents") + "/**/*.sass",
    "bundle_exec": true,
    "style": "compressed",
    "css": getPublicFolder("angularComponents"),
    "sass": getPublicFolder("angularComponents"),
    "img": getPublicFolder("images"),
    "project": path.join(__dirname),
    "relative": true,
    "comments": false
  },

  "concat": {
    "dest": getPublicFolder("packages"),
    "prefix": "package-",
    "packages": {
      "index-app": [
        getPublicFolder("bowerComponents") + "/angularjs/angular.min.js",
        getPublicFolder("bowerComponents") + "/angular-route/angular-route.min.js",
        getPublicFolder("bowerComponents") + "/angular-local-storage/angular-local-storage.min.js",
        getPublicMinFolder("angularComponents") + "/components-all.js",
        getPublicMinFolder("angularViewsAndComponentsHTML") + "/all.js",
        getPublicMinFolder("angularViews") + "/index/index-controller.js",
        getPublicMinFolder("angularViews") + "/dashboard/dashboard-controller.js",
        getPublicMinFolder() + "/index-app.js"
      ]
    }
  },

  "uglify": {
    "files": [
      getPublicFolder() + "/**/*.js",
      "!" + getPublicMinFolder() + "/**/*",
      "!" + getPublicFolder("bowerComponents") + "/**/*"
    ],
    "dest": getPublicMinFolder(),
    "mangle": false
  }
};

// ========================================
// Gulp Tasks
// ========================================

var devEnvironment = false;
  
/**
 * Browser Sync Settings
 */
gulp.task('browserSync', function() {
  browserSync.init([], config.browserSync);
});

/**
 * Merge angular views into one compressed JS file
 */
gulp.task("combineAngularViewsAndComponentsHTMLToJS", [
  "angularComponentsHTMLToJS",
  "angularViewsHTMLToJS"
], function(){
  return gulp.src([
    getPublicMinFolder("angularViewsAndComponentsHTML") + "/components.js",
    getPublicMinFolder("angularViewsAndComponentsHTML") + "/views.js"
  ])
  .pipe(concat("all.js"))
  .pipe(gulpif(devEnvironment, uglify({
    mangle: config.uglify.mangle
  })))
  .pipe(gulp.dest(getPublicMinFolder("angularViewsAndComponentsHTML")));

});

/**
 * Convert all angular components into JS file
 */
gulp.task('angularComponentsHTMLToJS', function(){
  return gulp.src([
    getPublicFolder("angularComponents") + "/**/*.html"
  ])
  .pipe(minifyHtml({
    empty: true,
    spare: true,
    quotes: true
  }))
  .pipe(ngHtml2Js({
    moduleName: "componentsAndViewsHTMLToJS",
    prefix: "/" + folders.public.base + "/" + folders.public.angularComponents + "/"
  }))
  .pipe(concat("components.js"))
  .pipe(gulp.dest(getPublicMinFolder("angularViewsAndComponentsHTML")));
});

/**
 * Convert all angular views into JS file
 */
gulp.task("angularViewsHTMLToJS", function(){
  return gulp.src([
    getPublicMinFolder("angularViews") + "/**/*.html"
  ])
  .pipe(minifyHtml({
    empty: true,
    spare: true,
    quotes: true
  }))
  .pipe(ngHtml2Js({
    moduleName: "componentsAndViewsHTMLToJS",
    prefix: "/" + folders.public.base + "/" + folders.public.angularViews + "/"
  }))
  .pipe(concat("views.js"))
  .pipe(gulp.dest(getPublicMinFolder("angularViewsAndComponentsHTML")));
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
  return gulp.src(config.compass.files)
    .pipe(compass(config.compass));
});

/**
 * Compass Components Tasks
 */
gulp.task('compassComponents', function(){
  return gulp.src(config.compass_components.files)
    .pipe(compass(config.compass_components))
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
  walk.walkSync(getPublicFolder("angularComponents"), {
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
    .pipe(gulp.dest(getPublicMinFolder("angularComponents")));
});

/**
 * Concat Packages (these should be minified files, let Uglify finish first)
 */
gulp.task('concatPackages', [
  "uglify"
], function(){
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
    getPublicFolder() + "**/*",
    "!" + getPublicFolder("bowerComponents") + "**/*",
    "!" + getPublicMinFolder() + "**/*"
  ], ['uglify', 'concatAllComponents', 'concatPackages']);
  gulp.watch([
    getPublicFolder("angularComponents") + "**/*.html",
    getPublicFolder("angularViews") + "**/*.html"
  ], ['combineAngularViewsAndComponentsHTMLToJS']);
  gulp.watch(config.compass.files, ['compass']);
  gulp.watch(config.compass_components.files, ['compassComponents']);
  gulp.watch([
    getAppFolder("views") + "**/*",
    getAppFolder() + "routes/**/*"
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