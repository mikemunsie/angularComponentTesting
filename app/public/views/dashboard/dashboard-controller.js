angular.module("views.dashboard", [
  "components.registration", 
  "components.login"
])
.controller("views.dashboard.controller", [
  "$scope", 
  "components.registration.service", 
  function($scope, $components_registrationService){

  }
]);