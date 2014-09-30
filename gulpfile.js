var array =         require('array-extended');
var browserSync =   require('browser-sync');
var clean =         require('gulp-clean');
var concat =        require('gulp-concat');
var eventEmitter =  require('events').EventEmitter;
var extend =        require('extend');
var fs =            require('fs');
var gulp =          require('gulp');
var gulpif =        require('gulp-if');
var gulpUtil =      require('gulp-util');
var gulpWatch =     require('gulp-watch');
var minifyCSS =     require('gulp-minify-css');
var minifyHtml =    require('gulp-minify-html');
var ngAnnotate =    require('gulp-ng-annotate');
var ngHtml2Js =     require('gulp-ng-html2js');
var path =          require('path');
var plumber =       require('gulp-plumber');
var Promise =       require('promise');
var sass =          require('gulp-sass');
var sourcemaps =    require('gulp-sourcemaps');
var shell =         require('gulp-shell');
var spawn =         require('child_process').spawn;
var uglify =        require('gulp-uglify');
var walk =          require('walk');

// Angular Dependency mapping to bower includes
var mappedBowerDependencies = {
  "ngRoute": [
    "./app/public/vendor/angular-route/angular-route.min.js"
  ],
  "ngResource": [
    "./app/public/vendor/angular-resource/angular-resource.min.js"
  ],
  "ngSanitize": [
    "./app/public/vendor/angular-sanitize/angular-sanitize.min.js"
  ],
  "LocalStorageModule": [
    "./app/public/vendor/angular-local-storage/angular-local-storage.min.js"
  ]
};

// Packages that will be concatenated
var packages = {
  "global": [
    "./app/public/vendor/jquery/dist/jquery.min.js",
    "./app/public/vendor/lodash/dist/lodash.min.js",
    "./app/public/vendor/angularjs/angular.js"
  ]
};

// Global variables used throughout
var server = null;
var browserSyncStarted = false;
var devEnvironment = false;
var dependencies = {};
var mappedDependencies = {};
var dependenciesToFiles = {};
var dependencyToDependency = {};
var finalDependencyToDependency = {};

// Set the max number of listeners as we adjust the number of gulp processes
eventEmitter.prototype._maxListeners = 30;

function GulpStreamTracking(completedCallback) {
  var self = this;
  self.totalStreams = 0;
  self.completedStreams = 0;
  self.allStreamsCompleted = false;
  self.addStreamCount = function () {
    self.totalStreams++;
  };
  self.checkCompletedStreams = function () {
    if (self.totalStreams > 0) {
      self.completedStreams++;
    }
    if (self.totalStreams === self.completedStreams) {
      self.allStreamsCompleted = true;
      completedCallback.call();
    }
  };
}

// We have this routine until we can use _@ in the twirl template
function helpers_getAppName(app) {
  return app.replace(/\_/g, "-");
}

function helpers_createBowerFriendlyCSSFolderName(dep) {
  return dep;
}

function helpers_getDependencyBowerCSSPath(dep) {
  dep = helpers_createBowerFriendlyCSSFolderName(dep);
  return "./app/public/stylesheets/bower_components/" + dep;
}

function helpers_logStart(name) {
  return gulpUtil.log(gulpUtil.colors.green("Started: " + name));
}

function helpers_logEnd(name) {
  return gulpUtil.log(gulpUtil.colors.blue("(completed) - " + name));
}

function helpers_getDependencyType(dep) {
  var depName;
  for (depName in mappedBowerDependencies) {
    if (mappedBowerDependencies.hasOwnProperty(depName)) {
      if (depName === dep) {
        return "bower";
      }
    }
  }
  if (dep.indexOf("components_") > -1) {
    return "component";
  }
  if (dep.indexOf("layouts_") > -1) {
    return "layout";
  }
  if (dep.indexOf("views_") > -1) {
    return "view";
  }
  return false;
}

