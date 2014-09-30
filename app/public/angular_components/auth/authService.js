angular.module("components_auth")
  .factory("components_auth_authService",
    function($http, components_session_sessionService){
      var components_auth_authService = {};
      components_auth_authService.getUser = function(){
        return components_session_sessionService.getUser();
      };
      components_auth_authService.authorizeCheck = function(next, $location){
        if(next.authorization){
          if(!components_auth_authService.isAuthorized()) $location.url("/");
        }
      };
      components_auth_authService.isAuthorized = function(){
        return components_session_sessionService.getUser().sessionId !== null;
      };
      components_auth_authService.logout = function(){
        components_session_sessionService.remove();
      };
      components_auth_authService.login = function(credentials){
        return $http
          .get('/', credentials)
          .then(function(response){
            components_session_sessionService.create(credentials);
          }, function(response){

          });
      };
      return components_auth_authService;
    }
  );