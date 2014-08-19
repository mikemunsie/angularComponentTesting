var gulp = require('gulp');
var spawn = require('child_process').spawn;
var node;

// Start and stop server
gulp.task('server', function() {
  if (node) node.kill();
  console.log("Starting server on port 9000... WHAT 9000?!")
  node = spawn('node', ['app/bin/www'], {stdio: 'inherit'});
})

gulp.task('default', ['server']);
