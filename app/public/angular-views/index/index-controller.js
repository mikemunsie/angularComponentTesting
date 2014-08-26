angular.module("views.index", ["components.registration", "components.login"])
  .controller("views.index.controller", ["$scope", "components.registration.service", function($scope, $components_registrationService){
    $scope.welcomeText = "Login - " + $components_registrationService.test;
  }]);