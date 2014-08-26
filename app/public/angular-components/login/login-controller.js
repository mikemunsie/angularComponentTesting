angular.module("components.login")
  .controller("components.login.controller", [
    "$scope",
    "components.registration.service",
    "components.auth.service",
    "$location",
    function($scope, registrationService, authService, $location){

      function login(){
        authService.login($scope.credentials);
      }

      function redirectToDashboard(){
        $location.url("/dashboard");
      }

      $scope.redirectToDashboard = redirectToDashboard;
      $scope.welcomeText = "Login Controller";
      $scope.login = login;
      $scope.credentials = {
        username: "",
        password: ""
      };

    }
  ]);