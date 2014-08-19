'use strict';

angular.module("AngularComponents", [
  "login",
  "registration",
], function($interpolateProvider){
  $interpolateProvider.startSymbol('[[');
  $interpolateProvider.endSymbol(']]');
});