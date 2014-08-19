angular
  .module("login.controllers")
  .controller("login.controller", ["$scope", "registration.service", function($scope, $registrationService){
    $scope.welcomeText = "Login - " + $registrationService.test;
  }]);