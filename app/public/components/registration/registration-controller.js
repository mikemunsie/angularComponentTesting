angular.module("registration")
  .controller("registration.controller", ["$scope", "registration.service", function($scope, $registrationService){
    $scope.welcomeText = "Registration!! - " + $registrationService.test;
  }]);