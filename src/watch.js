/* eslint-disable no-var */
require("babel-polyfill");
require("babel-register");

var App = require("./App.js").default;
var app = new App();
app.start();
