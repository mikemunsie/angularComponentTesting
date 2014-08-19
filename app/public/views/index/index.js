angular.module("AngularComponents")
  .controller("index.controller", ["$scope", "registration.service", function($scope, $registrationService){
    $scope.welcomeText = "Login - " + $registrationService.test;
  }]);