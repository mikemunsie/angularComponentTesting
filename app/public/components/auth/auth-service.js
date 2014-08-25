angular.module("components.auth")
  .factory("components.auth.service", [
    "$http",
    "components.session.service",
    function($http, sessionService){
      var authService = {};

      authService.getUser = function(){
        return sessionService.getUser();
      };

      authService.authorizeCheck = function(next, $location){
        if(next.authorization){
          if(!authService.isAuthorized()) $location.url("/");
        }
      };

      authService.isAuthorized = function(){
        return sessionService.getUser().sessionId !== null;
      };

      authService.logout = function(){
        sessionService.remove();
      };

      authService.login = function(credentials){
        return $http
          .get('/', credentials)
          .then(function(response){
            sessionService.create(credentials);
          }, function(response){

          });
      };
  
      return authService;
    }
  ]);