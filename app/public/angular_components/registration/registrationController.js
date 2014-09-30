angular.module("components_registration")
  .controller("components_registration_registrationController",
    function($scope, components_registration_registrationService){
      var registrationService = components_registration_registrationService;
      $scope.welcomeText = "Registration!! - " + registrationService.test;
    }
  );