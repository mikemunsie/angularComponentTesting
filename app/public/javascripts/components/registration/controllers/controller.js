angular
  .module("registration.controllers")
  .controller("registration.controller", ["$scope", "registration.service", function($scope, $registrationService){
    $scope.welcomeText = "Welcome!";
  }]);