function helpers_getExportedAngularAppFolder(app) {
  return "./app/public/javascripts-min/angular_apps/" + app + "/";
}

function helpers_getDependencyDestinationFileName(ref) {
  return ref + ".js";
}

function helpers_getDependencyDestinationFolder(ref) {
  return ref + ".js";
}

function helpers_getDependencyPath(ref) {
  return "./app/public/angular_" + ref.replace(/\_/, '/');
}

function helpers_getDependencyCSSPath(ref) {
  return "./app/public/stylesheets/angular_" + ref.replace(/\_/, '/');
}

function helpers_getDependenciesForDependency(dependencyCheck, dependenciesFound){
  var _recursiveDependenciesFound = [];
  var dependencyExists = false;
  var newDependenciesFound = [];
  if (!dependenciesFound) {
    dependenciesFound = [];
  }
  dependencyToDependency[dependencyCheck].forEach(function (requiredDependency) {
    _recursiveDependenciesFound.push(requiredDependency);
  });
  if (_recursiveDependenciesFound.length > 0) {
    _recursiveDependenciesFound.forEach(function (_recDependency) {
      dependencyExists = false;
      dependenciesFound.forEach(function (dep) {
        if (_recDependency === dep) { 
          dependencyExists = true;
        }
      });
      if (!dependencyExists) {
        dependenciesFound.push(_recDependency);
        newDependenciesFound.push(_recDependency);
      }
    });
  }
  if (newDependenciesFound.length > 0) {
    newDependenciesFound.forEach(function (newDependency) {
      return helpers_getDependenciesForDependency(newDependency, dependenciesFound);
    });
  }
  return dependenciesFound;
}

function cleanAngularJS(){
  helpers_logStart("Clean Angular JS");
  return new Promise(function (fulfil) {

    // Lets speed this up by only rebuilding the CSS for prod enviornment
    var folders = [
      "./app/public/javascripts-min/"
    ];
    gulp.src(folders)
      .pipe(plumber(function(){
        return fulfil();
      }))
      .pipe(clean({
        force: true
      }))
      .on('end', function() {
        helpers_logEnd("Clean Angular JS");
        return fulfil();
      });
  });
}

function createAngularAppBowerComponents() {
  helpers_logStart("Create Angular App Bower Components");
  return new Promise(function (fulfil) {
    var application;
    var index;
    var dependenciesApplicationIndex;
    var destinationFileName;
    var sortedJSSrcFiles = [];
    var streamTracking = new GulpStreamTracking(function () {
      helpers_logEnd("Create Angular App Bower Components");
      return fulfil();
    });

    // No dependencies, leave.
    if (!Object.keys(dependencies).length){
      return fulfil();
    }

    // Loop through the applications and create the JS
    for (index in Object.keys(dependencies)) {
      application = Object.keys(dependencies)[index];
      dependencies[application].forEach(function (dep) {
        if (helpers_getDependencyType(dep) === "bower") {
          mappedBowerDependencies[dep].forEach(function (file) {
            sortedJSSrcFiles.push(file);
          });
        }
      });

      // If no files, just check to see if the streams completed yet
      if (sortedJSSrcFiles.length === 0) {
        streamTracking.checkCompletedStreams();
      }

      streamTracking.addStreamCount();
      gulp.src(sortedJSSrcFiles)
        .pipe(plumber(function(){
          streamTracking.checkCompletedStreams();
        }))
        .pipe(concat("_bowerComponents.js"))
        .pipe(gulp.dest(helpers_getExportedAngularAppFolder(application)))
        .on('end', streamTracking.checkCompletedStreams);
    }
  });
}

