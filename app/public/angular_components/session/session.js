(function(){
  var dependencies = [
    "LocalStorageModule"
  ];
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') return module.exports = dependencies;
  angular.module("components_session", dependencies);
})();

