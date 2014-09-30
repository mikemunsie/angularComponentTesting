angular.module("components_login")
  .controller("components_login_loginController",
    function($scope, components_auth_authService, $location){
      function login(){
        components_auth_authService.login($scope.credentials);
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
  );