function createAngularAppCSS() {
  helpers_logStart("Create Angular Application CSS Files");
  return new Promise(function (fulfil) {
    var cssFiles = [];
    var sassFolders = [
      "./app/public/angular_apps",
      "./app/public/angular_components",
      "./app/public/angular_layouts",
      "./app/public/angular_views",
      "./app/public/sass/bower_components"
    ];
    var sassFolderIndex;
    var layoutFoundIndex = -1;
    var streamTracking = new GulpStreamTracking(function () {
      helpers_logEnd("Create Angular Application CSS Files");
      return fulfil();
    });
    var application;
    var dependency;
    var index;
    var file;
    var dependenciesApplicationIndex;
    var destinationFileName;
    var fileContents = "";

    // No dependencies, leave.
    if (!Object.keys(dependencies).length) {
      return fulfil();
    }

    // If we are in dev mode, lets create a new sass file, dev.sass, that has everything we need
    if (devEnvironment) {

      fileContents = "@import style \r\n";

      for (sassFolderIndex in sassFolders) {
        walk.walkSync(sassFolders[sassFolderIndex], {
          listeners: {
            file: function (root, stat, next) {
              if (stat.name.indexOf("_") === 0 || stat.name.indexOf(".sass") < 0) {
                return next();
              }
              fileContents+= "@import ../../." + root.substring("") + "/" + stat.name.substring(0,stat.name.length-5) + "\r\n";
            }
          }
        });
      }

      // Write the new dev file
      fs.writeFileSync("./app/public/sass/dev.sass", fileContents, 'utf8');

      streamTracking.addStreamCount();
      gulp.src('app/public/sass/**/*.sass')
        .pipe(plumber(function(){
          streamTracking.checkCompletedStreams();
        }))
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(sourcemaps.write())
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('app/public/stylesheets/'))
        .on("end", function(){

          // After it's compiled, replace the contents of style.sass with this
          fileContents = fs.readFileSync("app/public/stylesheets/dev.css", 'utf8');
          fileContents = fileContents.replace("dev.css.map", "style.css.map");
          fs.writeFileSync("app/public/stylesheets/style.css", fileContents, 'utf8');

          fileContents = fs.readFileSync("app/public/stylesheets/dev.css.map", 'utf8');
          fileContents = fileContents.replace("dev.css", "style.css");
          fs.writeFileSync("app/public/stylesheets/style.css.map", fileContents, 'utf8');

          gulp.src([
            "./app/public/sass/dev.sass"
          ])
          .pipe(plumber(function(){
            streamTracking.checkCompletedStreams();
          }))
          .pipe(clean({
            force: true
          }))
          .on('end', function(){

            // Create Dummy package-apps to avoid undefined css files
            for (index in Object.keys(dependencies)) {
              application = Object.keys(dependencies)[index];
              fs.writeFileSync("./app/public/stylesheets/package-" + helpers_getAppName(application) + ".css", "", 'utf8');
            }
            
            // All done!
            streamTracking.checkCompletedStreams();
        });
      });
      return;
    }

    // Loop through the applications and create the CSS
    for (index in Object.keys(dependencies)) {
      application = Object.keys(dependencies)[index];
      cssFolders = [];
      cssFiles = [];
      layoutFoundIndex = -1;

      for (dependenciesApplicationIndex in dependencies[application]) {
        dependency = dependencies[application][dependenciesApplicationIndex];
        if (helpers_getDependencyType(dependency) === "bower") {
          cssFiles.push(helpers_getDependencyBowerCSSPath(dependency) + "/**/*.css");
          continue;
        }
        cssFiles.push(helpers_getDependencyCSSPath(dependency) + "/**/*.css");
      }

      if (cssFiles.length == 0){
        streamTracking.checkCompletedStreams();
      }

      // If there is a layout, lets include that first (FORCE THIS)
      for (file in cssFiles) {
        if (cssFiles[file].indexOf("layouts/") > -1) {
          layoutFoundIndex = file;
        }
      }
      if (layoutFoundIndex > -1) {
        cssFiles.unshift(cssFiles[layoutFoundIndex]);
        cssFiles.splice(layoutFoundIndex + 1, 1);
      }
      
      // With the folder locations, create the app css into one nice bundle
      streamTracking.addStreamCount();
      gulp.src(cssFiles)
        .pipe(plumber(function(){
          streamTracking.checkCompletedStreams()
        }))
        .pipe(concat("package-" + helpers_getAppName(application) + ".css"))
        .pipe(gulp.dest("./app/public/stylesheets/"))
        .on('end', streamTracking.checkCompletedStreams);
    }
  });
}

