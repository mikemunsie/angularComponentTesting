(function(){
  var dependencies = [
    "components_login",
    "layouts_default"
  ];
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') return module.exports = dependencies;
  angular.module("views_dashboard", dependencies);
})();