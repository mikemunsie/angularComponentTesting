angular.module("components.registration")
  .controller("components.registration.controller", ["$scope", "components.registration.service", function($scope, $components_registrationService){
    $scope.welcomeText = "Registration!! - " + $components_registrationService.test;
  }]);