function createAngularAppJS() {
  helpers_logStart("Create Angular Application JS Files");
  return new Promise(function (fulfil) {
    var application;
    var ref;
    var index;
    var destinationFileName;
    var dependenciesApplicationIndex;
    var sortedJSSrcFiles = [];
    var streamTracking = new GulpStreamTracking(function () {
      helpers_logEnd("Create Angular Application JS Files");
      return fulfil();
    });

    // No dependencies, leave.
    if (!Object.keys(dependencies).length) {
      return fulfil();
    }

    // Loop through the applications and create the JS
    for (index in Object.keys(dependencies)) {
      application = Object.keys(dependencies)[index];
      for (dependenciesApplicationIndex in dependencies[application]) {
        ref = dependencies[application][dependenciesApplicationIndex];
        destinationFileName = helpers_getDependencyDestinationFileName(ref);

        // Create the JS Files into the angular-apps-views
        walk.walkSync(helpers_getDependencyPath(ref), {
          listeners: {
            names: function (root, nodeNamesArray) {

              var rootFileName = root.substring(root.lastIndexOf("/")+1) + ".js";
              var fileName;
              var fileIndex;

              // Sort alphabetically
              nodeNamesArray.sort(function (a, b) {
                if (a > b) { 
                  return -1;
                }
                if (a < b) {
                  return 1;
                }
                return 0;
              });

              for(fileIndex in nodeNamesArray){
                fileName = nodeNamesArray[fileIndex];
                if(fileName === rootFileName){
                  nodeNamesArray.splice(fileIndex, 1);
                  nodeNamesArray.unshift(fileName);
                  break;
                }
              }

            },
            file: function (root, stat, next) {
              if (stat.name.indexOf(".js") < 0) {
                return next();
              }
              sortedJSSrcFiles.push(helpers_getDependencyPath(ref) + "/" + stat.name);
            }
          }
        });

        // Nothing found, proceed
        if (sortedJSSrcFiles.length === 0) {
          continue;
        }

        // With the sorted files, create the components and views file
        streamTracking.addStreamCount();
        gulp.src(sortedJSSrcFiles)
          .pipe(plumber(function(){
            streamTracking.checkCompletedStreams()
          }))
          .pipe(concat("componentsAndViews.js"))
          .pipe((gulpif(!devEnvironment, uglify({
            mangle: false,
            preserveComments: "all"
          }))))
          .pipe(gulp.dest(helpers_getExportedAngularAppFolder(application)))
          .on('end', streamTracking.checkCompletedStreams);
      }
    }
  });
}

function createAngularAppPackages() {
  helpers_logStart("Create Angular Application Packages");
  return new Promise(function (fulfil) {
    var application;
    var _index;
    var streamTracking = new GulpStreamTracking(function () {
      helpers_logEnd("Create Angular Application Packages");
      return fulfil();
    });

    // No dependencies, leave.
    if (!Object.keys(dependencies).length) {
      return fulfil();
    }

    for (_index in Object.keys(dependencies)) {
      application = Object.keys(dependencies)[_index];

      streamTracking.addStreamCount();
      gulp.src([
        helpers_getExportedAngularAppFolder(application) + "**/*.js",
        "./app/public/angular_apps/" + application + ".js"
      ])
        .pipe(plumber(function(){
          streamTracking.checkCompletedStreams()
        }))
        .pipe(ngAnnotate())
        .pipe(concat("package-" + helpers_getAppName(application) + ".js"))
        .pipe(gulp.dest("./app/public/javascripts-min/packages/"))
        .on('end', function () {
          if (devEnvironment) {
            browserSync.reload();
          }
          streamTracking.checkCompletedStreams();
        });
    }
  });
}

