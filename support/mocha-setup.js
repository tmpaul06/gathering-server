require("babel-register");

// http://chaijs.com/
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
process.env.NODE_ENV="test";
chai.use(chaiAsPromised);
