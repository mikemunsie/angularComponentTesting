'use strict';

var app = angular.module("Index", [
  "login",
  "registration"
], function($interpolateProvider){
  $interpolateProvider.startSymbol('[[');
  $interpolateProvider.endSymbol(']]');
});