function concatPackages() {
  helpers_logStart("Concat Packages");
  return new Promise(function (fulfil) {
    var fileName = "";
    var package_prefix = "package-";
    var streamTracking = new GulpStreamTracking(function () {
      helpers_logEnd("Concat Packages");
      return fulfil();
    });
    Object.keys(packages).forEach(function (key) {
      fileName = package_prefix + key + ".js";
      streamTracking.addStreamCount();
      gulp.src(packages[key])
        .pipe(plumber(function(){
          streamTracking.checkCompletedStreams()
        }))
        .pipe(concat(fileName))
        .pipe(gulp.dest("./app/public/javascripts-min/packages/"))
        .on('end', streamTracking.checkCompletedStreams);
    });
  });
}

function findAngularDependencies() {
  helpers_logStart("Find Angular Dependencies");
  return new Promise(function (fulfil) {
    var folders = [
      "./app/public/angular_components",
      "./app/public/angular_views",
      "./app/public/angular_apps",
      "./app/public/angular_layouts"
    ];
    var dependenciesFound = [];
    var dependencyFound = false;
    var filePath, fileName = "";
    var ref = null;
    var file = null;
    var dependency;
    var _index;
    dependencies = {};
    mappedDependencies = {};
    dependenciesToFiles = {};
    dependencyToDependency = {};
    finalDependencyToDependency = {};

    // For each folder, lets iterate through and map the dependencies per file
    folders.forEach(function (folder) {
      walk.walkSync(folder, {
        listeners: {
          file: function (root, stat, next) {
            if (stat.name.indexOf(".js") < 0) {
              return next();
            }
            filePath = root + "/" + stat.name;
            mappedDependencies[filePath] = [];
            dependenciesFound = [];
            try {
              delete require.cache[require.resolve(filePath)];
              dependenciesFound = require(filePath);
            } catch (e) {
              dependenciesFound = [];
            }
            dependenciesFound.forEach(function (ref) {
              if (helpers_getDependencyType(ref) !== false) {
                mappedDependencies[filePath].push(ref);
              }
            });
          }
        }
      });
    });

    // Merge in the MappedDependencies from Bower Components
    for (dependency in mappedBowerDependencies) {
      mappedBowerDependencies[dependency].forEach(function (file) {
        mappedDependencies[file] = [dependency];
      });
    }

    // Next we take the components and map them to folders
    dependenciesFound = [];
    for (file in mappedDependencies) {
      mappedDependencies[file].forEach(function (dependency) {
        dependenciesFound.push(dependency);
      });
    }
    dependenciesFound = array.unique(dependenciesFound);
    dependenciesFound.forEach(function (dependency) {
      dependenciesToFiles[dependency] = [];
      if (helpers_getDependencyType(dependency) === "bower") {
        dependenciesToFiles[dependency] = mappedBowerDependencies[dependency];
        return;
      }
      for (file in mappedDependencies) {
        if (file.indexOf(dependency.replace(/\_/, '/')) > -1) {
          dependenciesToFiles[dependency].push(file);
        }
      }
    });

    // Now we map dependency to dependency
    for (dependency in dependenciesToFiles) {
      dependencyToDependency[dependency] = [];
      dependenciesToFiles[dependency].forEach(function (dependencyFile) {
        mappedDependencies[dependencyFile].forEach(function (dependencyFileDependency) {
          dependencyToDependency[dependency].push(dependencyFileDependency);
        });
      });
    }

    // We then make the final map of dependencies to dependencies
    for (dependency in dependencyToDependency) {
      finalDependencyToDependency[dependency] = array.unique(helpers_getDependenciesForDependency(dependency));
      finalDependencyToDependency[dependency].push(dependency);
    }

    // Now we revisit our angular_Apps and plugin our dependency stuff
    for (file in mappedDependencies) {
      if (file.indexOf("angular_apps") < 0){ 
        continue;
      }
      dependenciesFound = [];
      mappedDependencies[file].forEach(function (dependency,index) {
        finalDependencyToDependency[dependency].forEach(function (finalDependency) {
          dependenciesFound.push(finalDependency);
        })
      });
      fileName = file.substring(file.lastIndexOf("/") + 1, file.indexOf(".js"));
      dependencies[fileName] = array.unique(dependenciesFound);
    }

    // All done, return the results
    helpers_logEnd("Find Angular Dependencies");
    return fulfil();
  });
}

