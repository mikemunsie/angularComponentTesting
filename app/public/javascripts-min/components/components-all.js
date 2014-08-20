angular.module("login", []);
angular.module("login")
  .controller("login.controller", ["$scope", "registration.service", function($scope, $registrationService){
    $scope.welcomeText = "Login Controller";
  }]);
angular.module("registration", [])
angular
  .module("registration")
  .factory("registration.service", function(){
    this.test = "Sweetness";
    return this;
  });
angular.module("registration")
  .controller("registration.controller", ["$scope", "registration.service", function($scope, $registrationService){
    $scope.welcomeText = "Registration!! - " + $registrationService.test;
  }]);