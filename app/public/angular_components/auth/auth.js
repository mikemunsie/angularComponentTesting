(function(){
  var dependencies = [
    "components_session"
  ];
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') return module.exports = dependencies;
  angular.module("components_auth", dependencies)
    .constant("AUTH_EVENTS", {
      loginSuccess: 'auth-login-success',
      loginFailed: 'auth-login-failed',
      logoutSuccess: 'auth-logout-success',
      sessionTimeout: 'auth-session-timeout',
      notAuthenticated: 'auth-not-authenticated',
      notAuthorized: 'auth-not-authorized'
    });
})();