function createAngularApps() {
  helpers_logStart("Create Angular Apps");
  return new Promise(function (fulfil) {
    var jsStreamTracking = new GulpStreamTracking(function () {
      createAngularAppPackages()
        .then(checkAllStreamsCompleted);
    });
    var cssStreamTracking = new GulpStreamTracking(function () {
      checkAllStreamsCompleted();
    });
    var checkAllStreamsCompleted = function () {
      if (cssStreamTracking.allStreamsCompleted && jsStreamTracking.allStreamsCompleted) {
        helpers_logEnd("Create Angular Apps");
        return fulfil();
      }
    };
    
    concatPackages();
    findAngularDependencies()
      .then(function () {

        jsStreamTracking.addStreamCount();
        createAngularTemplateCache()
          .then(jsStreamTracking.checkCompletedStreams);

        jsStreamTracking.addStreamCount();
        createAngularAppBowerComponents()
          .then(jsStreamTracking.checkCompletedStreams);

        jsStreamTracking.addStreamCount();
        createAngularAppJS()
          .then(jsStreamTracking.checkCompletedStreams);

        cssStreamTracking.addStreamCount();

        // Optimize for dev environment
        if (devEnvironment) {
          cssStreamTracking.checkCompletedStreams();
        } else {
          sassCompile()
            .then(createAngularAppCSS)
            .then(cssStreamTracking.checkCompletedStreams); 
        }
        
      });
  });
}

function createAngularTemplateCache() {
  helpers_logStart("Create Angular Template Cache");
  return new Promise(function (fulfil) {
    var application;
    var ref;
    var index;
    var dependenciesApplicationIndex;
    var destinationFileName;
    var streamTracking = new GulpStreamTracking(function () {
      helpers_logEnd("Create Angular Template Cache");
      return fulfil();
    });

    // No dependencies, leave.
    if (!Object.keys(dependencies).length){
      return fulfil();
    }

    // Loop through the applications and create the HTML2JS
    for (index in Object.keys(dependencies)) {
      application = Object.keys(dependencies)[index];
      for (dependenciesApplicationIndex in dependencies[application]) {
        ref = dependencies[application][dependenciesApplicationIndex];
        destinationFileName = helpers_getDependencyDestinationFileName(ref);
        streamTracking.addStreamCount();
        gulp.src(helpers_getDependencyPath(ref) + "/**/*.html")
          .pipe(plumber(function(){
            streamTracking.checkCompletedStreams()
          }))
          .pipe(minifyHtml({
            empty: true,
            spare: true,
            quotes: true
          }))
          .pipe(ngHtml2Js({
            moduleName: "angularTemplates2JS",
            prefix: helpers_getDependencyPath(ref).substring(1) + "/"
          }))
          .pipe((gulpif(!devEnvironment, uglify({
            preserveComments: "all",
            mangle: false
          }))))
          .pipe(concat(destinationFileName))
          .pipe(gulp.dest(helpers_getExportedAngularAppFolder(application)))
          .on('end', streamTracking.checkCompletedStreams);
      }
    }
  });
}

function runTests() {
  helpers_logStart("Running Tests");
  return new Promise(function (fulfil) {
    shell.task([
      "node node_modules/karma/bin/karma start test/karma.conf.js"
      //"protractor test/protractor-conf.js"
    ])().on('end', fulfil);
  });
}

