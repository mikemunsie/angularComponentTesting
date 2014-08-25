angular.module("components.session")
.factory("components.session.service", [
  "localStorageService",
  function(localStorageService){

    var user = {
      username: null,
      sessionId: null
    };

    function init(){
      if(localStorageService.get('user')){
        user = localStorageService.get('user');
      }
    }

    this.getUser = function(){
      return user;
    };

    this.create = function(credentials){
      user.sessionId = "someMadeUpSession";
      user.username = credentials.username;
      localStorageService.set("user", user);
    };

    this.remove = function(){
      localStorageService.clearAll();
      user.username = null;
      user.sessionId = null;
    };

    init();
    return this;
  }
]);