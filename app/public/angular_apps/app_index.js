(function(){

  var dependencies = [
    "views_index",
    "views_dashboard",
    "components_auth",
    "components_session",
    "ngRoute"
  ];
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') return module.exports = dependencies;

  var app = angular.module("index", dependencies)

  .config(function($interpolateProvider, $routeProvider, $locationProvider) {
  
    var views = "/public/angular_views/";

    // Configure the AngularJS string interpolatation
    $interpolateProvider.startSymbol('[[');
    $interpolateProvider.endSymbol(']]');

    // Configure the routes for this app
    $routeProvider
      .when('/', {
        templateUrl: views + "index/index.html"
      })
      .when('/dashboard', {
        templateUrl: views + "dashboard/dashboard.html",
        authorization: true
      })
      .otherwise({
        redirectTo: "/"
      });

    // configure html5 to get links working on jsfiddle
    $locationProvider.html5Mode(false);
  })
  .run(function($rootScope, $location, components_auth_authService, components_session_sessionService){

      // Define our globally used variables
      $rootScope.isAuthorized = components_auth_authService.isAuthorized;
      $rootScope.user = components_auth_authService.getUser;
      $rootScope.logout = components_auth_authService.logout;

      // Add some route checking
      $rootScope.$on('$routeChangeStart', function (event, next) {
        return components_auth_authService.authorizeCheck(next, $location);
      });
    }
  );

})();