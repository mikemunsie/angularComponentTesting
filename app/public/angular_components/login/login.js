(function(){
  var dependencies = [
    "components_registration",
    "components_auth",
    "ngRoute"
  ];
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') return module.exports = dependencies;
  angular.module("components_login", dependencies);
})();

