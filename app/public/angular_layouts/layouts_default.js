(function(){

var dependencies = [
  "angularTemplates2JS",
  "ngRoute"
];
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') return module.exports = dependencies;

angular.module("layouts_default", dependencies);

})();