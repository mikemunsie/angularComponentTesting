(function(){

  'use strict';

  var app = angular.module("Index", [
    "views.index",
    "views.dashboard",
    "ngRoute",
    "components.auth",
    "components.session",
    "componentsAndViewsHTMLToJS"
  ])
  .config(function($interpolateProvider, $routeProvider, $locationProvider) {
  
    var views = "/public/angular-views/";

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
  .run([
    "$rootScope",
    "$location",
    "components.auth.service",
    "components.session.service",
    function($rootScope, $location, authService, sessionService){

      // Define our globally used variables
      $rootScope.isAuthorized = authService.isAuthorized;
      $rootScope.user = authService.getUser;
      $rootScope.logout = authService.logout;

      // Add some route checking
      $rootScope.$on('$routeChangeStart', function (event, next) {
        return authService.authorizeCheck(next, $location);
      });
    }
  ]);

})();