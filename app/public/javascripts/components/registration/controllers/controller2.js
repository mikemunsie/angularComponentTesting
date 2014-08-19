angular
  .module("registration.controllers")
  .controller("registration.controller2", ["$scope","registration.service", function($scope, $registrationService){
    $scope.welcomeText = $registrationService.test;
  }]);