function sassCompile() {
  helpers_logStart("Sass Compile");
  return new Promise(function (fulfil) {
    var streamTracking = new GulpStreamTracking(function () {
      helpers_logEnd("Sass Compile");
      return fulfil();
    });
    if (devEnvironment) {
      streamTracking.checkCompletedStreams();
    } else {

      streamTracking.addStreamCount();
      gulp.src('app/public/sass/**/*.sass')
        .pipe(plumber(function(){
          streamTracking.checkCompletedStreams();
        }))
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(gulp.dest('app/public/stylesheets/'))
        .pipe(sourcemaps.write())
        .on("end", streamTracking.checkCompletedStreams);

      streamTracking.addStreamCount();
      gulp.src('app/public/angular_apps/**/*.sass')
        .pipe(plumber(function(){
          streamTracking.checkCompletedStreams();
        }))
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(gulp.dest('app/public/stylesheets/angular_apps/'))
        .pipe(sourcemaps.write())
        .on("end", streamTracking.checkCompletedStreams);

      streamTracking.addStreamCount();
      gulp.src('app/public/angular_components/**/*.sass')
        .pipe(plumber(function(){
          streamTracking.checkCompletedStreams();
        }))
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(gulp.dest('app/public/stylesheets/angular_components/'))
        .pipe(sourcemaps.write())
        .on("end", streamTracking.checkCompletedStreams);

      streamTracking.addStreamCount();
      gulp.src('app/public/angular_layouts/**/*.sass')
        .pipe(plumber(function(){
          streamTracking.checkCompletedStreams();
        }))
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(gulp.dest('app/public/stylesheets/angular_layouts/'))
        .pipe(sourcemaps.write())
        .on("end", streamTracking.checkCompletedStreams);

      streamTracking.addStreamCount();
      gulp.src('app/public/angular_views/**/*.sass')
        .pipe(plumber(function(){
          streamTracking.checkCompletedStreams();
        }))
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(gulp.dest('app/public/stylesheets/angular_views/'))
        .pipe(sourcemaps.write())
        .on("end", streamTracking.checkCompletedStreams);

    }
  });
}

function startServerAndBrowserSync() {
  helpers_logStart("Start Server and Browser Sync");
  return new Promise(function (fulfil) {
    if (server) server.kill();
    server = spawn('node', ['app/bin/www'], {stdio: 'inherit'});
    setTimeout(function(){
      if (browserSyncStarted) {
        browserSync.reload();
      } else {
        browserSync.init(null, {
          "files": [
            "app/public/images/**/*",
            "app/public/stylesheets/style.css"
          ],
          "browsers": ['google chrome'],
          "proxy": "http://localhost:9000"
        });
        browserSyncStarted = true;
      }
      helpers_logEnd("Start Server and Browser Sync");
      return fulfil();
    });
  });
}

function watch() {
  return new Promise(function (fulfil) {
    helpers_logStart("Started watching for changes...");
    gulpWatch([
      "app/public/angular_apps/**/*",
      "app/public/angular_components/**/*",
      "app/public/angular_views/**/*",
      "app/public/angular_layouts/**/*",
      "!app/public/**/*.sass"
    ], function () {
      createAngularApps();
    });
    gulpWatch([
      "app/public/sass/**/*.sass",
      "app/public/angular_components/**/*.sass",
      "app/public/angular_views/**/*.sass",
      "app/public/angular_layouts/**/*.sass",
      "app/public/angular_apps/**/*.sass",
      "!app/public/sass/dev.sass"
    ], function () {
      sassCompile()
        .then(createAngularAppCSS);
    });
    return fulfil();
  });
}

gulp.task('default', function () {
  createAngularApps();
});

gulp.task('dev', function () {
  devEnvironment = true;
  createAngularApps()
    .then(createAngularAppCSS)
    .then(watch)
    .then(startServerAndBrowserSync);
});