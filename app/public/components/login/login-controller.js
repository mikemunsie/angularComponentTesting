angular.module("components.login")
  .controller("components.login.controller", [
    "$scope",
    "components.registration.service",
    "components.auth.service",
    function($scope, registrationService, authService){

      function login(){
        authService.login($scope.credentials);
      }

      $scope.welcomeText = "Login Controller";
      $scope.login = login;
      $scope.credentials = {
        username: "",
        password: ""
      };

    }
  ]);