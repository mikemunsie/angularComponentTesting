angular.module("views_index")
  .controller("views_index_indexController",
    function($scope, components_registration_registrationService){
      var registrationService = components_registration_registrationService;
      $scope.welcomeText = "Login - " + registrationService.test;
    }
  );